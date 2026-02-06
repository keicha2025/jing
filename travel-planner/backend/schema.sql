-- 1. 建立 spot_types 表格
create table public.spot_types (
  id uuid not null default gen_random_uuid (),
  code text not null,
  name text not null,
  default_icon text not null,
  constraint spot_types_pkey primary key (id),
  constraint spot_types_code_key unique (code)
);

-- 2. 插入預設資料
insert into public.spot_types (code, name, default_icon) values
  ('flight', '航班', 'flight'),
  ('flight_land', '降落', 'flight_land'),
  ('hotel', '住宿', 'bed'),
  ('transport', '交通', 'directions_train'),
  ('spot', '景點', 'location_on'),
  ('food', '美食', 'restaurant'),
  ('shopping', '購物', 'shopping_cart'),
  ('activity', '活動', 'local_activity');

-- 3. 修改 spots 表格
-- 新增 type_id (連結到 spot_types) 和 icon_override (自訂圖示)
alter table public.spots 
add column type_id uuid references public.spot_types(id),
add column icon_override text;

-- 4. (選用) 資料遷移：嘗試將舊的 type 文字欄位轉換對應到新的 type_id
-- 這邊假設你的 spots 表格原本有 type 欄位 (text)
-- 如果執行失敗 (例如找不到 type_id)，不用擔心，後端 Python 程式碼會處理 fallback


-- 5. 確保刪除 Trip 時會連帶刪除 Days 和 Spots (若尚未設定)
-- 注意：這通常需要在 create table 時設定，若要修改現有 constraint 比較麻煩，這裡先略過，僅建議未來建表時加上 on delete cascade。
