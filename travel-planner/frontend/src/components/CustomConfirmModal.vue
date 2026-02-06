<script setup>
defineProps({
  visible: Boolean,
  message: String
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
          <h3 class="serif">提示</h3>
          <p>{{ message || "您有未儲存的變更，確定要離開嗎？" }}</p>
          <div class="modal-actions">
              <button @click="$emit('cancel')" class="btn-cancel">取消 (留在頁面)</button>
              <button @click="$emit('confirm')" class="btn-confirm">確定 (捨棄變更)</button>
          </div>
      </div>
  </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(3px);
    z-index: 10000;
    display: flex; align-items: center; justify-content: center;
}
.modal-card {
    background: #fff; padding: 30px; border-radius: 8px; width: 90%; max-width: 320px;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}
.modal-card h3 { margin-top: 0; color: var(--accent-color); }
.modal-actions {
    margin-top: 25px; display: flex; flex-direction: column; gap: 10px;
}
button {
    padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95rem;
}
.btn-cancel { background: #f0f0f0; color: #666; }
.btn-confirm { background: var(--accent-color); color: #fff; }
</style>
