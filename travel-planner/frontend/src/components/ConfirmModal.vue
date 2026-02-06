<script setup>
defineProps({
  show: Boolean,
  title: String,
  message: String
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-card">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="modal-actions">
        <button @click="emit('cancel')" class="btn-cancel">取消</button>
        <button @click="emit('confirm')" class="btn-confirm">確定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  text-align: center;
}
.modal-card h3 {
  margin-top: 0;
  color: #333;
}
.modal-card p {
  color: #666;
  margin-bottom: 25px;
}
.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}
button {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
button:hover {
  opacity: 0.8;
}
.btn-cancel {
  background: #eee;
  color: #666;
}
.btn-confirm {
  background: #8E403A;
  color: white;
  font-weight: bold;
}
</style>
