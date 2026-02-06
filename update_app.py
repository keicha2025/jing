import os

# 這是我們要寫入的 Vue 程式碼
vue_content = r"""
<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const trip = ref(null)
const loading = ref(true)
const error = ref(null)

const fetchTrip = async () => {
  try {
    // ⚠️ 注意：這裡稍後可能要改成你的後端公開網址
    // 如果在 Codespaces，通常 localhost 也可以通
    const API_BASE_URL = "http://127.0.0.1:8000"
    
    const response = await axios.get(API_BASE_URL + '/api/template-trip')
    trip.value = response.data
    loading.value = false
  } catch (err) {
    console.error(err)
    error.value = "無法連接後端。請確認後端 Server (Port 8000) 是否正在執行。"
    loading.value = false
  }
}

onMounted(() => {
  fetchTrip()
})
</script>

<template>
  <div v-if="loading" class="loading">
    <div class="spinner"></div>
    <p>正在載入您的旅程...</p>
  </div>
  
  <div v-else-if="error" class="error">
    <p>{{ error }}</p>
    <small>請確認後端 Port 8000 已啟動</small>
  </div>
  
  <div v-else class="container">
    <header class="hero">
      <h1>{{ trip.title }}</h1>
      <p class="intro-text">{{ trip.start_date }} — {{ trip.end_date }}</p>
    </header>

    <div v-for="day in trip.days" :key="day.id" class="day-section">
      <div class="day-header">
        <h2>Day {{ day.day_order }} <span class="jp-text">{{ day.weekday }}</span></h2>
        <span class="day-theme">{{ day.theme }}</span>
        <div class="day-meta">
           <span v-if="day.city">📍 {{ day.city }}</span>
           <span v-if="day.hotel">🏨 {{ day.hotel }}</span>
        </div>
      </div>

      <div v-for="spot in day.spots" :key="spot.id" class="spot-card">
        <div class="spot-header">
          <span class="material-symbols-outlined spot-icon">
            {{ spot.type === 'flight' || spot.type === 'flight_land' ? 'flight' : 
               spot.type === 'hotel' ? 'bed' : 
               spot.type === 'transport' ? 'directions_train' : 'place' }}
          </span>
          <div class="spot-info">
            <h3 class="spot-title">{{ spot.title }}</h3>
            <span v-if="spot.title_jp" class="jp-text">{{ spot.title_jp }}</span>
          </div>
          <span class="spot-time">{{ spot.time }}</span>
        </div>
        <p class="spot-note">{{ spot.note }}</p>
        <a v-if="spot.map_link" :href="spot.map_link" target="_blank" class="map-link">Google Maps</a>
      </div>
    </div>
  </div>
</template>

<style>
:root { --bg-color: #F4F4F0; --card-bg: #FFFFFF; --text-primary: #2D2D2D; --accent-color: #8E403A; }
body { background-color: var(--bg-color); color: var(--text-primary); font-family: 'Noto Sans TC', sans-serif; margin: 0; padding: 20px; }
.loading, .error { height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #666; }
.container { max-width: 600px; margin: 0 auto; }
.hero { text-align: center; margin-bottom: 40px; padding: 40px 0; border-bottom: 1px solid #ddd; }
.day-section { margin-bottom: 50px; }
.day-header { border-left: 3px solid var(--accent-color); padding-left: 15px; margin-bottom: 20px; }
.spot-card { background: var(--card-bg); padding: 20px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.spot-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.spot-icon { color: var(--accent-color); font-size: 1.5rem; }
.spot-info { flex: 1; }
.spot-title { margin: 0; font-size: 1.1rem; font-weight: 500; }
.jp-text { display: block; font-size: 0.8rem; color: #888; }
.spot-time { font-family: monospace; color: #666; font-size: 1rem; }
.spot-note { color: #555; font-size: 0.95rem; margin: 5px 0 0 36px; }
.map-link { display: inline-block; margin: 10px 0 0 36px; font-size: 0.8rem; color: #999; }
</style>
"""

# 寫入檔案
file_path = "src/App.vue"
try:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(vue_content)
    print(f"✅ 成功！已將你的行程程式碼寫入 {file_path}")
except Exception as e:
    print(f"❌ 寫入失敗: {e}")
