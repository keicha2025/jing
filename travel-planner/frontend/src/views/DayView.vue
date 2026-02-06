<script setup>
import { ref, computed, watch } from 'vue'
import SpotCard from '../components/SpotCard.vue'
import SmartSpotInput from '../components/SmartSpotInput.vue'
import apiClient from '../api'

const props = defineProps({
  day: Object,
  isEditMode: Boolean, // Global Admin Mode
  spotTypes: Array
})

const emit = defineEmits(['start-edit', 'save-changes', 'unsaved-change', 'trip-refresh'])

// Local State
const isDayEditing = ref(false)
const localSpots = ref([])
const isSaving = ref(false)

// Watch for day change to reset state
watch(() => props.day.day_id, () => {
    cancelEdit()
})

const startEdit = () => {
    localSpots.value = JSON.parse(JSON.stringify(props.day.spots || []))
    isDayEditing.value = true
    emit('start-edit', props.day.day_id)
}

const cancelEdit = () => {
    isDayEditing.value = false
    localSpots.value = []
}

// Actions
const handleLocalSpotUpdate = (updatedSpot) => {
    const idx = localSpots.value.findIndex(s => s.spot_id === updatedSpot.spot_id)
    if (idx !== -1) {
        localSpots.value[idx] = updatedSpot
        emit('unsaved-change', true)
    }
}

const handleLocalReorder = (spotId, direction) => {
    const idx = localSpots.value.findIndex(s => s.spot_id === spotId)
    if (idx === -1) return
    
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx >= 0 && targetIdx < localSpots.value.length) {
        const temp = localSpots.value[idx]
        localSpots.value[idx] = localSpots.value[targetIdx]
        localSpots.value[targetIdx] = temp
        // Update order props for logic consistency
        localSpots.value.forEach((s, i) => s.spot_order = i + 1)
        emit('unsaved-change', true)
    }
}

const handleInstantAddSpot = async (spotData) => {
     try {
        isSaving.value = true
        const payload = {
            day_id: props.day.day_id,
            spot_order: 999, // Append
            time: spotData.time || "10:00",
            title: spotData.title,
            note: spotData.note || "",
            map_link: spotData.map_link || "",
            type: spotData.spot_type_code || "spot"
        }
        const newSpot = await apiClient.post('addSpot', payload)
        
        // Add to localSpots immediately
        let typeObj = props.spotTypes.find(t => t.code === newSpot.type)
        if (!typeObj) typeObj = { name: '景點', code: 'spot' }
        newSpot.spot_type = typeObj
        
        localSpots.value.push(newSpot)
        emit('unsaved-change', true) // Added, so technically dirty if we consider localSpots vs DB (though DB has it, local list needs refresh on save?)
        // Actually, "Update This Day" implies saving the ORDER and TEXT edits. 
        // Newly added spot is ALREADY in DB. 
        // But if user reorders it, we need to save order.
        
    } catch (err) {
        alert("新增失敗: " + err.message)
    } finally {
        isSaving.value = false
    }
}

const saveDayChanges = async () => {
    isSaving.value = true
    try {
        const newItems = localSpots.value.filter(s => s.spot_id.startsWith('temp-'))
        const existingItems = localSpots.value.filter(s => !s.spot_id.startsWith('temp-'))
        
        // 1. Add New (if any temp ones exist - though we used instant add above)
        // If handleInstantAddSpot is used, there are no temp items.
        
        // 2. Update Order/Content of existing
        if (localSpots.value.length > 0) {
             await apiClient.post('updateDaySpots', {
                 day_id: props.day.day_id,
                 spots: localSpots.value.map((s, i) => ({ ...s, spot_order: i + 1 }))
             })
        }

        isDayEditing.value = false
        localSpots.value = []
        emit('save-changes') // Parent should refresh trip
        emit('unsaved-change', false) // Clear dirty flag

    } catch (err) {
        alert("儲存失敗: " + err.message)
    } finally {
        isSaving.value = false
    }
}

// Helper
const formatDayDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const m = d.getMonth() + 1
    const date = d.getDate()
    const dayMap = ['日', '一', '二', '三', '四', '五', '六']
    return `${m}/${date} (${dayMap[d.getDay()]})`
}

// Expose internal state to parent for Modal checks? 
// Or Parent just listens to `unsaved-change` event.
// Current impl: Parent tracks `editingDayId`.
// If parent needs to force cancel (navigating away), we need a way.
// Ideally, `App.vue` manages the "isEditing" state, passing it down?
// Let's refactor: App.vue holds `editingDayId`. 
// Prop `isCurrentDayEditing` passed in?
// To simplify, let's keep local state here but sync with parent?
// The prompt asked for "Separate File".
// If I keep state inside DayView, App.vue needs to ref it to show Modal.
// Better: App.vue manages "Is Editing" and "Dirty".
// DayView emits "update-local-spots" to App.vue?
// Too complex.
// Let's stick to: DayView manages editing. App.vue asks DayView "Are you dirty?"
// Vue 3 `defineExpose`.

defineExpose({
    isDayEditing,
    localSpots,
    cancelEdit
})

</script>

<template>
    <div class="view-day container">
        <div class="day-header-block" style="display:flex; justify-content:space-between; align-items:center;">
            <h2>
                <span class="day-num">Day {{ day.day_order }}</span>
                <span class="day-date">{{ formatDayDate(day.date) }}</span>
            </h2>
            <!-- Edit Trigger Button (Admin Only) -->
            <button v-if="isEditMode && !isDayEditing" @click="startEdit" class="btn-icon">
                <span class="material-symbols-outlined">edit</span>
            </button>
        </div>

        <!-- EDITING MODE LIST -->
        <TransitionGroup v-if="isDayEditing" name="list-move" tag="div" class="spots-list">
            <div v-for="spot in localSpots" :key="spot.spot_id" class="spot-item-wrapper">
                 <SpotCard 
                    :spot="spot"
                    :isEditMode="true"
                    :spotTypes="spotTypes"
                    @update="handleLocalSpotUpdate"
                    @reorder="(dir) => handleLocalReorder(spot.spot_id, dir)"
                />
            </div>
        </TransitionGroup>

        <!-- READ ONLY LIST -->
        <div v-else class="spots-list">
            <div v-for="spot in day.spots" :key="spot.spot_id" class="spot-item-wrapper">
                 <SpotCard 
                    :spot="spot"
                    :isEditMode="false"
                    :spotTypes="spotTypes"
                />
            </div>
        </div>

         <div v-if="isDayEditing" class="edit-actions-panel">
            <SmartSpotInput 
                :dayId="day.day_id"
                :spotTypes="spotTypes"
                @add-spot="handleInstantAddSpot"
            />
            
            <div class="save-actions">
                <button @click="saveDayChanges" class="btn-save" :disabled="isSaving">
                    {{ isSaving ? '儲存中...' : '更新此筆資料' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Scoped styles specific to DayView */
.btn-icon {
    background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 5px;
}
.btn-icon:hover { color: var(--accent-color); }

.edit-actions-panel {
    margin-top: 30px;
    border-top: 1px dashed #E5E5E5;
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
</style>
