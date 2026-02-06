<script setup>
import { ref, onMounted, computed } from 'vue'
import apiClient from './api'
import IntroView from './views/IntroView.vue'
import DayView from './views/DayView.vue'

const user = ref(null)
const usernameInput = ref("")
const passwordInput = ref("")
const loginError = ref("")

const trip = ref(null)
const loading = ref(false)
const error = ref(null)
const tripId = ref(null)
const isSaving = ref(false)
const spotTypes = ref([])

// Modal App State
const showConfirm = ref(false)
const confirmCallback = ref(null)
const confirmMessage = ref("")

const isEditMode = ref(false) 

const getTripIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('trip_id')
}

// --- Auth ---
const handleLogin = async () => {
    if (!usernameInput.value || !passwordInput.value) {
        loginError.value = "請輸入帳號密碼"
        return
    }
    
    loading.value = true
    try {
        const res = await apiClient.post('login', {
            username: usernameInput.value,
            password: passwordInput.value
        })
        
        if (res.status === 'success') {
            user.value = res.user
            // Persist simple session
            localStorage.setItem('tp_user', JSON.stringify(res.user))
            // Load initial data
            fetchSpotTypes() 
            fetchTrip() 
        } else {
            loginError.value = res.error || "登入失敗"
        }
    } catch (err) {
         loginError.value = "登入錯誤: " + err.message
    } finally {
        loading.value = false
    }
}

const handleLogout = () => {
    user.value = null
    localStorage.removeItem('tp_user')
    trip.value = null
    isEditMode.value = false
}

// --- Data Fetching ---
const fetchSpotTypes = async () => {
    try {
        // Try to fetch from backend
        // Use a flag or check if backend supports it. For now assume yes.
        // If 404/error, fallback.
        const res = await apiClient.get('getSpotTypes')
        if (Array.isArray(res)) {
            spotTypes.value = res
        } else {
             // Fallback
             spotTypes.value = [
                { id: '1', code: 'spot', name: '景點', order: 1 },
                { id: '2', code: 'food', name: '美食', order: 2 },
                 { id: '3', code: 'shopping', name: '購物', order: 3 },
                { id: '4', code: 'entertainment', name: '娛樂', order: 4 }
            ]
        }
    } catch (err) {
        console.warn("Fetch types failed, using default", err)
         spotTypes.value = [
            { id: '1', code: 'spot', name: '景點', order: 1 },
            { id: '2', code: 'food', name: '美食', order: 2 },
            { id: '3', code: 'shopping', name: '購物', order: 3 },
            { id: '4', code: 'entertainment', name: '娛樂', order: 4 }
        ]
    }
}

const fetchTrip = async () => {
  loading.value = true
  try {
    const idFromUrl = getTripIdFromUrl()
    
    if (idFromUrl) {
       tripId.value = idFromUrl
       const res = await apiClient.get('getTrip', { trip_id: idFromUrl })
       trip.value = res
    } else {
       // Show list or template? For now, fetch all trips for user
       // Or handle "no trip" state
    }
  } catch (err) {
    console.error(err)
    error.value = "無法載入行程: " + err.message
  } finally {
    loading.value = false
  }
}

// --- State ---
const dayViewRef = ref(null)
const showUnsavedModal = ref(false)
const pendingNavAction = ref(null)
const hasUnsavedChanges = ref(false)

const handleDaySaved = () => {
    fetchTrip() // Refresh data
    hasUnsavedChanges.value = false
}

const checkUnsavedAndNavigate = (nextAction) => {
    // Check Child State
    if (dayViewRef.value && dayViewRef.value.isDayEditing) {
        pendingNavAction.value = nextAction
        showUnsavedModal.value = true
    } else {
        nextAction()
    }
}

const confirmLeave = () => {
    showUnsavedModal.value = false
    if (dayViewRef.value) {
        dayViewRef.value.cancelEdit()
    }
    
    if (pendingNavAction.value) pendingNavAction.value()
    pendingNavAction.value = null
}

const cancelLeave = () => {
    showUnsavedModal.value = false
    pendingNavAction.value = null
}

const navToDay = (dayId) => {
    checkUnsavedAndNavigate(() => setActiveDay(dayId))
}

