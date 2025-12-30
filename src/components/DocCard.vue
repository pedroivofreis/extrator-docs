<script setup>
import { Upload, Camera, ChevronRight } from 'lucide-vue-next';

defineProps({
  title: String,
  icon: Object,
  color: String, // 'blue', 'orange', 'purple', 'green'
});

defineEmits(['trigger-upload', 'trigger-camera']);

// Cores baseadas na marca "Humana" e tons pastéis vibrantes
const styles = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   btn: 'hover:bg-blue-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', btn: 'hover:bg-orange-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', btn: 'hover:bg-purple-600' },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-600', btn: 'hover:bg-emerald-600' },
};
</script>

<template>
  <div class="group flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white">
    
    <div class="flex items-center gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
      <div class="p-3 rounded-xl transition-colors" :class="styles[color].bg">
        <component :is="icon" :size="24" :class="styles[color].text" stroke-width="2.5" />
      </div>
      <span class="font-bold text-gray-700 text-lg group-hover:text-gray-900 transition-colors">
        {{ title }}
      </span>
    </div>

    <div class="flex gap-2 w-full sm:w-auto">
      <button 
        @click="$emit('trigger-upload')"
        class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors active:scale-95"
      >
        <Upload :size="16" /> <span class="hidden sm:inline">Arquivo</span>
      </button>

      <button 
        @click="$emit('trigger-camera')"
        class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gray-900 transition-all active:scale-95 shadow-md"
        :class="styles[color].btn"
      >
        <Camera :size="16" /> Foto
      </button>
    </div>

  </div>
</template>