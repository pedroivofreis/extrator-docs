<script setup lang="ts">
import { ref, onMounted, onUnmounted, toRaw } from 'vue'
import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors } from '@mediapipe/drawing_utils'
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh'

// Eventos que esse componente manda para o pai
const emit = defineEmits(['close', 'capture'])

// Referências aos elementos do HTML
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Estados da tela
const dialog = ref(true)
const isFaceDetected = ref(false)
const isLoading = ref(true)

// Variáveis internas (não reativas)
let camera: Camera | null = null
let faceMesh: FaceMesh | null = null
let lastFaceGeometry: any = null // Aqui guardamos o JSON do rosto

// 1. Função que roda a cada frame do vídeo
const onResults = (results: any) => {
  isLoading.value = false
  const canvasCtx = canvasRef.value?.getContext('2d')
  if (!canvasCtx || !canvasRef.value) return

  // Limpa e desenha a foto do vídeo no canvas
  canvasCtx.save()
  canvasCtx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  canvasCtx.drawImage(results.image, 0, 0, canvasRef.value.width, canvasRef.value.height)

  // Se achou um rosto...
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    isFaceDetected.value = true
    
    // GUARDA O JSON (Os 468 pontos do rosto)
    lastFaceGeometry = results.multiFaceLandmarks[0]

    // Desenha a malha visual (linhas brancas no rosto)
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 })
    }
  } else {
    isFaceDetected.value = false
    lastFaceGeometry = null
  }
  canvasCtx.restore()
}

// 2. Inicializa o MediaPipe
const initMediaPipe = () => {
  if (!videoRef.value) return

  faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }});

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(onResults);

  // Configura a câmera
  camera = new Camera(videoRef.value, {
    onFrame: async () => {
      if (faceMesh && videoRef.value) {
        await faceMesh.send({image: videoRef.value});
      }
    },
    width: 640,
    height: 480
  });

  camera.start();
}

// 3. Captura e Salva
const capturePhoto = () => {
  if (!canvasRef.value) return

  // Gera a FOTO (Base64)
  const imageBase64 = canvasRef.value.toDataURL('image/jpeg', 0.8)

  // Pega o JSON cru (sem proxy do Vue)
  const geometryJSON = lastFaceGeometry ? toRaw(lastFaceGeometry) : null

  // Manda tudo pro pai
  emit('capture', {
    photo: imageBase64,
    biometrics: geometryJSON
  })

  closeModal()
}

const closeModal = () => {
  if (camera) camera.stop()
  dialog.value = false
  emit('close')
}

// Ciclo de vida do componente
onMounted(() => {
  initMediaPipe()
})

onUnmounted(() => {
  if (camera) camera.stop()
})
</script>

<template>
  <VDialog v-model="dialog" persistent max-width="700px">
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center">
        Cadastrar Biometria Facial
        <VBtn icon="ri-close-line" variant="text" @click="closeModal" />
      </VCardTitle>

      <VCardText class="text-center">
        <div v-if="isLoading" class="d-flex justify-center align-center py-10">
           <VProgressCircular indeterminate color="primary" />
           <span class="ml-2">Iniciando câmera...</span>
        </div>

        <div class="video-container" v-show="!isLoading">
           <video ref="videoRef" class="input_video" style="display: none;"></video>
           <canvas ref="canvasRef" width="640" height="480" class="output_canvas"></canvas>
        </div>

        <VAlert v-if="!isFaceDetected && !isLoading" type="warning" variant="tonal" class="mt-4">
          Nenhum rosto detectado. Posicione-se em frente à câmera.
        </VAlert>
        <VAlert v-else-if="!isLoading" type="success" variant="tonal" class="mt-4">
          Rosto detectado! Pronto para cadastrar.
        </VAlert>

      </VCardText>

      <VCardActions class="justify-end pa-4">
        <VBtn variant="outlined" color="secondary" @click="closeModal">Cancelar</VBtn>
        <VBtn 
          color="primary" 
          variant="elevated" 
          prepend-icon="ri-camera-lens-line"
          :disabled="!isFaceDetected" 
          @click="capturePhoto"
        >
          Salvar Cadastro
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.output_canvas {
  width: 100%;
  max-width: 640px;
  border-radius: 12px;
  border: 2px solid #ddd;
}
.video-container {
    position: relative;
    display: flex;
    justify-content: center;
}
</style>