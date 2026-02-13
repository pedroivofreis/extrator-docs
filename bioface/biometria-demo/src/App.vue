<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { 
  ScanFace, Camera, Upload, CheckCircle, XCircle, 
  FileJson, Activity, Lock, RefreshCw, ChevronRight, Download
} from 'lucide-vue-next';

const FaceMesh = window.FaceMesh;
const MediaPipeCamera = window.Camera;

const activeTab = ref('compare');
const loading = ref(false);

const videoDevices = ref([]);
const selectedDeviceId = ref('');

const docImage = ref(null);
const selfieImage = ref(null);
const compareResult = ref(null);
const videoCompare = ref(null);
const isCompareCameraOpen = ref(false);

const videoExtract = ref(null);
const canvasExtract = ref(null);
const isExtracting = ref(false);
const faceDataJSON = ref(null);
let faceMesh = null;
let cameraExtract = null;

// --- LÓGICA DE DESAFIOS (LIVENESS) ---
const challenges = ref([
  { id: 'center', label: 'Olhe para frente', done: false },
  { id: 'left', label: 'Vire para a esquerda', done: false },
  { id: 'right', label: 'Vire para a direita', done: false }
]);
const currentChallengeIndex = ref(0);

const checkHeadPose = (landmarks) => {
  const nose = landmarks[1];
  const leftSide = landmarks[234];
  const rightSide = landmarks[454];

  // Cálculo de proporção para detectar rotação lateral (Yaw)
  const distL = Math.abs(nose.x - leftSide.x);
  const distR = Math.abs(nose.x - rightSide.x);
  const ratio = distL / distR;

  const current = challenges.value[currentChallengeIndex.value];
  if (!current) return;

  if (current.id === 'center' && ratio > 0.8 && ratio < 1.3) {
    completeChallengeStep();
  } else if (current.id === 'left' && ratio < 0.35) {
    completeChallengeStep();
  } else if (current.id === 'right' && ratio > 2.8) {
    completeChallengeStep();
  }
};

const completeChallengeStep = () => {
  challenges.value[currentChallengeIndex.value].done = true;
  if (currentChallengeIndex.value < challenges.value.length - 1) {
    currentChallengeIndex.value++;
  }
};

const resetChallenges = () => {
  challenges.value.forEach(t => t.done = false);
  currentChallengeIndex.value = 0;
};

// --- RESTO DA LÓGICA ---
const getConnectedDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices.value = devices.filter(device => device.kind === 'videoinput');
    if (videoDevices.value.length > 0 && !selectedDeviceId.value) {
      selectedDeviceId.value = videoDevices.value[0].deviceId;
    }
  } catch (e) { console.error(e); }
};

watch(selectedDeviceId, async () => {
  if (isExtracting.value) { await stopExtraction(); await nextTick(); await toggleExtraction(); }
  if (isCompareCameraOpen.value) {
    videoCompare.value.srcObject.getTracks().forEach(t => t.stop());
    startCompareCamera();
  }
});

onMounted(() => { getConnectedDevices(); navigator.mediaDevices.ondevicechange = getConnectedDevices; });

const handleDocUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => docImage.value = ev.target.result;
  reader.readAsDataURL(file);
};

const startCompareCamera = async () => {
  isCompareCameraOpen.value = true;
  await nextTick();
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { deviceId: selectedDeviceId.value ? { exact: selectedDeviceId.value } : undefined } 
  });
  videoCompare.value.srcObject = stream;
};

const takeComparePhoto = () => {
  const canvas = document.createElement('canvas');
  canvas.width = videoCompare.value.videoWidth;
  canvas.height = videoCompare.value.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(videoCompare.value, 0, 0);
  selfieImage.value = canvas.toDataURL('image/jpeg', 0.8);
  videoCompare.value.srcObject.getTracks().forEach(t => t.stop());
  isCompareCameraOpen.value = false;
};

const runComparison = async () => {
  if (!docImage.value || !selfieImage.value) return;
  loading.value = true;
  compareResult.value = null;
  try {
    const res = await fetch('/api/biometria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'compare', image1: docImage.value, image2: selfieImage.value })
    });
    compareResult.value = await res.json();
  } catch (e) { alert("Erro na API"); } finally { loading.value = false; }
};

