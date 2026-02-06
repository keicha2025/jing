<script setup>
import { computed } from 'vue'

const props = defineProps({
  spot: Object,
  isEditMode: Boolean,
  spotTypes: Array // Pass available types for selection
})

const emit = defineEmits(['update', 'reorder'])

const formatSpotTime = (val) => {
    if (!val) return ""
    // If it is full date 2023-01-01T10:00...
    if (val.includes('T')) {
        const d = new Date(val)
        const hh = d.getHours().toString().padStart(2, '0')
        const mm = d.getMinutes().toString().padStart(2, '0')
        return `${hh}:${mm}`
    }
    // If it is HH:MM or HH:MM:SS
    if (val.includes(':')) {
        return val.substring(0, 5)
    }
    return val
}

const localSpot = computed({
  get: () => props.spot,
  set: (val) => emit('update', val)
})

// Generate time options (00:00 - 23:45, step 15min)
const timeOptions = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = h.toString().padStart(2, '0')
    const mm = m.toString().padStart(2, '0')
    timeOptions.push(`${hh}:${mm}`)
  }
}

// Ensure current time is in options, if not (e.g. 10:12), add it distinctively or handle it
// For simplicity, we just use the list. If spot.time isn't in list, it will show as selected if matches value,
// or we can allow custom input. Here we use <select> + manual input toggle if needed, 
// For now, simple select:
const updateTime = (event) => {
  localSpot.value.time = event.target.value
  emit('update', localSpot.value)
}

const updateTitle = (event) => {
    localSpot.value.title = event.target.value
    emit('update', localSpot.value)
}
</script>

<template>
  <div class="spot-card">
      <div class="spot-header">
           <div class="sort-controls" v-if="isEditMode">
             <button @click="$emit('reorder', 'up')" class="sort-btn material-symbols-outlined">keyboard_arrow_up</button>
             <button @click="$emit('reorder', 'down')" class="sort-btn material-symbols-outlined">keyboard_arrow_down</button>
          </div>

          <!-- Icon Display / Selection -->
           <!-- If Edit Mode, maybe allow changing icon/type? For now just display icon -->
          <span class="material-symbols-outlined spot-icon">
              {{ spot.icon_override || (spot.spot_type ? spot.spot_type.default_icon : 'place') }}
          </span>
          
          <div class="spot-info">
             <div v-if="isEditMode" class="edit-row">
                 <input 
                    :value="spot.title"
                    @blur="updateTitle"
                    class="spot-title-input" 
                    placeholder="地點名稱"
                 />
             </div>
             <h3 v-else class="spot-title">{{ spot.title }}</h3>
             
             <!-- JP Title (Optional) -->
             <span v-if="spot.title_jp" class="jp-text">{{ spot.title_jp }}</span>
          </div>

          <!-- Time Display / Picker -->
          <div class="time-container">
              <select v-if="isEditMode" :value="spot.time" @change="updateTime" class="time-select">
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
              <span v-else class="spot-time">{{ formatSpotTime(spot.time) }}</span>
          </div>
      </div>

      <!-- Note / Description -->
      <div class="spot-body">
          <textarea 
            v-if="isEditMode" 
            v-model="spot.note" 
            @blur="emit('update', spot)"
            class="note-input"
            rows="2"
            placeholder="在此輸入備註"
          ></textarea>
          <p v-else class="spot-note">{{ spot.note }}</p>
      </div>

      <!-- Footer/Actions -->
      <div v-if="spot.map_link && !isEditMode" class="spot-footer">
           <!-- Future: Add Map Link Button -->
      </div>
  </div>
</template>

<style scoped>
.spot-card {
  background: white;
  border-radius: 12px;
  padding: 15px 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.spot-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 8px;
}

.spot-icon {
  color: #8E403A;
  font-size: 1.5rem;
  background: #f9f9f9;
  padding: 8px;
  border-radius: 50%;
}

.spot-info {
  flex: 1;
}

.spot-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2D2D2D;
}

.spot-title-input {
    font-size: 1.1rem;
    font-weight: 700;
    width: 100%;
    border: none;
    border-bottom: 1px solid #ddd;
    padding: 5px 0;
    outline: none;
}
.spot-title-input:focus {
    border-color: #8E403A;
}

.jp-text {
  font-size: 0.85rem;
  color: #999;
  display: block;
  margin-top: 2px;
}

.spot-time {
  font-family: monospace;
  font-size: 1rem;
  color: #666;
  background: #f4f4f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.time-select {
    font-family: monospace;
    font-size: 1rem;
    padding: 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.spot-note {
  color: #666;
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

.note-input {
    width: 100%;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 8px;
    font-size: 0.95rem;
    font-family: inherit;
    resize: vertical;
}

.sort-controls {
    display: flex; flex-direction: column; 
    margin-right: 5px;
}
.sort-btn {
    background: none; border: none; cursor: pointer; padding: 0; color: #ccc; font-size: 1.2rem;
}
.sort-btn:hover { color: #8E403A; }
</style>
