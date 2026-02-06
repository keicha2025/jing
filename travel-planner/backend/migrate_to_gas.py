import os
import json
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase Setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_all_data():
    print("Fetching data from Supabase...")
    
    # 1. Trips
    trips = supabase.table("trips").select("*").execute().data
    
    # 2. Days
    days = supabase.table("days").select("*").execute().data
    
    # 3. Spots
    spots = supabase.table("spots").select("*").execute().data
    
    # 4. Accommodations (V2)
    try:
        accommodations = supabase.table("trip_accommodations").select("*").execute().data
    except:
        accommodations = []
        print("Warning: trip_accommodations table not found or empty.")

    # 5. Flights (V2)
    try:
        flights = supabase.table("trip_flights").select("*").execute().data
    except:
        flights = []
        print("Warning: trip_flights table not found or empty.")

    # 6. Users (Mock or Fetch)
    # Since we don't have a users table in Supabase (maybe in auth?), we create a default user for imported trips.
    # We will assign all imported trips to the user created in this script or a default one.
    users = [] 
    
    return {
        "trips": trips,
        "days": days,
        "spots": spots,
        "accommodations": accommodations,
        "flights": flights
    }

def transform_data(data, target_user_id):
    """
    Transform Supabase data to match GAS Schema.
    """
    print("Transforming data...")
    
    payload = {
        "trips": [],
        "days": [],
        "spots": [],
        "accommodations": [],
        "flights": [],
        "users": [] # We assume user is already created in GAS or we send one here
    }
    
    # Transform Trips
    for t in data["trips"]:
        payload["trips"].append({
            "trip_id": t["id"],
            "owner_id": target_user_id, # Assign to the main user
            "title": t["title"],
            "start_date": t["start_date"],
            "end_date": t["end_date"],
            "is_template": t.get("is_template", False),
            "created_at": t["created_at"],
            "updated_at": t.get("updated_at", "")
        })
        
    # Transform Days
    for d in data["days"]:
        payload["days"].append({
            "day_id": d["id"],
            "trip_id": d["trip_id"],
            "date": d["date"],
            "day_order": d["day_order"],
            "weekday": d["weekday"],
            "city": d.get("city", ""),
            "hotel": d.get("hotel", "")
        })
        
    # Transform Spots
    for s in data["spots"]:
        # Handle 'type' field which might be deprecated or overridden
        # In GAS, we just use string type.
        spot_type = s.get("type", "spot")
        # If type_id exists, we might want to map it, but for now specific string is fine if UI handles it.
        
        payload["spots"].append({
            "spot_id": s["id"],
            "day_id": s["day_id"],
            "spot_order": s["spot_order"],
            "time": s["time"],
            "type": spot_type,
            "title": s["title"],
            "note": s.get("note", ""),
            "map_link": s.get("map_link", ""),
            "created_at": s.get("created_at", "")
        })
        
    # Transform Accommodations
    for a in data["accommodations"]:
        payload["accommodations"].append({
            "id": a["id"],
            "trip_id": a["trip_id"],
            "name": a["name"],
            "address": a.get("address", ""),
            "map_link": a.get("map_link", ""),
            "check_in": a.get("check_in_date", ""),
            "check_out": a.get("check_out_date", ""),
            "note": "" # New schema has note, old might not
        })
        
    # Transform Flights
    for f in data["flights"]:
        payload["flights"].append({
            "id": f["id"],
            "trip_id": f["trip_id"],
            "type": f.get("type", "dep"),
            "flight_no": f.get("flight_no", ""),
            "airline": f.get("airline", ""),
            "dep_airport": f.get("dep_airport", ""),
            "dep_time": f.get("dep_time", ""),
            "arr_airport": f.get("arr_airport", ""),
            "arr_time": f.get("arr_time", ""),
            "duration": "", # Calc if needed
            "baggage_carry_on": "", # Default empty
            "baggage_checked": "",  # Default empty
            "note": f.get("note", "")
        })

    print(f"Prepared {len(payload['trips'])} trips, {len(payload['spots'])} spots.")
    return payload

def main():
    print("--- Travel Planner Supabase -> GAS Migration ---")
    gas_url = input("Enter your GAS Web App URL: ").strip()
    if not gas_url:
        print("URL required.")
        return

    # 1. Fetch
    raw_data = fetch_all_data()
    
    # 2. Ask for user ID to assign trips to
    target_user_id = input("Enter the target User UUID (from GAS 'Users' sheet, or press Enter to generate one): ").strip()
    if not target_user_id:
        import uuid
        target_user_id = str(uuid.uuid4())
        print(f"Generated new User ID: {target_user_id}")
        create_user = input("Do you want to create this user in GAS? (y/n): ").lower() == 'y'
        if create_user:
             username = input("Username: ")
             password = input("Password: ")
             # We will add this user to payload
             # Wait, importData endpoint appends.
             pass 

    # 3. Transform
    final_payload = transform_data(raw_data, target_user_id)
    
    # Add user if needed
    if not raw_data.get("users") and 'username' in locals():
         final_payload["users"].append({
             "user_id": target_user_id,
             "username": username,
             "password": password,
             "role": "admin",
             "display_name": username,
             "created_at": "2025-01-01T00:00:00Z"
         })

    # 4. Send
    print("Sending data to GAS...")
    try:
        # GAS doPost expects specific structure or JSON body
        # Our Code.gs handles JSON body if e.postData.contents is set.
        # Python requests.post(json=...) does exactly that.
        
        # Action is 'importData'
        body = {
            "action": "importData",
            "payload": final_payload
        }
        
        resp = requests.post(gas_url, json=body, allow_redirects=True)
        
        print(f"Response Status: {resp.status_code}")
        print(f"Response Body: {resp.text}")
        
    except Exception as e:
        print(f"Error sending request: {e}")

if __name__ == "__main__":
    main()
