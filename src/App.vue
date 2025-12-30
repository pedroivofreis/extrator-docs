<script setup>
import { ref } from 'vue';
// Adicionei o ArrowLeft aqui nos imports que estava faltando
import { User, FileText, Briefcase, MapPin, CheckCircle, Download, Loader2, Sparkles, ArrowLeft } from 'lucide-vue-next';
import DocCard from './components/DocCard.vue';

const step = ref(1);
const loading = ref(false);
const statusMessage = ref("");
const selectedType = ref(null);
const extractedData = ref(null);

const fileInputUpload = ref(null);
const fileInputCamera = ref(null);

const triggerAction = (type, action) => {
  selectedType.value = type;
  action === 'upload' ? fileInputUpload.value.click() : fileInputCamera.value.click();
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 1200 / Math.max(img.width, img.height);
        const width = scale < 1 ? img.width * scale : img.width;
        const height = scale < 1 ? img.height * scale : img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    };
  });
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    loading.value = true;
    statusMessage.value = "Lendo documento...";
    const compressedBase64 = await compressImage(file);
    
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: compressedBase64, type: selectedType.value }),
    });

    if (!response.ok) throw new Error("Erro de conexão");
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    extractedData.value = data;
    step.value = 2;

  } catch (error) {
    alert("Erro: " + error.message);
  } finally {
    loading.value = false;
    event.target.value = '';
  }
};

const downloadJson = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(extractedData.value, null, 2));
  const el = document.createElement('a');
  el.setAttribute("href", dataStr);
  el.setAttribute("download", `${selectedType.value}_extraido.json`);
  el.click();
};

const formatKey = (key) => key.replace(/_/g, ' ');
</script>

<template>
  <div class="min-h-screen bg-[#fffdf9] flex items-center justify-center p-4 relative overflow-hidden font-sans">
    
    <div class="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-200 rounded-full blur-[100px] opacity-40 animate-pulse"></div>
    <div class="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-pink-200 rounded-full blur-[120px] opacity-40"></div>
    <div class="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-yellow-100 rounded-full blur-[80px] opacity-60"></div>

    <div v-if="loading" class="fixed inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-50">
      <Loader2 class="animate-spin text-orange-500 h-12 w-12 mb-4" />
      <p class="text-gray-600 font-medium">{{ statusMessage }}</p>
    </div>

    <input type="file" ref="fileInputUpload" accept="image/*" class="hidden" @change="handleFileUpload" />
    <input type="file" ref="fileInputCamera" accept="image/*" capture="environment" class="hidden" @change="handleFileUpload" />

    <main class="bg-white relative z-10 w-full max-w-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 md:p-12 border border-white">
      
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl mb-4 shadow-sm">
          <Sparkles :size="32" stroke-width="2" />
        </div>
        <h1 class="text-3xl font-extrabold text-gray-800 tracking-tight">Processador Inteligente</h1>
        <p class="text-gray-500 mt-2 text-lg">Selecione o tipo de documento para começar <br> Powered by Pedro Reis</p>
      </div>

      <div v-if="step === 1" class="flex flex-col gap-4">
        
        <DocCard 
          title="Identidade (RG)" 
          :icon="User" 
          color="blue"
          @trigger-upload="triggerAction('rg', 'upload')"
          @trigger-camera="triggerAction('rg', 'camera')"
        />

        <DocCard 
          title="CNH Digital" 
          :icon="FileText" 
          color="green"
          @trigger-upload="triggerAction('cnh', 'upload')"
          @trigger-camera="triggerAction('cnh', 'camera')"
        />

        <DocCard 
          title="Profissional (OAB/CRM)" 
          :icon="Briefcase" 
          color="purple"
          @trigger-upload="triggerAction('classe', 'upload')"
          @trigger-camera="triggerAction('classe', 'camera')"
        />

        <DocCard 
          title="Endereço (Contas)" 
          :icon="MapPin" 
          color="orange"
          @trigger-upload="triggerAction('endereco', 'upload')"
          @trigger-camera="triggerAction('endereco', 'camera')"
        />
        
        </div>

      <div v-if="step === 2" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex items-center gap-3 mb-6 text-green-600 bg-green-50 p-4 rounded-xl">
          <CheckCircle class="h-6 w-6" />
          <span class="font-bold">Leitura concluída com sucesso!</span>
        </div>

        <div class="grid gap-4 mb-8">
          <div v-for="(val, key) in extractedData" :key="key" class="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors group">
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">{{ formatKey(key) }}</label>
            <input 
              type="text" 
              v-model="extractedData[key]" 
              class="w-full bg-transparent text-gray-800 font-medium outline-none border-b border-transparent focus:border-blue-400 pb-1" 
            />
          </div>
        </div>

        <div class="flex gap-4">
          <button 
            @click="step = 1; extractedData = null" 
            class="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft :size="20" /> Voltar
          </button>
          
          <button 
            @click="downloadJson" 
            class="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-[#ef4444] hover:bg-[#dc2626] shadow-lg shadow-red-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Download :size="20" /> Baixar Dados
          </button>
        </div>
      </div>

    </main>
  </div>
</template>