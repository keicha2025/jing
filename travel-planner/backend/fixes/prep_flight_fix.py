import requests
import json

GAS_URL = "https://script.google.com/macros/s/AKfycbysH0rv9g64H4j3w9wArrc39DVXQXz1YSXxaVFV3udlQUubEollRRt8-YS5O-CMUgjWdQ/exec"
TRIP_ID = "9e32beef-d01c-4f73-9f06-fe2185854d47"

print("Fetching existing flights...")
resp = requests.get(GAS_URL, params={"action": "getTrip", "trip_id": TRIP_ID})
trip_data = resp.json()
flights = trip_data.get("flights", [])

print(f"Found {len(flights)} flights.")

for f in flights:
    updated = False
    
    # Outbound: SL 0396 - 3/19
    if "SL 0396" in f.get("flight_no", ""):
        # User said 3/19. Year 2025.
        f["dep_time"] = "2025-03-19T09:00:00"
        f["arr_time"] = "2025-03-19T12:30:00"
        f["note"] = "台北桃園 (TPE) → 大阪關西 (KIX)"
        # Assuming baggage default if empty
        if not f.get("baggage_carry_on"): f["baggage_carry_on"] = "7kg"
        if not f.get("baggage_checked"): f["baggage_checked"] = "20kg" 
        updated = True
        
    # Inbound: SL 0399 - 3/25
    if "SL 0399" in f.get("flight_no", ""):
         f["dep_time"] = "2025-03-25T13:40:00"
         f["arr_time"] = "2025-03-25T16:00:00"
         f["note"] = "名古屋 (NGO) → 台北桃園 (TPE)"
         if not f.get("baggage_carry_on"): f["baggage_carry_on"] = "7kg"
         if not f.get("baggage_checked"): f["baggage_checked"] = "20kg"
         updated = True
         
    if updated:
        print(f"Updating flight {f['flight_no']}...")
        payload = {
            "action": "updateFlight",
            "id": f['id'],
            "dep_time": f['dep_time'],
            "arr_time": f['arr_time'],
            "note": f['note'],
            "baggage_carry_on": f.get("baggage_carry_on"),
            "baggage_checked": f.get("baggage_checked")
        }
        r = requests.post(GAS_URL, json=payload)
        print(f"Response: {r.text}")

print("Done.")