const initMediaPipe = async () => {
  if (!FaceMesh) return;
  if (!faceMesh) {
    faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    faceMesh.onResults(onFaceResults);
  }
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { deviceId: selectedDeviceId.value ? { exact: selectedDeviceId.value } : undefined } 
  });
  videoExtract.value.srcObject = stream;
  cameraExtract = new MediaPipeCamera(videoExtract.value, {
    onFrame: async () => { if (isExtracting.value) await faceMesh.send({ image: videoExtract.value }); },
    width: 640, height: 480
  });
};

const stopExtraction = async () => {
  isExtracting.value = false;
  if (cameraExtract) await cameraExtract.stop();
  if (videoExtract.value?.srcObject) videoExtract.value.srcObject.getTracks().forEach(t => t.stop());
  faceDataJSON.value = null;
  resetChallenges();
};

const toggleExtraction = async () => {
  if (isExtracting.value) await stopExtraction();
  else { isExtracting.value = true; await initMediaPipe(); if (cameraExtract) await cameraExtract.start(); }
};

const onFaceResults = (results) => {
  if (!canvasExtract.value) return;
  const ctx = canvasExtract.value.getContext('2d');
  ctx.save();
  ctx.clearRect(0, 0, canvasExtract.value.width, canvasExtract.value.height);
  ctx.translate(canvasExtract.value.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(results.image, 0, 0, canvasExtract.value.width, canvasExtract.value.height);
  if (results.multiFaceLandmarks?.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    ctx.fillStyle = '#00FF00';
    landmarks.forEach(p => ctx.fillRect(p.x * canvasExtract.value.width, p.y * canvasExtract.value.height, 2, 2));
    
    checkHeadPose(landmarks);

    faceDataJSON.value = {
      timestamp: new Date().toISOString(),
      liveness_complete: challenges.value.every(t => t.done),
      dados_vetoriais: landmarks.map(p => ({ x: p.x.toFixed(4), y: p.y.toFixed(4), z: p.z.toFixed(4) }))
    };
  }
  ctx.restore();
};

const downloadJSON = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(faceDataJSON.value, null, 2));
  const el = document.createElement('a');
  el.setAttribute("href", dataStr); el.setAttribute("download", "biometria_validada.json"); el.click();
};

