import requests
import json
import uuid

# GAS Web App URL
GAS_URL = "https://script.google.com/macros/s/AKfycbysH0rv9g64H4j3w9wArrc39DVXQXz1YSXxaVFV3udlQUubEollRRt8-YS5O-CMUgjWdQ/exec"
TRIP_ID = "9e32beef-d01c-4f73-9f06-fe2185854d47"

accommodations = [
    {
        "id": str(uuid.uuid4()),
        "trip_id": TRIP_ID,
        "name": "Tokyu Stay Osakahonmachi",
        "address": "Osaka", # Simplified address
        "check_in": "03/19",
        "check_out": "03/22",
        "note": "3晚",
        "map_link": ""
    },
    {
        "id": str(uuid.uuid4()),
        "trip_id": TRIP_ID,
        "name": "Via Inn Nagoya Station Tsubakicho",
        "address": "Nagoya", # Simplified address
        "check_in": "03/22",
        "check_out": "03/25",
        "note": "3晚",
        "map_link": ""
    }
]

payload = {
    "action": "importData",
    "payload": {
        "accommodations": accommodations
    }
}

print(f"Sending {len(accommodations)} accommodations...")
try:
    response = requests.post(GAS_URL, json=payload)
    print("Status Code:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
