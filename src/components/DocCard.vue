<script setup>
import { computed } from 'vue';
import { ArrowRight } from 'lucide-vue-next';

// CORREÇÃO 1: Aceitar Object OU Function para o ícone
const props = defineProps({
  title: { type: String, required: true },
  icon: { type: [Object, Function], required: true }, 
  color: { type: String, default: 'blue' }
});

const emit = defineEmits(['trigger-upload', 'trigger-camera']);

// CORREÇÃO 2: Adicionei as cores que faltavam (red, yellow, emerald, gray)
const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300',
  green: 'bg-green-50 text-green-600 border-green-100 hover:border-green-300',
  purple: 'bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-300',
  orange: 'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-300',
  teal: 'bg-teal-50 text-teal-600 border-teal-100 hover:border-teal-300',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:border-indigo-300',
  pink: 'bg-pink-50 text-pink-600 border-pink-100 hover:border-pink-300',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100 hover:border-cyan-300',
  slate: 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-300',
  
  // --- NOVAS CORES ADICIONADAS PARA O RESTANTE DO APP ---
  red: 'bg-red-50 text-red-600 border-red-100 hover:border-red-300',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100 hover:border-yellow-300',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300',
  gray: 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-300',
};

// Garante que se a cor não existir, usa 'blue' como padrão
const currentClass = computed(() => {
  return colorClasses[props.color] || colorClasses.blue;
});
</script>

<template>
  <div 
    class="flex items-center p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden"
    :class="currentClass"
    @click="$emit('trigger-upload')"
  >
    <div class="mr-4 p-3 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform">
      <component :is="icon" size="24" stroke-width="2" />
    </div>
    
    <div class="flex-1 z-10">
      <h3 class="font-bold text-lg leading-tight">{{ title }}</h3>
      <p class="text-xs opacity-70 font-medium mt-1">Clique para enviar ou tirar foto</p>
    </div>

    <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 text-current">
      <ArrowRight size="20" />
    </div>

    <button 
      @click.stop="$emit('trigger-camera')"
      class="md:hidden absolute right-2 top-2 p-2 bg-white/50 rounded-full hover:bg-white transition-colors"
    >
      📷
    </button>
  </div>
</template>