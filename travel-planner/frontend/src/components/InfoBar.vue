<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  trip: {
    type: Object,
    default: () => ({})
  },
  isEditMode: Boolean
})

const emit = defineEmits(['update-trip'])

// Local state for dates
const localStartDate = ref(props.trip?.start_date || '')
const localEndDate = ref(props.trip?.end_date || '')

// Watch props
watch(() => props.trip, (newVal) => {
    if (newVal) {
        localStartDate.value = newVal.start_date
        localEndDate.value = newVal.end_date
    }
}, { deep: true })

const handleDateChange = () => {
    emit('update-trip', {
        start_date: localStartDate.value,
        end_date: localEndDate.value
    })
}

// Accommodation Helper
const accommodations = computed(() => {
    return props.trip?.accommodations || []
})
</script>

<template>
  <div class="info-bar-container">
      <!-- 1. Date Section -->
      <div class="info-card date-card">
           <div class="info-icon"><span class="material-symbols-outlined">calendar_month</span></div>
           <div class="info-content">
               <h4>旅程日期</h4>
               <div v-if="isEditMode" class="date-inputs">
                   <input type="date" v-model.lazy="localStartDate" @change="handleDateChange" />
                   <span>to</span>
                   <input type="date" v-model.lazy="localEndDate" @change="handleDateChange" />
               </div>
               <p v-else>{{ trip.start_date }} — {{ trip.end_date }}</p>
           </div>
      </div>

      <!-- 2. Accommodation Section -->
      <div class="info-card hotel-card">
           <div class="info-icon"><span class="material-symbols-outlined">bed</span></div>
           <div class="info-content">
               <h4>住宿資訊</h4>
               <div v-if="accommodations.length === 0" class="no-data">尚無住宿資料</div>
               <ul v-else class="acc-list">
                   <li v-for="acc in accommodations" :key="acc.id">
                       <a v-if="acc.map_link" :href="acc.map_link" target="_blank">{{ acc.name }}</a>
                       <span v-else>{{ acc.name }}</span>
                       <small v-if="acc.check_in_date">({{ acc.check_in_date }})</small>
                   </li>
               </ul>
               <!-- Future: Add Accommodation Button -->
           </div>
      </div>
  </div>
</template>

<style scoped>
.info-bar-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.info-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  display: flex;
  align-items: flex-start;
  gap: 15px;
  flex: 1;
  min-width: 280px;
}

.info-icon {
  background-color: #F5F5F0;
  color: #555;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-content {
    flex: 1;
}

.info-content h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: #888;
  font-weight: normal;
}

.info-content p {
  margin: 0;
  font-weight: 500;
  color: #333;
}

.date-inputs {
    display: flex;
    align-items: center;
    gap: 5px;
}

.date-inputs input {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 3px;
    font-family: inherit;
}

.acc-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.acc-list li {
    margin-bottom: 4px;
    font-size: 0.95rem;
}
.acc-list a {
    color: #333;
    text-decoration: none;
    border-bottom: 1px dotted #999;
}
.acc-list small {
    color: #999;
    margin-left: 5px;
}
.no-data {
    color: #ccc;
    font-size: 0.9rem;
    font-style: italic;
}
</style>
