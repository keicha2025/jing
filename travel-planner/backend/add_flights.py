import requests
import uuid

GAS_URL = "https://script.google.com/macros/s/AKfycbysH0rv9g64H4j3w9wArrc39DVXQXz1YSXxaVFV3udlQUubEollRRt8-YS5O-CMUgjWdQ/exec"
TRIP_ID = "9e32beef-d01c-4f73-9f06-fe2185854d47"

flights = [
    {
        "id": str(uuid.uuid4()),
        "trip_id": TRIP_ID,
        "type": "dep",
        "airline": "THAI LION",
        "flight_no": "SL 0396",
        "dep_airport": "TPE",
        "dep_time": "09:00",
        "arr_airport": "KIX",
        "arr_time": "12:30",
        "duration": "2h 30m",
        "baggage_carry_on": "",
        "baggage_checked": "",
        "note": "台北桃園 (TPE) → 大阪關西 (KIX)"
    },
    {
        "id": str(uuid.uuid4()),
        "trip_id": TRIP_ID,
        "type": "arr",
        "airline": "THAI LION",
        "flight_no": "SL 0399",
        "dep_airport": "NGO",
        "dep_time": "13:40",
        "arr_airport": "TPE",
        "arr_time": "16:00",
        "duration": "3h 20m",
        "baggage_carry_on": "",
        "baggage_checked": "",
        "note": "名古屋 (NGO) → 台北桃園 (TPE) (T1 航廈)"
    }
]

payload = {
    "action": "importData",
    "payload": {
        "flights": flights
    }
}

print("Sending flights...")
resp = requests.post(GAS_URL, json=payload, allow_redirects=True)
print(resp.text)
