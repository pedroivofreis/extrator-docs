<script setup>
import { ref, computed } from 'vue';
import { User, FileText, Briefcase, MapPin, CheckCircle, Download, Loader2, Sparkles, ArrowLeft, Image as ImageIcon } from 'lucide-vue-next';
import DocCard from './components/DocCard.vue';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const step = ref(1);
const loading = ref(false);
const statusMessage = ref("");
const selectedType = ref(null);
const extractedData = ref(null);
const previewImage = ref(null);

const fileInputUpload = ref(null);
const fileInputCamera = ref(null);

// Filtra para não mostrar a imagem gigante nos campos de texto
const textFields = computed(() => {
  if (!extractedData.value) return {};
  const { imagem_original, ...rest } = extractedData.value;
  return rest;
});

const triggerAction = (type, action) => {
  selectedType.value = type;
  action === 'upload' ? fileInputUpload.value.click() : fileInputCamera.value.click();
};

const convertPdfToImage = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85);
};

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    loading.value = true;
    extractedData.value = null;
    let finalBase64 = "";

    if (file.type === 'application/pdf') {
      statusMessage.value = "Processando PDF...";
      finalBase64 = await convertPdfToImage(file);
    } else {
      statusMessage.value = "Lendo arquivo...";
      finalBase64 = await readFileAsBase64(file);
    }

    // Salva preview imediato para a UI ficar ágil
    previewImage.value = finalBase64;
    statusMessage.value = "Analisando com IA...";
    
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: finalBase64, type: selectedType.value }),
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro de conexão");
    }
    
    const data = await response.json();
    extractedData.value = data;
    step.value = 2;

  } catch (error) {
    alert("Erro: " + error.message);
    console.error(error);
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

    <div v-if="loading" class="fixed inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center z-50 transition-all">
      <div class="relative">
        <div class="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <Loader2 class="animate-spin text-orange-500 h-16 w-16 mb-4 relative z-10" />
      </div>
      <p class="text-gray-600 font-bold text-lg animate-pulse">{{ statusMessage }}</p>
    </div>

    <input type="file" ref="fileInputUpload" accept="image/*,application/pdf" class="hidden" @change="handleFileUpload" />
    <input type="file" ref="fileInputCamera" accept="image/*" capture="environment" class="hidden" @change="handleFileUpload" />

    <main class="bg-white/80 backdrop-blur-sm relative z-10 w-full max-w-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6 md:p-10 border border-white/50">
      
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 rounded-2xl mb-4 shadow-sm border border-orange-100">
          <Sparkles :size="32" stroke-width="2" />
        </div>
        <h1 class="text-3xl font-extrabold text-gray-800 tracking-tight">Processador Inteligente</h1>
        <p class="text-gray-500 mt-2 text-lg">Selecione o tipo de documento para começar <br> <span class="text-sm opacity-70">Powered by Pedro Reis & Gemini 2.0</span></p>
      </div>

      <div v-if="step === 1" class="flex flex-col gap-4">
        <DocCard title="Identidade (RG)" :icon="User" color="blue" @trigger-upload="triggerAction('rg', 'upload')" @trigger-camera="triggerAction('rg', 'camera')" />
        <DocCard title="CNH Digital" :icon="FileText" color="green" @trigger-upload="triggerAction('cnh', 'upload')" @trigger-camera="triggerAction('cnh', 'camera')" />
        <DocCard title="Profissional (OAB/CRM)" :icon="Briefcase" color="purple" @trigger-upload="triggerAction('classe', 'upload')" @trigger-camera="triggerAction('classe', 'camera')" />
        <DocCard title="Endereço (Contas)" :icon="MapPin" color="orange" @trigger-upload="triggerAction('endereco', 'upload')" @trigger-camera="triggerAction('endereco', 'camera')" />
      </div>

      <div v-if="step === 2" class="animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div class="flex items-center gap-3 mb-6 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">
          <CheckCircle class="h-6 w-6" />
          <span class="font-bold">Leitura concluída com sucesso!</span>
        </div>

        <div class="mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div class="flex items-center gap-2 mb-3 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <ImageIcon :size="14" />
            Documento Analisado
          </div>
          <div class="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-100">
             <img :src="extractedData.imagem_original || previewImage" class="w-full h-auto object-contain max-h-[300px]" />
          </div>
        </div>

        <div class="grid gap-4 mb-8">
          <div v-for="(val, key) in textFields" :key="key" class="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-all group focus-within:ring-2 ring-blue-100 focus-within:bg-white">
            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">{{ formatKey(key) }}</label>
            <input 
              type="text" 
              v-model="extractedData[key]" 
              class="w-full bg-transparent text-gray-800 font-medium outline-none border-b border-transparent focus:border-blue-400 pb-1 transition-all" 
            />
          </div>
        </div>

        <div class="flex gap-4">
          <button 
            @click="step = 1; extractedData = null; previewImage = null" 
            class="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft :size="20" /> Voltar
          </button>
          
          <button 
            @click="downloadJson" 
            class="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Download :size="20" /> Baixar JSON
          </button>
        </div>
      </div>

    </main>
  </div>
</template>