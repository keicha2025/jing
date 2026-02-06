-- V2 Schema Update

-- 1. 建立住宿資訊表 (Trip Accommodations)
create table public.trip_accommodations (
  id uuid not null default gen_random_uuid (),
  trip_id uuid references public.trips(id) on delete cascade,
  name text not null,
  address text,
  map_link text,
  check_in_date date,
  check_out_date date,
  created_at timestamptz default now(),
  constraint trip_accommodations_pkey primary key (id)
);

-- 2. 建立航班資訊表 (Trip Flights)
create table public.trip_flights (
  id uuid not null default gen_random_uuid (),
  trip_id uuid references public.trips(id) on delete cascade,
  type text check (type in ('departure', 'return', 'intermediate')), -- 去程/回程/中途
  flight_no text,
  airline text,
  dep_airport text, -- 出發機場代號 TPE
  dep_time timestamp, -- 出發時間
  arr_airport text, -- 抵達機場代號 NRT
  arr_time timestamp, -- 抵達時間
  note text,
  created_at timestamptz default now(),
  constraint trip_flights_pkey primary key (id)
);

-- 3. (Optional) 如果需要，可以把舊 spot 中 type='hotel' 或 'flight' 的資料移轉過來
-- 這裡僅提供架構，資料移轉視需求手動執行
