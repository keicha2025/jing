<script setup>
// Props 只要接收基本的資料，顯示邏輯在內部處理
// 目前 Spot 資料結構為 generic，這裡假設 spot.note 裡可能包含航班細節，或者將來擴充
defineProps({
  spot: Object
})
</script>

<template>
  <div class="flight-card">
      <div class="flight-header">
          <div>
              <!-- 若 title 是 "TPE 台北桃園"，我們可以把代碼切出來 -->
              <span class="flight-no">{{ spot.title.split(' ')[0] }}</span>
              <!-- <span style="font-size:0.8rem; margin-left:10px; color:#666;">1月18日 (日)</span> -->
          </div>
      </div>
      <div class="flight-body">
          <div class="flight-port" style="text-align: left;">
              <div class="port-time">{{ spot.time }}</div>
              <!-- 簡單 parse title: "TPE 台北桃園" -> TPE / 台北桃園 -->
              <div class="port-name">{{ spot.title.split(' ')[1] || spot.title }}</div>
          </div>
          <div class="flight-duration">
              <span class="flight-arrow">------</span>
              <!-- 飛行時間目前沒欄位，暫時留空或寫死 -->
              <span class="duration-text">Flight</span> 
          </div>
          <!-- 降落資訊目前可能在另一個 spot (type=flight_land)，這裡僅做示意，或者需要將 flight/flight_land 合併顯示 -->
          <!-- 暫時顯示 Destination 如果有的話 -->
          <div class="flight-port" style="text-align: right;">
               <!-- 這裡留給未來的 Arrival Info -->
          </div>
      </div>
      <div class="flight-footer">
          <div class="baggage-tag">
              <span class="material-symbols-outlined" style="font-size:1rem;">luggage</span>
              {{ spot.note || 'No Info' }}
          </div>
      </div>
  </div>
</template>

<style scoped>
.flight-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-left: 5px solid #8E403A;
}
.flight-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  border-bottom: 1px dashed #eee;
  padding-bottom: 10px;
}
.flight-no {
  font-weight: bold;
  font-size: 1.1rem;
  color: #333;
}
.flight-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.port-time {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2D2D2D;
}
.port-name {
  color: #666;
  font-size: 0.9rem;
}
.flight-duration {
  color: #ccc;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.flight-footer {
  display: flex;
  gap: 10px;
}
.baggage-tag {
  background: #f4f4f0;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #555;
}
</style>
