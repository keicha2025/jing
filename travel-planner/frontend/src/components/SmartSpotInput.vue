<script setup>
import { ref } from 'vue'
import axios from 'axios'

const API_BASE_URL = "http://127.0.0.1:8000"

const emit = defineEmits(['add-spot'])
const props = defineProps(['dayId', 'dayOrder', 'spotTypes'])

const inputMode = ref('smart') // 'smart' or 'manual'
const smartUrl = ref('')
const manualTitle = ref('')
const isLoading = ref(false)
const selectedType = ref('spot') // default code

const handleSmartFetch = async () => {
    if (!smartUrl.value) return
    isLoading.value = true
    try {
        const res = await axios.post(`${API_BASE_URL}/api/smart-fetch`, {
            url: smartUrl.value
        })
        const data = res.data
        // Emit result to parent to create spot
        emit('add-spot', {
            title: data.title,
            note: data.note,
            map_link: data.map_link,
            time: "10:00", // Default time
            type_id: null, // Should find type_id by code? Or let backend handle default? 
            // Better to let user select type or default to 'spot'
            spot_type_code: selectedType.value
        })
        smartUrl.value = ''
    } catch (err) {
        alert("無法抓取連結資訊，請嘗試改用手動輸入")
        console.error(err)
    } finally {
        isLoading.value = false
    }
}

const handleManualAdd = () => {
    if (!manualTitle.value) return
    emit('add-spot', {
        title: manualTitle.value,
        note: inputNote.value,
        map_link: "",
        time: inputTime.value,
        spot_type_code: selectedType.value
    })
    manualTitle.value = ''
    inputNote.value = ''
}

const inputTime = ref("10:00")
const inputNote = ref("")
</script>

<template>
  <div class="smart-input-card">
      <div class="input-body">
          <div class="input-row">
             <!-- Time -->
             <input type="time" v-model="inputTime" class="time-input" />
             <!-- Name (Manual) -->
             <input 
                 v-model="manualTitle" 
                 placeholder="地點名稱..." 
                 class="main-input"
             />
             <!-- Type -->
             <select v-model="selectedType" class="type-select-mini">
                 <option v-for="t in spotTypes" :key="t.id" :value="t.code">{{ t.name }}</option>
             </select>
          </div>

          <div class="input-row">
              <textarea 
                 v-model="inputNote" 
                 placeholder="備註..."
                 class="note-input-full"
                 rows="2"
              ></textarea>
          </div>

          <div class="input-row auxiliary-row">
              <span class="material-symbols-outlined icon-link">link</span>
              <input 
                 v-model="smartUrl" 
                 placeholder="Google Maps 連結 (輔助填入)" 
                 class="aux-input"
                 @blur="handleSmartFetch"
              />
              <button @click="handleManualAdd" class="btn-action-full">新增行程</button>
          </div>
      </div>
  </div>
</template>

<style scoped>
.smart-input-card {
    background: #fff;
    border-radius: 8px;
    border: 1px dashed #ccc;
    padding: 15px;
    margin-top: 20px;
}
.tabs {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}
.tabs button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    color: #999;
    font-size: 0.9rem;
    padding: 5px 0;
}
.tabs button.active {
    color: #8E403A;
    font-weight: bold;
    border-bottom: 2px solid #8E403A;
}

.input-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.type-select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #f9f9f9;
}
.input-row {
    display: flex; gap: 8px; margin-bottom: 8px; align-items: center;
}
.main-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa; }
.btn-action {
    background: #333;
    color: white;
    border: none;
    padding: 0 20px;
    border-radius: 6px;
    cursor: pointer;
}
.btn-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.time-input { width: 90px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa; }
.type-select-mini { width: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }

.note-input-full {
    width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-size: 0.95rem; background: #fafafa; resize: none;
}
.auxiliary-row {
    margin-top: 10px; border-top: 1px solid #f0f0f0; padding-top: 10px;
}
.icon-link { color: #ccc; font-size: 1.2rem; }
.aux-input {
    flex: 1; border: none; background: transparent; font-size: 0.9rem; color: #666;
}
.aux-input:focus { outline: none; color: #333; }
.btn-action-full {
    background: var(--accent-color); color: #fff; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;
}
.column-layout {
    flex-direction: column;
}
.row-top {
    display: flex; gap: 10px; width: 100%;
}
.note-input-sm {
    width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 5px; font-size: 0.9rem;
}
</style>
