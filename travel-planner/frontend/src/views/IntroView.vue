<script setup>
import { computed } from 'vue'

const props = defineProps({
  trip: Object
})

// Helper for Accommodation Date: 03/19
const formatSimpleDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const date = d.getDate().toString().padStart(2, '0')
    return `${m}/${date}`
}

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
</script>

<template>
    <div class="view-intro">
        <header class="hero">
            <div class="container">
                <h1>{{ trip.title }}</h1>
            </div>
        </header>

        <div class="container">
            <div class="info-bar">
                <div class="info-item">
                    <div class="info-icon"><span class="material-symbols-outlined">calendar_month</span></div>
                    <div class="info-content">
                        <h4>日程</h4>
                        <p>{{ trip.start_date ? formatFlightDate(trip.start_date) : 'TBD' }} — {{ trip.end_date ? formatFlightDate(trip.end_date) : 'TBD' }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Accommodation Section -->
        <section v-if="trip.accommodations && trip.accommodations.length" class="container accommodation-section">
                <div class="section-header">
                <h3 class="serif">住宿資訊 <span class="jp-text" style="display:inline;">宿泊情報</span></h3>
            </div>
            
            <div class="acc-grid">
                <div v-for="acc in trip.accommodations" :key="acc.id" class="acc-card">
                    <div class="acc-icon">
                        <span class="material-symbols-outlined">hotel</span>
                    </div>
                    <div class="acc-content">
                        <h4>
                            <a :href="acc.map_link || '#'" target="_blank">{{ acc.name }}</a>
                        </h4>
                        <div class="acc-detail">
                            <span class="material-symbols-outlined icon-sm">location_on</span>
                            <span>{{ acc.address || acc.note }}</span>
                        </div>
                        <div class="acc-detail" v-if="acc.check_in">
                            <span class="material-symbols-outlined icon-sm">schedule</span>
                            <span>入住：{{ formatSimpleDate(acc.check_in) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section v-if="trip.flights && trip.flights.length" class="container flight-section">
            <div class="section-header">
                <h3 class="serif">航班詳情 <span class="jp-text" style="display:inline;">フライト情報</span></h3>
            </div>
            
            <div v-for="flight in trip.flights" :key="flight.id" class="flight-card">
                <div class="flight-header">
                    <div>
                        <span class="flight-no">{{ flight.airline }} {{ flight.flight_no }}</span>
                        <span style="font-size:0.8rem; margin-left:10px; color:#666;">
                            {{ formatFlightDate(flight.dep_time) }}
                        </span>
                    </div>
                </div>
                <div class="flight-body">
                    <div class="flight-port" style="text-align: left;">
                        <div class="port-time">{{ formatTime(flight.dep_time) }}</div>
                        <div class="port-name">{{ flight.dep_airport }} <span class="port-terminal">T1</span></div>
                    </div>
                    <div class="flight-duration">
                        <span class="flight-arrow">------</span>
                        {{ flight.duration }}
                    </div>
                    <div class="flight-port" style="text-align: right;">
                        <div class="port-time">{{ formatTime(flight.arr_time) }}</div>
                        <div class="port-name">{{ flight.arr_airport }} <span class="port-terminal">T1</span></div>
                    </div>
                </div>
                <div class="flight-footer">
                    <div class="baggage-tag">
                        <span class="material-symbols-outlined" style="font-size:1rem;">luggage</span>
                        {{ flight.baggage_carry_on || '隨身 7kg' }}
                    </div>
                    <div class="baggage-tag baggage-grey">
                        <span class="material-symbols-outlined" style="font-size:1rem;">cases</span>
                        {{ flight.baggage_checked || '無託運' }}
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
