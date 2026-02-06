from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
from pydantic import BaseModel
from typing import List, Optional
import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from models import (
    TripUpdate, SpotUpdate, SpotCreate, SpotSchema, SpotTypeSchema,
    TripAccommodationSchema, TripFlightSchema, SmartFetchRequest
)

load_dotenv()

app = FastAPI()

# 允許前端跨網域存取
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key or "請填入" in url:
    print("❌ 警告：請先設定 .env 檔案中的 Supabase 資訊！")
    supabase = None
else:
    supabase: Client = create_client(url, key)

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

# Smart Fetch API
@app.post("/api/smart-fetch")
def smart_fetch(request: SmartFetchRequest):
    target_url = request.url
    try:
        # Basic scraping
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(target_url, headers=headers, timeout=5)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        title = soup.title.string if soup.title else ""
        # Clean up Google Maps title
        if "Google Maps" in title:
            title = title.replace("- Google Maps", "").strip()
        
        # Try to find address or description
        description = ""
        meta_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
        if meta_desc:
            description = meta_desc.get("content", "")

        return {
            "title": title,
            "note": description,
            "map_link": target_url
        }
    except Exception as e:
        print(f"Fetch failed: {e}")
        # Fallback
        return {
            "title": "New Spot",
            "note": "",
            "map_link": target_url
        }

def get_trip_data(trip_id: str):
    # 1. 抓取行程
    trip_res = supabase.table("trips").select("*").eq("id", trip_id).execute()
    if not trip_res.data:
        return None
    
    trip = trip_res.data[0]
    
    # 2. 抓取 Accommodations
    acc_res = supabase.table("trip_accommodations").select("*").eq("trip_id", trip_id).execute()
    trip["accommodations"] = acc_res.data

    # 3. 抓取 Flights
    flight_res = supabase.table("trip_flights").select("*").eq("trip_id", trip_id).execute()
    trip["flights"] = flight_res.data

    # 4. 抓取 Days
    days_res = supabase.table("days").select("*").eq("trip_id", trip["id"]).order("day_order").execute()
    trip["days"] = days_res.data
    
    # 5. 抓取 Spots (並包含 Type 資訊)
    for day in trip["days"]:
        # 注意：Supabase Python client 的 join 查詢語法比較特殊，這裡用分開查詢或直接看 library 支援
        # 簡單作法：先抓 spots，再把 type_id 對應回去 (如果資料量不大)
        spots_res = supabase.table("spots").select("*, spot_types(*)").eq("day_id", day["id"]).order("spot_order").execute()
        # 轉換資料結構以符合 Pydantic (spot_types -> spot_type)
        spots_data = []
        for s in spots_res.data:
             # Supabase 回傳 join 資料會放在 spot_types 欄位 (list or dict depending on relation)
             if "spot_types" in s and s["spot_types"]:
                 s["spot_type"] = s["spot_types"]
             spots_data.append(s)

        day["spots"] = spots_data
        
    return trip

@app.get("/api/spot-types")
def get_spot_types():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    res = supabase.table("spot_types").select("*").execute()
    return res.data

@app.get("/api/template-trip")
def get_template_trip():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    trip_res = supabase.table("trips").select("*").eq("is_template", True).execute()
    if not trip_res.data:
        raise HTTPException(status_code=404, detail="No template trip found")
    
    # 重用 get_trip_data 邏輯
    return get_trip_data(trip_res.data[0]["id"])