// Restore session
const formatFlightDate = (isoStr) => {
    if (!isoStr) return ""
    const d = new Date(isoStr)
    const m = d.getMonth() + 1
    const date = d.getDate()
    const dayMap = ['日', '一', '二', '三', '四', '五', '六']
    return `${m}月${date}日 (${dayMap[d.getDay()]})`
}

const formatTime = (isoStr) => {
    if (!isoStr) return ""
    const d = new Date(isoStr)
    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
}

// Helper for Day Date: 3/20 (Fri)
const formatDayDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const m = d.getMonth() + 1
    const date = d.getDate()
    const dayMap = ['日', '一', '二', '三', '四', '五', '六']
    return `${m}/${date} (${dayMap[d.getDay()]})`
}

// Helper for Accommodation Date: 03/19
const formatSimpleDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const date = d.getDate().toString().padStart(2, '0')
    return `${m}/${date}`
}

const activeDayId = ref(null)
const currentDay = computed(() => {
    if (!activeDayId.value || !trip.value) return null
    return trip.value.days.find(d => d.day_id === activeDayId.value)
})

const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

const setActiveDay = (id) => {
    activeDayId.value = id
    scrollToTop()
}

onMounted(() => {
    const saved = localStorage.getItem('tp_user')
    if (saved) {
        user.value = JSON.parse(saved)
        fetchSpotTypes()
        fetchTrip()
    }
})
</script>

<template>
  <div class="app-root">
      
    <!-- Login Mask -->
    <div v-if="!user" class="login-mask">
        <div class="login-card-winter">
            <h2 class="serif" style="margin-bottom:10px;">Travel Planner</h2>
            <p style="text-align:center; margin-bottom:20px;">請輸入通行證</p>
            <input v-model="usernameInput" placeholder="帳號" class="winter-input" />
            <input v-model="passwordInput" type="password" placeholder="密碼" class="winter-input" />
            <button @click="handleLogin" class="btn-winter" :disabled="loading">
                {{ loading ? "登入中..." : "開始旅程" }}
            </button>
            <p v-if="loginError" class="error-msg">{{ loginError }}</p>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main-content" :class="{ blurred: !user }">
        
        <div v-if="loading && !trip" class="loading-screen">
             <div class="spinner"></div>
        </div>

        <div v-else-if="trip">
            
            <!-- INTRO VIEW (Overview) -->
            <IntroView 
                v-if="!activeDayId" 
                :trip="trip" 
            />

            <!-- SINGLE DAY VIEW -->
            <DayView 
                v-else-if="currentDay"
                ref="dayViewRef"
                :day="currentDay"
                :isEditMode="isEditMode"
                :spotTypes="spotTypes"
                @start-edit="(id) => editingDayId = id"
                @save-changes="handleDaySaved"
                @unsaved-change="(val) => hasUnsavedChanges = val"
            />

            <!-- Footer -->
            <footer style="padding-bottom: 120px;">
                <!-- Admin Toggle -->
                <div style="margin-top:20px;">
                    <button @click="isEditMode = !isEditMode" class="btn-text-only">
                        {{ isEditMode ? '結束編輯 (Admin)' : '編輯模式' }}
                    </button>
                    <button @click="handleLogout" class="btn-text-only" style="margin-left:15px;">登出</button>
                </div>
            </footer>
        </div>

        <!-- Custom Modal -->
        <CustomConfirmModal 
            :visible="showUnsavedModal" 
            message="您有未儲存的行程變更，確定要離開嗎？"
            @confirm="confirmLeave"
            @cancel="cancelLeave"
        />
        
         <!-- Bottom Nav -->
        <nav class="bottom-nav" v-if="trip">
            <a href="#" @click.prevent="navToDay(null)" class="nav-item" :class="{ active: activeDayId === null }">
                <span class="material-symbols-outlined">home</span>
                <span class="nav-text">Intro</span>
            </a>
            <a v-for="day in trip.days" 
               :key="day.day_id" 
               href="#" 
               @click.prevent="navToDay(day.day_id)" 
               class="nav-item"
               :class="{ active: activeDayId === day.day_id }"
            >
                <span class="material-symbols-outlined">looks_{{ day.day_order <= 6 ? ['one','two','3','4','5','6'][day.day_order-1] : 'one' }}</span>
                <span class="nav-text">Day {{ day.day_order }}</span>
            </a>
        </nav>

    </div>
  </div>
