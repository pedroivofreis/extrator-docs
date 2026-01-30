<script setup>
import { ref, computed } from 'vue';
import { 
  // Ícones Básicos e UI
  User, FileText, Briefcase, MapPin, CheckCircle, Download, Loader2, Sparkles, ArrowLeft, Image as ImageIcon,
  FileStack, ChevronDown, ChevronUp, X,
  // Ícones Formação
  GraduationCap, Globe, Award, BookOpen, ScrollText,
  // Ícones Saúde
  Heart, Syringe, CreditCard,
  // Ícones Regularidade & PJ
  ShieldCheck, FileCheck, Building2, FileType, Fingerprint,
  // --- NOVO: Ícone de Rosto ---
  ScanFace
} from 'lucide-vue-next';

import DocCard from './components/DocCard.vue';
import * as pdfjsLib from 'pdfjs-dist';

// --- NOVO: Import do Modal de Biometria ---
import FaceRegistrationModal from './components/FaceRegistrationModal.vue';

// Configuração do Worker do PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// --- ESTADOS ---
const step = ref(1);
const loading = ref(false);
const statusMessage = ref("");
const selectedType = ref(null);
const extractedData = ref(null); // Para modo único
const previewImage = ref(null);

// --- NOVO: Estado para controlar o Modal ---
const showFaceModal = ref(false);

// --- NOVO: Handler de Captura Facial ---
const handleFaceCapture = (data) => {
  // Cria um objeto de dados simulado para exibir no Step 2
  extractedData.value = {
    tipo_documento: "Biometria Facial",
    status_captura: "Sucesso",
    pontos_mapeados: data.biometrics ? `${data.biometrics.length} pontos` : "N/A",
    data_hora: new Date().toLocaleString(),
    imagem_original: data.photo // Isso faz a foto aparecer no preview
  };

  previewImage.value = data.photo;
  step.value = 2; // Avança para a tela de conferência
  showFaceModal.value = false; // Fecha o modal
};

// --- NOVOS ESTADOS PARA LOTE ---
const isBatchMode = ref(false);
const batchResults = ref([]);
const batchProgress = ref({ current: 0, total: 0 });

const fileInputUpload = ref(null);
const fileInputCamera = ref(null);
const fileInputBatch = ref(null); // Novo ref para o input múltiplo

// --- COMPUTADOS ---
const parsedFields = computed(() => {
  if (!extractedData.value) return { simple: {}, complex: {} };
  
  const { imagem_original, ...rest } = extractedData.value;
  const simple = {};
  const complex = {};

  Object.entries(rest).forEach(([key, val]) => {
    if (val === null || val === "" || val === undefined) return;
    if (Array.isArray(val) || typeof val === 'object') {
      complex[key] = val;
    } else {
      simple[key] = val;
    }
  });

  return { simple, complex };
});

// --- HELPER SHARED: Processar Arquivo (Único ou Lote) ---
const processFileAPI = async (file, type) => {
    let finalBase64 = "";
    if (file.type === 'application/pdf') {
      finalBase64 = await convertPdfToImage(file);
    } else {
      finalBase64 = await readFileAsBase64(file);
    }

    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: finalBase64, type: type }),
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro de conexão");
    }
    
    return await response.json();
};

// --- AÇÕES ---

const triggerAction = (type, action) => {
  selectedType.value = type;
  isBatchMode.value = false; // Garante que sai do modo lote
  action === 'upload' ? fileInputUpload.value.click() : fileInputCamera.value.click();
};

const triggerBatchUpload = () => {
  fileInputBatch.value.click();
};

const convertPdfToImage = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
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

// --- HANDLERS ---

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    loading.value = true;
    statusMessage.value = file.type === 'application/pdf' ? "Processando PDF..." : "Lendo arquivo...";
    
    if (file.type !== 'application/pdf') {
        previewImage.value = await readFileAsBase64(file);
    }

    statusMessage.value = "Analisando com IA...";
    const data = await processFileAPI(file, selectedType.value);
    
    extractedData.value = data;
    previewImage.value = data.imagem_original; 
    step.value = 2;

  } catch (error) {
    alert("Erro: " + error.message);
    console.error(error);
  } finally {
    loading.value = false;
    if (event.target) event.target.value = '';
  }
};

