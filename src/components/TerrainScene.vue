<template>
  <div class="terrain-scene">
    <canvas ref="canvasRef" class="terrain-scene__canvas" />
    <div v-if="isLoading" class="terrain-scene__loader">
      <span class="terrain-scene__loader-text">Generating terrain…</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TerrainGenerator } from '../utils/TerrainGenerator.js'

const props = defineProps({
  noiseParams: { type: Object, required: true },
  lightingParams: { type: Object, required: true },
})

const canvasRef = ref(null)
const isLoading = ref(true)

/**
 * @class SceneManager
 * Инкапсулирует всю WebGL/Three.js логику.
 * Гарантирует отсутствие утечек памяти и стабильный FPS без лишних аллокаций.
 */
class SceneManager {
  constructor(canvas) {
    this._canvas = canvas
    this._generator = new TerrainGenerator({ size: 100, resolution: 180 })
    this._terrainMesh = null
    this._wireMesh = null
    this._animFrameId = null

    this._tempColor = new THREE.Color()
    this._isUpdatingTerrain = false

    this._onResize = this._handleResize.bind(this)

    this._initRenderer()
    this._initScene()
    this._initCamera()
    this._initMaterials()
    this._initLights()
    this._initControls()
    this._initFog()
    this._startLoop()
    this._handleResize()
    window.addEventListener('resize', this._onResize)
  }

  _initRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: false,
    })
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight, false)
    this._renderer.shadowMap.enabled = true
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping
    this._renderer.toneMappingExposure = 0.9
  }

  _initScene() {
    this._scene = new THREE.Scene()
  }

  _initMaterials() {
    this._solidMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.FrontSide,
    })

    this._wireMat = new THREE.LineBasicMaterial({
      color: 0x00c8e0,
      transparent: true,
      opacity: 0.18,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })

    this._nightSky = new THREE.Color(0x05080f)
    this._daySky = new THREE.Color(0x0a1520)
    this._duskSky = new THREE.Color(0x0d0a18)
  }

  _initCamera() {
    const w = this._canvas.clientWidth
    const h = this._canvas.clientHeight
    this._camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000)
    this._camera.position.set(0, 55, 80)
    this._camera.lookAt(0, 0, 0)
  }

  _initLights() {
    this._ambientLight = new THREE.AmbientLight(0x112233, 0.6)
    this._scene.add(this._ambientLight)

    this._sunLight = new THREE.DirectionalLight(0xffffff, 1.2)
    this._sunLight.position.set(60, 80, 40)
    this._sunLight.castShadow = true
    this._sunLight.shadow.mapSize.set(2048, 2048)
    this._sunLight.shadow.camera.near = 0.5
    this._sunLight.shadow.camera.far = 300
    this._sunLight.shadow.camera.left = -80
    this._sunLight.shadow.camera.right = 80
    this._sunLight.shadow.camera.top = 80
    this._sunLight.shadow.camera.bottom = -80
    this._scene.add(this._sunLight)

    this._hemiLight = new THREE.HemisphereLight(0x1a2a4a, 0x0a0d14, 0.4)
    this._scene.add(this._hemiLight)
  }

  _initControls() {
    this._controls = new OrbitControls(this._camera, this._renderer.domElement)
    this._controls.enableDamping = true
    this._controls.dampingFactor = 0.06
    this._controls.minDistance = 20
    this._controls.maxDistance = 250
    this._controls.maxPolarAngle = Math.PI / 2.1
    this._controls.target.set(0, 0, 0)
  }

  _initFog() {
    this._scene.fog = new THREE.FogExp2(0x05080f, 0.008)
  }

  buildTerrain(noiseParams) {
    if (this._isUpdatingTerrain) return
    this._isUpdatingTerrain = true

    this._removeTerrainGeometry()

    const geometry = this._generator.generate(noiseParams)

    this._terrainMesh = new THREE.Mesh(geometry, this._solidMat)
    this._terrainMesh.receiveShadow = true
    this._terrainMesh.castShadow = true
    this._scene.add(this._terrainMesh)

    const wireGeo = new THREE.WireframeGeometry(geometry)
    this._wireMesh = new THREE.LineSegments(wireGeo, this._wireMat)
    this._scene.add(this._wireMesh)

    this._isUpdatingTerrain = false
  }

  _removeTerrainGeometry() {
    if (this._terrainMesh) {
      this._terrainMesh.geometry.dispose()
      this._scene.remove(this._terrainMesh)
      this._terrainMesh = null
    }
    if (this._wireMesh) {
      this._wireMesh.geometry.dispose()
      this._scene.remove(this._wireMesh)
      this._wireMesh = null
    }
  }

  updateLighting({ timeOfDay = 12, ambientIntensity = 0.5 } = {}) {
    const angle = ((timeOfDay / 24) * Math.PI * 2) - Math.PI * 0.5
    const radius = 120
    this._sunLight.position.set(
        Math.cos(angle) * radius,
        Math.abs(Math.sin(angle)) * radius + 10,
        50,
    )

    const time = Math.max(0, Math.sin((timeOfDay / 24) * Math.PI * 2 - Math.PI * 0.5))

    if (time < 0.5) {
      this._tempColor.copy(this._duskSky).lerp(this._daySky, time * 2)
    } else {
      this._tempColor.copy(this._daySky)
    }

    this._scene.background = this._tempColor
    if (this._scene.fog) this._scene.fog.color.copy(this._tempColor)

    const sunIntensity = Math.max(0, Math.sin((timeOfDay / 24) * Math.PI * 2 - Math.PI * 0.5))
    this._sunLight.intensity = sunIntensity * 1.4 + 0.1

    const isGoldenHour = sunIntensity < 0.35 && sunIntensity > 0.0
    this._sunLight.color.setHex(isGoldenHour ? 0xff9940 : 0xe8eeff)

    this._ambientLight.intensity = ambientIntensity * 0.8 + 0.1
    this._hemiLight.intensity = 0.2 + sunIntensity * 0.3
  }

  _startLoop() {
    const tick = () => {
      this._animFrameId = requestAnimationFrame(tick)
      this._controls.update()
      this._renderer.render(this._scene, this._camera)
    }
    tick()
  }

  _handleResize() {
    const width = this._canvas.clientWidth
    const height = this._canvas.clientHeight

    this._renderer.setSize(width, height, false)
    this._camera.aspect = width / height
    this._camera.updateProjectionMatrix()
  }

  dispose() {
    cancelAnimationFrame(this._animFrameId)
    window.removeEventListener('resize', this._onResize)
    this._controls.dispose()
    this._removeTerrainGeometry()

    this._solidMat.dispose()
    this._wireMat.dispose()
    this._renderer.dispose()
  }
}

