from pydantic import BaseModel
from typing import List, Optional

class SpotTypeSchema(BaseModel):
    id: str
    code: str
    name: str
    default_icon: str

class SpotBase(BaseModel):
    time: str
    type: str  # deprecated
    title: str
    title_jp: Optional[str] = None
    note: Optional[str] = None
    map_link: Optional[str] = None
    icon_override: Optional[str] = None

class SpotSchema(SpotBase):
    id: str
    day_id: str
    spot_order: int
    type_id: Optional[str] = None
    spot_type: Optional[SpotTypeSchema] = None

class SpotUpdate(BaseModel):
    time: Optional[str] = None
    title: Optional[str] = None
    title_jp: Optional[str] = None
    note: Optional[str] = None
    map_link: Optional[str] = None
    type_id: Optional[str] = None
    icon_override: Optional[str] = None

class SpotCreate(SpotBase):
    day_id: str
    spot_order: int
    type_id: Optional[str] = None

class TripAccommodationSchema(BaseModel):
    id: str
    trip_id: str
    name: str
    address: Optional[str] = None
    map_link: Optional[str] = None
    check_in_date: Optional[str] = None
    check_out_date: Optional[str] = None

class TripFlightSchema(BaseModel):
    id: str
    trip_id: str
    type: Optional[str] = None
    flight_no: Optional[str] = None
    airline: Optional[str] = None
    dep_airport: Optional[str] = None
    dep_time: Optional[str] = None
    arr_airport: Optional[str] = None
    arr_time: Optional[str] = None
    note: Optional[str] = None

class DayBase(BaseModel):
    day_order: int
    date: str
    weekday: str
    theme: Optional[str] = None
    city: Optional[str] = None
    hotel: Optional[str] = None

class DaySchema(DayBase):
    id: str
    trip_id: str
    spots: List[SpotSchema] = []

class TripBase(BaseModel):
    title: str
    start_date: str
    end_date: str
    is_template: bool = False

class TripSchema(TripBase):
    id: str
    days: List[DaySchema] = []
    accommodations: List[TripAccommodationSchema] = [] # NEW
    flights: List[TripFlightSchema] = [] # NEW

class TripUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class SmartFetchRequest(BaseModel):
    url: str