const handleBatchUpload = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  try {
    loading.value = true;
    isBatchMode.value = true;
    batchResults.value = [];
    step.value = 3; 
    batchProgress.value = { current: 0, total: files.length };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      batchProgress.value.current = i + 1;
      statusMessage.value = `Processando ${i + 1} de ${files.length}...`;

      try {
        const data = await processFileAPI(file, 'auto');
        data._id = Date.now() + i; 
        data._expanded = false; 
        batchResults.value.push(data);
      } catch (err) {
        console.error(`Erro no arquivo ${i}:`, err);
      }
    }

  } catch (error) {
    alert("Erro no lote: " + error.message);
  } finally {
    loading.value = false;
    statusMessage.value = "";
    event.target.value = '';
  }
};

const toggleBatchItem = (item) => {
  item._expanded = !item._expanded;
};

const downloadJson = () => {
  const dataToDownload = isBatchMode.value ? batchResults.value : extractedData.value;
  const name = isBatchMode.value ? 'lote_documentos' : (selectedType.value || 'documento');
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToDownload, null, 2));
  const el = document.createElement('a');
  el.setAttribute("href", dataStr);
  el.setAttribute("download", `${name}_extraido.json`);
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
      
      <div v-if="isBatchMode && batchProgress.total > 0" class="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
        <div class="h-full bg-orange-500 transition-all duration-500" :style="{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }"></div>
      </div>
    </div>

    <input type="file" ref="fileInputUpload" accept="image/*,application/pdf" class="hidden" @change="handleFileUpload" />
    <input type="file" ref="fileInputCamera" accept="image/*" capture="environment" class="hidden" @change="handleFileUpload" />
    <input type="file" ref="fileInputBatch" multiple accept="image/*,application/pdf" class="hidden" @change="handleBatchUpload" />

    <main class="bg-white/80 backdrop-blur-sm relative z-10 w-full max-w-4xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6 md:p-10 border border-white/50 my-10 min-h-[600px]">
      
      <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div class="text-left">
           <div class="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-xl mb-2 mr-3 align-middle shadow-sm">
             <Sparkles :size="24" stroke-width="2" />
           </div>
           <span class="text-3xl font-extrabold text-gray-800 tracking-tight align-middle">Extrator Inteligente</span>
           <p class="text-gray-500 mt-1 text-sm md:ml-16">Editor construído por Pedro Reis</p>
        </div>

        <button 
           v-if="step === 1"
           @click="triggerBatchUpload"
           class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap"
         >
           <FileStack :size="18" />
           Importar em Lote
         </button>
      </div>

      <div v-if="step === 1" class="flex flex-col gap-8 animate-in fade-in zoom-in duration-500">
        <div>
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1 border-l-4 border-blue-200 ml-1">Identificação Pessoal</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DocCard title="RG / Identidade" :icon="User" color="blue" @trigger-upload="triggerAction('rg', 'upload')" @trigger-camera="triggerAction('rg', 'camera')" />
            <DocCard title="CNH Digital" :icon="FileText" color="green" @trigger-upload="triggerAction('cnh', 'upload')" @trigger-camera="triggerAction('cnh', 'camera')" />
            
            <DocCard 
              title="Biometria Facial" 
              :icon="ScanFace" 
              color="purple" 
              @trigger-upload="showFaceModal = true" 
              @trigger-camera="showFaceModal = true" 
            />

            <DocCard title="Endereço" :icon="MapPin" color="orange" @trigger-upload="triggerAction('endereco', 'upload')" @trigger-camera="triggerAction('endereco', 'camera')" />
          </div>
        </div>

        <div>
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1 border-l-4 border-teal-200 ml-1">Formação & Carreira</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DocCard title="Diploma Graduação" :icon="GraduationCap" color="teal" @trigger-upload="triggerAction('diploma', 'upload')" @trigger-camera="triggerAction('diploma', 'camera')" />
            <DocCard title="Revalidação" :icon="Globe" color="indigo" @trigger-upload="triggerAction('revalidacao', 'upload')" @trigger-camera="triggerAction('revalidacao', 'camera')" />
            <DocCard title="Especialização/RQE" :icon="Award" color="pink" @trigger-upload="triggerAction('especializacao', 'upload')" @trigger-camera="triggerAction('especializacao', 'camera')" />
            <DocCard title="Curso Complementar" :icon="BookOpen" color="cyan" @trigger-upload="triggerAction('complementar', 'upload')" @trigger-camera="triggerAction('complementar', 'camera')" />
            <DocCard title="Currículo / CV" :icon="ScrollText" color="slate" @trigger-upload="triggerAction('curriculo', 'upload')" @trigger-camera="triggerAction('curriculo', 'camera')" />
          </div>
        </div>

        <div>
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1 border-l-4 border-red-200 ml-1">Saúde & Vacinas</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DocCard title="Cartão SUS (CNS)" :icon="Heart" color="red" @trigger-upload="triggerAction('cartao_sus', 'upload')" @trigger-camera="triggerAction('cartao_sus', 'camera')" />
            <DocCard title="Carteira Vacinação" :icon="Syringe" color="cyan" @trigger-upload="triggerAction('carteira_vacinacao', 'upload')" @trigger-camera="triggerAction('carteira_vacinacao', 'camera')" />
            <DocCard title="Convênio Médico" :icon="CreditCard" color="indigo" @trigger-upload="triggerAction('carteirinha_convenio', 'upload')" @trigger-camera="triggerAction('carteirinha_convenio', 'camera')" />
          </div>
        </div>

        <div>
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1 border-l-4 border-yellow-200 ml-1">Jurídico & Regularidade</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DocCard title="Certidão Ética" :icon="ShieldCheck" color="emerald" @trigger-upload="triggerAction('certidao_etica', 'upload')" @trigger-camera="triggerAction('certidao_etica', 'camera')" />
            <DocCard title="Nada Consta (Débitos)" :icon="FileCheck" color="emerald" @trigger-upload="triggerAction('certidao_negativa_debitos', 'upload')" @trigger-camera="triggerAction('certidao_negativa_debitos', 'camera')" />
            <DocCard title="Antecedentes Criminais" :icon="Fingerprint" color="gray" @trigger-upload="triggerAction('antecedentes_criminais', 'upload')" @trigger-camera="triggerAction('antecedentes_criminais', 'camera')" />
            <DocCard title="Cartão CNPJ" :icon="Building2" color="yellow" @trigger-upload="triggerAction('cartao_cnpj', 'upload')" @trigger-camera="triggerAction('cartao_cnpj', 'camera')" />
            <DocCard title="Contrato Social" :icon="FileType" color="yellow" @trigger-upload="triggerAction('contrato_social', 'upload')" @trigger-camera="triggerAction('contrato_social', 'camera')" />
          </div>
        </div>
      </div>

      <div v-if="step === 2" class="animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div class="flex items-center gap-3 mb-6 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">
          <CheckCircle class="h-6 w-6" />
          <span class="font-bold">Dados extraídos com sucesso!</span>
        </div>

        <div class="mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div class="flex items-center gap-2 mb-3 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <ImageIcon :size="14" />
            Documento Analisado
          </div>
          <div class="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-100 flex justify-center bg-gray-200/50">
             <img :src="extractedData.imagem_original || previewImage" class="h-auto max-h-[300px] object-contain" />
          </div>
        </div>

        <div class="grid gap-4 mb-8">
            <div v-for="(val, key) in parsedFields.simple" :key="key" class="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-all group focus-within:ring-2 ring-blue-100 focus-within:bg-white">
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">{{ formatKey(key) }}</label>
              
              <textarea v-if="String(val).length > 60" v-model="extractedData[key]" rows="3" class="w-full bg-transparent text-gray-800 font-medium outline-none resize-none border-b border-transparent focus:border-blue-400"></textarea>
              
              <input v-else
                type="text" 
                v-model="extractedData[key]" 
                class="w-full bg-transparent text-gray-800 font-medium outline-none border-b border-transparent focus:border-blue-400 pb-1 transition-all" 
              />
            </div>
        </div>

        <div v-if="Object.keys(parsedFields.complex).length > 0" class="mb-8 space-y-4">
           <div v-for="(val, key) in parsedFields.complex" :key="key" class="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
             <h4 class="font-bold text-sm text-blue-600 uppercase tracking-wider mb-3">{{ formatKey(key) }}</h4>
             
             <div v-if="Array.isArray(val) && typeof val[0] !== 'object'" class="flex flex-wrap gap-2">
                <span v-for="(item, idx) in val" :key="idx" class="px-3 py-1 bg-white border border-blue-200 rounded-full text-sm text-gray-700 shadow-sm">{{ item }}</span>
             </div>

             <div v-else-if="Array.isArray(val)" class="space-y-2">
                <div v-for="(item, idx) in val" :key="idx" class="bg-white p-3 rounded-lg border border-gray-200 text-sm shadow-sm">
                   <div v-for="(subVal, subKey) in item" :key="subKey" class="flex justify-between border-b last:border-0 border-gray-100 py-1">
                      <span class="font-medium text-gray-500">{{ formatKey(subKey) }}:</span>
                      <span class="text-gray-800 text-right">{{ subVal }}</span>
                   </div>
                </div>
             </div>
           </div>
        </div>

        <div class="flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur p-4 border-t border-gray-100 -mx-6 -mb-6 rounded-b-3xl">
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

      <div v-if="step === 3" class="animate-in fade-in slide-in-from-right-8">
         <div class="flex items-center justify-between mb-6 sticky top-0 bg-white/95 backdrop-blur z-20 py-4 border-b">
            <div>
               <h2 class="text-xl font-bold text-gray-800">Lote Processado</h2>
               <p class="text-xs text-gray-500 mt-1">{{ batchResults.length }} documentos analisados</p>
            </div>
            
            <div class="flex gap-2">
               <button @click="step=1" class="px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 text-sm">
                  Novo
               </button>
               <button @click="downloadJson" class="px-4 py-2 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 text-sm flex gap-2">
                  <Download :size="16" /> Baixar Tudo
               </button>
            </div>
         </div>

         <div class="space-y-4 pb-8">
            <div v-for="item in batchResults" :key="item._id" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
               
               <div @click="toggleBatchItem(item)" class="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div class="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 border">
                     <img :src="item.imagem_original" class="w-full h-full object-cover" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                     <div class="flex items-center gap-2 mb-1">
                        <span class="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide">
                           {{ item.tipo_detectado || 'DESCONHECIDO' }}
                        </span>
                        <span v-if="item.confianca" class="text-[10px] text-gray-400 font-medium">
                           {{ item.confianca }}
                        </span>
                     </div>
                     <h3 class="font-bold text-gray-700 text-sm truncate">
                        {{ item.dados?.nome_completo || item.dados?.razao_social || 'Documento sem nome identificado' }}
                     </h3>
                  </div>

                  <component :is="item._expanded ? ChevronUp : ChevronDown" class="text-gray-400 shrink-0" :size="20" />
               </div>

               <div v-if="item._expanded" class="p-4 bg-gray-50 border-t border-gray-100 grid gap-2 text-sm animate-in slide-in-from-top-2">
                  <div v-if="item.dados" class="grid gap-2">
                     <div v-for="(val, key) in item.dados" :key="key" class="flex justify-between py-1 border-b border-gray-100 last:border-0 items-start">
                        <span class="text-gray-500 font-medium capitalize shrink-0 mr-4">{{ formatKey(key) }}:</span>
                        <span v-if="typeof val !== 'object'" class="text-gray-800 font-bold text-right break-words">{{ val }}</span>
                         <span v-else class="text-gray-600 text-[10px] text-right italic">(Dado complexo/lista)</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

    </main>
    
    <FaceRegistrationModal 
      v-if="showFaceModal" 
      @close="showFaceModal = false" 
      @capture="handleFaceCapture" 
    />

  </div>
</template>