onUnmounted(() => stopExtraction());
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-200 p-6 flex flex-col items-center font-sans">
    <header class="mb-4 text-center">
      <div class="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl mb-4 shadow-lg">
        <ScanFace :size="32" class="text-white" />
      </div>
      <h1 class="text-3xl font-bold text-white tracking-tight">BioSecure <span class="text-blue-500">Face .v2</span></h1>
      <p class="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Projetado por Pedro Reis</p>
    </header>

    <div class="mb-8 w-full max-w-xs">
      <select v-model="selectedDeviceId" class="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500">
        <option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">{{ device.label || 'Camera' }}</option>
      </select>
    </div>

    <div class="flex p-1 bg-slate-800 rounded-xl mb-8 border border-slate-700">
      <button @click="activeTab = 'compare'" class="px-6 py-2 rounded-lg font-medium text-sm transition-all" :class="activeTab === 'compare' ? 'bg-slate-700 text-white' : 'text-slate-400'">Validação 1:1</button>
      <button @click="activeTab = 'extract'" class="px-6 py-2 rounded-lg font-medium text-sm transition-all" :class="activeTab === 'extract' ? 'bg-slate-700 text-white' : 'text-slate-400'">Extração JSON</button>
    </div>

    <main v-if="activeTab === 'compare'" class="w-full max-w-4xl bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-10">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div class="flex flex-col gap-3 text-center">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Foto Referência</label>
          <div class="h-64 border-2 border-dashed border-slate-600 rounded-2xl bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden" @click="$refs.docInput.click()">
            <input type="file" ref="docInput" class="hidden" accept="image/*" @change="handleDocUpload" />
            <img v-if="docImage" :src="docImage" class="w-full h-full object-contain p-2" />
            <span v-else class="text-slate-600">Upload</span>
          </div>
        </div>
        <div class="flex flex-col gap-3 text-center">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Selfie</label>
          <div class="h-64 bg-black rounded-2xl overflow-hidden relative border border-slate-600 shadow-xl">
             <div v-if="!isCompareCameraOpen && !selfieImage" class="absolute inset-0 flex items-center justify-center">
                <button @click="startCompareCamera" class="bg-blue-600 px-4 py-2 rounded-lg font-bold">Ligar</button>
             </div>
             <video v-show="isCompareCameraOpen" ref="videoCompare" autoplay playsinline class="w-full h-full object-cover scale-x-[-1]"></video>
             <img v-if="selfieImage && !isCompareCameraOpen" :src="selfieImage" class="w-full h-full object-cover scale-x-[-1]" />
             <button v-if="isCompareCameraOpen" @click="takeComparePhoto" class="absolute bottom-4 left-0 right-0 mx-auto w-10 h-10 bg-white rounded-full border-4 border-slate-300"></button>
             <button v-if="selfieImage && !isCompareCameraOpen" @click="startCompareCamera" class="absolute top-2 right-2 p-2 bg-black/50 rounded-full"><RefreshCw :size="14"/></button>
          </div>
        </div>
      </div>
      <div class="mt-8 flex justify-center">
        <button @click="runComparison" :disabled="!docImage || !selfieImage || loading" class="bg-blue-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
          <Activity v-if="loading" class="animate-spin" :size="18" /> {{ loading ? 'Analisando' : 'Validar' }}
        </button>
      </div>
      <div v-if="compareResult" class="mt-8 p-6 rounded-2xl border flex items-center gap-6" :class="compareResult.match ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'">
        <CheckCircle v-if="compareResult.match" class="text-green-500 w-12 h-12" />
        <XCircle v-else class="text-red-500 w-12 h-12" />
        <div>
          <h3 class="text-xl font-bold text-white">{{ compareResult.match ? 'Match' : 'Diferente' }}</h3>
          <p class="text-xs font-mono" :class="compareResult.match ? 'text-green-400' : 'text-red-400'">Score: {{ compareResult.score }}%</p>
        </div>
      </div>
    </main>

    <main v-else class="w-full max-w-5xl bg-slate-800/50 border border-slate-700 rounded-3xl p-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="space-y-6">
          <div class="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] border border-slate-600">
            <video ref="videoExtract" class="hidden" autoplay playsinline></video>
            <canvas ref="canvasExtract" width="640" height="480" class="w-full h-full object-cover"></canvas>
            <div v-if="!isExtracting" class="absolute inset-0 flex items-center justify-center bg-slate-900/80">
               <button @click="toggleExtraction" class="bg-blue-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Camera :size="20" /> Iniciar Scanner</button>
            </div>
          </div>
          
          <div class="space-y-2">
            <h3 class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Checklist de Liveness</h3>
            <div v-for="(task, idx) in challenges" :key="task.id" 
              class="flex items-center gap-3 p-3 rounded-lg border transition-all"
              :class="idx === currentChallengeIndex ? 'bg-blue-500/20 border-blue-500 animate-pulse' : (task.done ? 'bg-green-500/10 border-green-500/50 opacity-60' : 'bg-slate-800 border-slate-700 opacity-40')">
              <CheckCircle :size="16" :class="task.done ? 'text-green-500' : 'text-slate-600'" />
              <span class="text-xs font-medium" :class="task.done ? 'text-green-400' : 'text-slate-300'">{{ task.label }}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between mb-2">
             <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matriz Vetorial</label>
             <button v-if="challenges.every(t => t.done)" @click="downloadJSON" class="text-[10px] bg-green-600 px-3 py-1 rounded text-white flex items-center gap-2">
               <Download :size="12" /> Baixar Biometria
             </button>
          </div>
          <div class="flex-1 bg-black rounded-xl border border-slate-600 p-4 overflow-auto font-mono text-[9px] text-green-500 custom-scrollbar shadow-inner">
            <pre v-if="faceDataJSON">{{ JSON.stringify(faceDataJSON, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
</style>