let sceneManagerInstance = null

onMounted(() => {
  sceneManagerInstance = new SceneManager(canvasRef.value)
  sceneManagerInstance.buildTerrain(props.noiseParams)
  sceneManagerInstance.updateLighting(props.lightingParams)
  isLoading.value = false
})

onBeforeUnmount(() => {
  sceneManagerInstance?.dispose()
  sceneManagerInstance = null
})

let watchFrameId = null
watch(
    () => props.noiseParams,
    (val) => {
      if (!sceneManagerInstance) return
      isLoading.value = true
      if (watchFrameId) cancelAnimationFrame(watchFrameId)

      watchFrameId = requestAnimationFrame(() => {
        sceneManagerInstance.buildTerrain({ ...val })
        isLoading.value = false
        watchFrameId = null
      })
    },
    { deep: true },
)

watch(
    () => props.lightingParams,
    (val) => { sceneManagerInstance?.updateLighting({ ...val }) },
    { deep: true },
)
</script>

<style scoped>
.terrain-scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.terrain-scene__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.terrain-scene__loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 8, 15, 0.65);
  backdrop-filter: blur(4px);
  pointer-events: auto;
}

.terrain-scene__loader-text {
  color: #00e5ff;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  animation: terrain-scene__pulse 1.2s ease-in-out infinite;
}

@keyframes terrain-scene__pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}
</style>