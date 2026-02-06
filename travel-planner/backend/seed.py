import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key or "請填入" in url:
    print("❌ 錯誤：請先開啟 travel-planner/backend/.env 填入你的 Supabase URL 和 Key")
    exit()

supabase = create_client(url, key)

trip_data = {
    "title": "春之京阪奈、名古屋七日",
    "start_date": "2025-03-19",
    "end_date": "2025-03-25",
    "is_template": True,
    "days": [
        {
            "day_order": 1, "date": "2025-03-19", "weekday": "四",
            "theme": "抵達關西、伊藤洋華 天王寺", "city": "大阪",
            "hotel": "東急ステイ 大阪本町",
            "spots": [
                {"time": "09:00", "type": "flight", "title": "TPE 台北桃園", "title_jp": "台北桃園空港", "note": "航班 SL 0396 | 飛行 2h30m", "map_link": ""},
                {"time": "12:30", "type": "flight_land", "title": "KIX 大阪關西", "title_jp": "関西国際空港", "note": "抵達後辦理入境", "map_link": "https://maps.app.goo.gl/example"},
                {"time": "15:00", "type": "spot", "title": "伊藤洋華堂 阿倍野店 (天王寺)", "title_jp": "イトーヨーカドー あべの店", "note": "大型商場購物", "map_link": ""},
                {"time": "18:00", "type": "hotel", "title": "東急ステイ 大阪本町", "title_jp": "東急ステイ 大阪本町", "note": "Check-in (3晚)", "map_link": ""}
            ]
        },
        {
            "day_order": 2, "date": "2025-03-20", "weekday": "五",
            "theme": "梅田 (北區) + 難波 散策", "city": "大阪", "hotel": "東急ステイ 大阪本町",
            "spots": [
                {"time": "10:00", "type": "spot", "title": "梅田區", "title_jp": "梅田", "note": "百貨激戰區、購物", "map_link": ""},
                {"time": "16:00", "type": "spot", "title": "難波 / 心齋橋", "title_jp": "難波 / 心斎橋", "note": "固力果跑跑人、道頓堀美食", "map_link": ""}
            ]
        },
        {
            "day_order": 3, "date": "2025-03-21", "weekday": "六",
            "theme": "奈良公園、東大寺一日遊", "city": "奈良", "hotel": "東急ステイ 大阪本町",
            "spots": [
                {"time": "09:30", "type": "spot", "title": "奈良公園", "title_jp": "奈良公園", "note": "餵鹿、散步", "map_link": ""},
                {"time": "11:00", "type": "spot", "title": "東大寺", "title_jp": "東大寺", "note": "世界遺產大佛", "map_link": ""}
            ]
        },
        {
            "day_order": 4, "date": "2025-03-22", "weekday": "日",
            "theme": "京都移動至名古屋：錦市場、河原町、AEON", "city": "京都/名古屋", "hotel": "Via Inn Nagoya Station Tsubakicho",
            "spots": [
                {"time": "10:00", "type": "spot", "title": "錦市場", "title_jp": "錦市場", "note": "京都的廚房", "map_link": ""},
                {"time": "13:00", "type": "spot", "title": "河原町 / AEON", "title_jp": "河原町", "note": "逛街後前往車站", "map_link": ""},
                {"time": "16:00", "type": "transport", "title": "前往名古屋", "title_jp": "名古屋へ移動", "note": "新幹線或近鐵", "map_link": ""},
                {"time": "18:00", "type": "hotel", "title": "Via Inn 名古屋站前椿町", "title_jp": "ヴィアイン名古屋駅前椿町", "note": "Check-in (3晚)", "map_link": ""}
            ]
        },
        {
            "day_order": 5, "date": "2025-03-23", "weekday": "一",
            "theme": "犬山城下町", "city": "名古屋", "hotel": "Via Inn Nagoya Station Tsubakicho",
            "spots": [
                {"time": "10:00", "type": "spot", "title": "犬山城", "title_jp": "犬山城", "note": "國寶名城、城下町散策", "map_link": ""}
            ]
        },
        {
            "day_order": 6, "date": "2025-03-24", "weekday": "二",
            "theme": "伊勢神宮+內宮", "city": "名古屋", "hotel": "Via Inn Nagoya Station Tsubakicho",
            "spots": [
                {"time": "09:00", "type": "spot", "title": "伊勢神宮 內宮", "title_jp": "伊勢神宮 内宮", "note": "日本人的心靈故鄉", "map_link": ""},
                {"time": "12:00", "type": "spot", "title": "托福橫丁", "title_jp": "おかげ横丁", "note": "午餐、赤福", "map_link": ""}
            ]
        },
        {
            "day_order": 7, "date": "2025-03-25", "weekday": "三",
            "theme": "歸途", "city": "名古屋", "hotel": "",
            "spots": [
                {"time": "11:00", "type": "transport", "title": "前往中部國際機場", "title_jp": "中部国際空港へ", "note": "", "map_link": ""},
                {"time": "13:40", "type": "flight", "title": "NGO 名古屋", "title_jp": "中部国際空港", "note": "航班 SL 0399 | T1 航廈", "map_link": ""},
                {"time": "16:00", "type": "flight_land", "title": "TPE 台北桃園", "title_jp": "台北桃園", "note": "T1 航廈抵達", "map_link": ""}
            ]
        }
    ]
}

def seed_database():
    print("🚀 開始匯入資料...")
    trip_payload = {
        "title": trip_data["title"],
        "start_date": trip_data["start_date"],
        "end_date": trip_data["end_date"],
        "is_template": True
    }
    res_trip = supabase.table("trips").insert(trip_payload).execute()
    trip_id = res_trip.data[0]["id"]
    print(f"✅ 行程建立成功 ID: {trip_id}")

    for day in trip_data["days"]:
        day_payload = {
            "trip_id": trip_id,
            "day_order": day["day_order"],
            "date": day["date"],
            "weekday": day["weekday"],
            "theme": day["theme"],
            "city": day["city"],
            "hotel": day["hotel"]
        }
        res_day = supabase.table("days").insert(day_payload).execute()
        day_id = res_day.data[0]["id"]
        
        spots_payload = []
        for index, spot in enumerate(day["spots"]):
            spot_payload = {
                "day_id": day_id,
                "spot_order": index + 1,
                "time": spot["time"],
                "type": spot["type"],
                "title": spot["title"],
                "title_jp": spot["title_jp"],
                "note": spot["note"],
                "map_link": spot["map_link"]
            }
            spots_payload.append(spot_payload)
        
        if spots_payload:
            supabase.table("spots").insert(spots_payload).execute()
            print(f"  📍 Day {day['day_order']} 景點寫入完成")

    print("\n🎉 全部匯入完成！")

if __name__ == "__main__":
    seed_database()