@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    trip = get_trip_data(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@app.post("/api/trips/{trip_id}/clone")
def clone_trip(trip_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # 1. 取得原始行程資料 (包含巢狀結構)
    original_trip = get_trip_data(trip_id)
    if not original_trip:
        raise HTTPException(status_code=404, detail="Original trip not found")
        
    # 2. 建立新 Trip (is_template = False)
    new_trip_payload = {
        "title": f"複製: {original_trip['title']}",
        "start_date": original_trip["start_date"],
        "end_date": original_trip["end_date"],
        "is_template": False
    }
    res_trip = supabase.table("trips").insert(new_trip_payload).execute()
    new_trip_id = res_trip.data[0]["id"]

    # 3. 複製 Accommodations
    if original_trip.get("accommodations"):
        acc_payload = []
        for acc in original_trip["accommodations"]:
            new_acc = acc.copy()
            new_acc.pop("id", None)
            new_acc["trip_id"] = new_trip_id
            new_acc.pop("created_at", None)
            acc_payload.append(new_acc)
        if acc_payload:
            supabase.table("trip_accommodations").insert(acc_payload).execute()

    # 4. 複製 Flights
    if original_trip.get("flights"):
        flight_payload = []
        for flight in original_trip["flights"]:
            new_flight = flight.copy()
            new_flight.pop("id", None)
            new_flight["trip_id"] = new_trip_id
            new_flight.pop("created_at", None)
            flight_payload.append(new_flight)
        if flight_payload:
            supabase.table("trip_flights").insert(flight_payload).execute()
    
    # 5. 複製 Days 和 Spots
    for day in original_trip["days"]:
        # 複製 Day
        day_payload = {
            "trip_id": new_trip_id,
            "day_order": day["day_order"],
            "date": day["date"],
            "weekday": day["weekday"],
            "theme": day["theme"],
            "city": day["city"],
            "hotel": day["hotel"]
        }
        res_day = supabase.table("days").insert(day_payload).execute()
        new_day_id = res_day.data[0]["id"]
        
        # 複製 Spots
        if day.get("spots"):
            spots_payload = []
            for spot in day["spots"]:
                spot_payload = {
                    "day_id": new_day_id,
                    "spot_order": spot["spot_order"],
                    "time": spot["time"],
                    "type": spot.get("type"), # Backward compat
                    "type_id": spot.get("type_id"), # NEW
                    "title": spot["title"],
                    "title_jp": spot["title_jp"],
                    "note": spot["note"],
                    "map_link": spot["map_link"],
                    "icon_override": spot.get("icon_override") # NEW
                }
                spots_payload.append(spot_payload)
            
            supabase.table("spots").insert(spots_payload).execute()
            
    return {"id": new_trip_id, "message": "Trip cloned successfully"}

@app.patch("/api/trips/{trip_id}")
def update_trip(trip_id: str, trip: TripUpdate):
    payload = {k: v for k, v in trip.dict().items() if v is not None}
    if not payload:
        return {"message": "Nothing to update"}
        
    res = supabase.table("trips").update(payload).eq("id", trip_id).execute()
    return res.data

@app.patch("/api/spots/{spot_id}")
def update_spot(spot_id: str, spot: SpotUpdate):
    payload = {k: v for k, v in spot.dict().items() if v is not None}
    if not payload:
        return {"message": "Nothing to update"}
        
    res = supabase.table("spots").update(payload).eq("id", spot_id).execute()
    return res.data

@app.post("/api/days/{day_id}/spots")
def create_spot(day_id: str, spot: SpotCreate):
    try:
        spot_payload = spot.dict(exclude_unset=True)
        spot_payload["day_id"] = day_id 
        
        # If type_id is None, remove it so DB uses default or null
        if "type_id" in spot_payload and spot_payload["type_id"] is None:
            del spot_payload["type_id"]
            
        print(f"Creating spot with payload: {spot_payload}")
        res = supabase.table("spots").insert(spot_payload).execute()
        return res.data[0]
    except Exception as e:
        print(f"Error creating spot: {e}")
        raise HTTPException(status_code=422, detail=str(e))

@app.delete("/api/spots/{spot_id}")
def delete_spot(spot_id: str):
    res = supabase.table("spots").delete().eq("id", spot_id).execute()
    return {"message": "Spot deleted"}

# --- Accommodation CRUD ---

# --- Accommodation CRUD ---
@app.post("/api/trips/{trip_id}/accommodations")
def create_accommodation(trip_id: str, acc: TripAccommodationSchema):
    payload = acc.dict(exclude={"id"})
    payload["trip_id"] = trip_id
    res = supabase.table("trip_accommodations").insert(payload).execute()
    return res.data[0]

@app.patch("/api/accommodations/{acc_id}")
def update_accommodation(acc_id: str, acc: TripAccommodationSchema):
    payload = acc.dict(exclude={"id", "trip_id"}, exclude_unset=True) # exclude props not sent? No, pydantic sends None. Need partial update logic similar to others
    # Since schema has all fields, we filter nones manually or use a specific UpdateSchema. 
    # For now, let's just filter Nones from this schema (hacky but works if schema creates Nones)
    clean_payload = {k: v for k, v in payload.items() if v is not None}
    if not clean_payload:
         return {"message": "Nothing"}
    res = supabase.table("trip_accommodations").update(clean_payload).eq("id", acc_id).execute()
    return res.data

# --- Flight CRUD ---
@app.post("/api/trips/{trip_id}/flights")
def create_flight(trip_id: str, flight: TripFlightSchema):
    payload = flight.dict(exclude={"id"})
    payload["trip_id"] = trip_id
    res = supabase.table("trip_flights").insert(payload).execute()
    return res.data[0]