</template>

<style>
/* Winter in the South style */
:root {
    /* MUJI Palette */
    --bg-color: #F4F4F0;       /* 整體背景：米白 */
    --card-bg: #FFFFFF;        /* 卡片背景：純白 */
    --text-primary: #2D2D2D;   /* 深灰黑 */
    --text-secondary: #666666; /* 中灰 */
    --accent-color: #8E403A;   /* 赭紅（重點色） */
    --nav-bg: rgba(255, 255, 255, 0.95);
    --border-color: #E5E5E5;
}

html {
    scroll-behavior: smooth;
}

* {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

body {
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: 'Noto Sans TC', 'Noto Sans JP', sans-serif;
    line-height: 1.75;
    font-weight: 300;
    padding-bottom: 80px;
    margin: 0;
}

/* Typography */
h1, h2, h3, .serif {
    font-family: 'Noto Serif TC', 'Noto Serif JP', serif;
    letter-spacing: 0.05em;
    color: var(--text-primary);
}

.jp-text {
    font-family: 'Noto Serif JP', serif;
    font-size: 0.8em;
    display: block;
    margin-top: 4px;
    color: var(--text-secondary);
    font-weight: 400;
    opacity: 0.8;
}

p {
    margin-bottom: 0;
    color: var(--text-secondary);
    text-align: justify;
    font-size: 0.95rem;
}

/* Layout */
.container {
    max-width: 600px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Hero Section */
header.hero {
    padding: 80px 20px 60px;
    text-align: center;
    background-color: var(--bg-color);
    border-bottom: 1px solid rgba(0,0,0,0.05);
}

header.hero h1 {
    font-size: 2rem;
    margin-bottom: 24px;
    line-height: 1.4;
}

header.hero .intro-text {
    font-size: 0.9rem;
    max-width: 320px;
    margin: 0 auto;
    position: relative;
    white-space: pre-wrap;
}

header.hero .intro-text::before {
    content: '';
    display: block;
    width: 30px;
    height: 1px;
    background: var(--text-secondary);
    margin: 0 auto 20px;
}

/* Info Grid */
.info-bar {
    background-color: var(--card-bg);
    padding: 30px 20px;
    margin: 20px 0 30px;
    border-radius: 2px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

.info-item {
    display: flex;
    align-items: flex-start;
    gap: 15px;
}

.info-icon {
    color: var(--accent-color);
    background: rgba(142, 64, 58, 0.1);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.info-content h4 {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 2px;
    font-weight: 400;
}

.hotel-link {
    text-decoration: none;
    color: inherit;
    display: block;
    transition: opacity 0.3s;
}
.hotel-link:hover {
    opacity: 0.6;
}
.hotel-addr {
    font-size: 0.75rem;
    color: #aaa;
    display: block;
    margin-top: 2px;
    line-height: 1.3;
}

.info-content p {
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 500;
}

/* Flight Card */
.flight-section { margin-bottom: 50px; }
.flight-card {
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 15px;
    padding: 20px;
    position: relative;
    overflow: hidden;
}
.flight-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background-color: var(--accent-color);
    opacity: 0.7;
}

.flight-header {
    display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed var(--border-color);
}
.flight-no { font-weight: 700; color: var(--accent-color); font-size: 1.1rem; }

.flight-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.flight-port { flex: 1; }
.port-time { font-size: 1.5rem; font-weight: 500; color: var(--text-primary); line-height: 1; }
.port-name { font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px; }
.port-terminal { font-size: 0.75rem; background-color: #f0f0f0; padding: 2px 6px; border-radius: 4px; margin-left: 5px; }

.flight-duration {
    flex: 0 0 80px; text-align: center; font-size: 0.75rem; color: var(--text-secondary); position: relative; top: -5px;
}
.flight-arrow { display: block; font-size: 1.2rem; color: #ddd; margin-bottom: -5px; }

.flight-footer {
    background-color: #FAFAFA; margin: 0 -20px -20px -20px; padding: 10px 20px; font-size: 0.8rem; color: var(--text-secondary); display: flex; gap: 15px; align-items: center;
}
.baggage-tag { display: flex; align-items: center; gap: 5px; }
.baggage-grey { color: #999; }

/* Day Header specific design */
.day-header-block {
    margin: 40px 0 30px;
    padding-left: 15px;
    border-left: 4px solid var(--accent-color);
}
.day-header-block h2 {
    font-size: 1.6rem;
    line-height: 1.2;
    margin: 0;
}
.day-num {
    color: var(--text-primary);
    font-weight: 700;
    margin-right: 12px;
}
.day-date {
    color: #999; /* Light grey */
    font-weight: 300;
    font-size: 1.2rem;
}

.view-day {
    padding-top: 20px;
    min-height: 80vh;
}

.btn-text-only {
    background: none; border: none; color: #999; cursor: pointer; font-size: 0.8rem;
}
.btn-text-only:hover { color: var(--accent-color); }

/* Accommodation */
.accommodation-section { margin-bottom: 50px; }
.acc-grid { display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.acc-card {
    background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 15px; display: flex; gap: 15px; align-items: flex-start;
}
.acc-icon {
    width: 36px; height: 36px; background: #fdfdfd; border-radius: 50%; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; color: var(--accent-color); flex-shrink: 0;
}
.acc-content h4 { margin: 0 0 5px; font-size: 1rem; }
.acc-content h4 a { text-decoration: none; color: var(--text-primary); }
.acc-detail { display: flex; align-items: center; gap: 5px; font-size: 0.85rem; color: var(--text-secondary); margin-top: 3px; }
.icon-sm { font-size: 1rem; }

/* List Transitions */
.list-move-move,
.list-move-enter-active,
.list-move-leave-active {
  transition: all 0.4s ease;
}
.list-move-enter-from,
.list-move-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.list-move-leave-active {
  position: absolute; width: 100%;
}

/* Edit Mode Actions */
.btn-icon {
    background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 5px;
}
.btn-icon:hover { color: var(--accent-color); }

.edit-actions-panel {
    margin-top: 30px;
    border-top: 1px dashed var(--border-color);
    padding-top: 20px;
}
.save-actions {
    margin-top: 20px; text-align: center;
}
.btn-save {
    background: var(--accent-color); color: #fff; border: none; padding: 12px 40px; border-radius: 4px; font-size: 1rem; cursor: pointer;
    box-shadow: 0 4px 10px rgba(142, 64, 58, 0.3);
}
.btn-save:hover { background: #7a3530; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
footer { text-align: center; padding: 40px 20px 100px; font-size: 0.85rem; color: var(--text-secondary); }

/* Bottom Nav */
.bottom-nav {
    position: fixed; bottom: 0; left: 0; width: 100%;
    background-color: var(--nav-bg); backdrop-filter: blur(10px);
    border-top: 1px solid var(--border-color);
    display: flex; justify-content: space-around;
    padding: 10px 0 15px; z-index: 1000;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
}
.nav-item {
    text-decoration: none; color: var(--text-secondary); text-align: center; font-size: 0.7rem;
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.nav-item.active { color: var(--accent-color); }
.nav-item span.material-symbols-outlined { font-size: 1.4rem; }
.nav-text { font-weight: 500; }

/* Login Mask */
.login-mask {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(244, 244, 240, 0.85);
    backdrop-filter: blur(5px);
    z-index: 9999;
    display: flex; align-items: center; justify-content: center;
}
.login-card-winter {
    background: #fff; padding: 40px; width: 80%; max-width: 320px;
    border-radius: 2px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    text-align: center;
    border: 1px solid #E5E5E5;
}
.winter-input {
    width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd;
    background: #FAFAFA; font-family: 'Noto Sans TC';
}
.btn-winter {
    background: var(--accent-color); color: #fff; padding: 12px 30px; border: none; font-size: 1rem; cursor: pointer;
}
.blurred {
    filter: blur(5px); pointer-events: none;
}
</style>
