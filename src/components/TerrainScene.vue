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
 * Encapsulates all Three.js scene logic.
 * Instantiated once after mount; destroyed on unmount.
 */
class SceneManager {
  constructor(canvas) {
    this._canvas = canvas
    this._generator = new TerrainGenerator({ size: 100, resolution: 180 })
    this._terrainMesh = null
    this._wireMesh = null
    this._animFrameId = null

    this._onResize = this._handleResize.bind(this)

    this._initRenderer()
    this._initScene()
    this._initCamera()
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
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight)
    this._renderer.shadowMap.enabled = true
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping
    this._renderer.toneMappingExposure = 0.9
  }

  _initScene() {
    this._scene = new THREE.Scene()
    this._scene.background = new THREE.Color(0x05080f)
  }

  _initCamera() {
    const w = this._canvas.clientWidth
    const h = this._canvas.clientHeight
    this._camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000)
    this._camera.position.set(0, 55, 80)
    this._camera.lookAt(0, 0, 0)
  }

  _initLights() {
    // Ambient
    this._ambientLight = new THREE.AmbientLight(0x112233, 0.6)
    this._scene.add(this._ambientLight)

    // Sun (directional)
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

    // Hemisphere
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
    this._removeTerrain()

    const geometry = this._generator.generate(noiseParams)

    // Solid mesh — vertex colours
    const solidMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.FrontSide,
    })
    this._terrainMesh = new THREE.Mesh(geometry, solidMat)
    this._terrainMesh.receiveShadow = true
    this._terrainMesh.castShadow = true
    this._scene.add(this._terrainMesh)

    // Wireframe overlay
    const wireGeo = new THREE.WireframeGeometry(geometry)
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00c8e0,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
    this._wireMesh = new THREE.LineSegments(wireGeo, wireMat)
    this._scene.add(this._wireMesh)
  }

  _removeTerrain() {
    if (this._terrainMesh) {
      this._terrainMesh.geometry.dispose()
      this._terrainMesh.material.dispose()
      this._scene.remove(this._terrainMesh)
      this._terrainMesh = null
    }
    if (this._wireMesh) {
      this._wireMesh.geometry.dispose()
      this._wireMesh.material.dispose()
      this._scene.remove(this._wireMesh)
      this._wireMesh = null
    }
  }

  /**
   * Update sun position + colours based on timeOfDay [0, 24] and ambient intensity.
   */
  updateLighting({ timeOfDay = 12, ambientIntensity = 0.5 } = {}) {
    // Map [0,24] → angle around the horizon
    const angle = ((timeOfDay / 24) * Math.PI * 2) - Math.PI * 0.5
    const radius = 120
    this._sunLight.position.set(
      Math.cos(angle) * radius,
      Math.abs(Math.sin(angle)) * radius + 10,
      50,
    )

    // Night/day colour palette
    const t = Math.max(0, Math.sin((timeOfDay / 24) * Math.PI * 2 - Math.PI * 0.5))

    const nightSky = new THREE.Color(0x05080f)
    const daySky   = new THREE.Color(0x0a1520)
    const duskSky  = new THREE.Color(0x0d0a18)

    let skyColor
    if (t < 0.5) {
      skyColor = duskSky.clone().lerp(daySky, t * 2)
    } else {
      skyColor = daySky
    }
    this._scene.background = skyColor
    if (this._scene.fog) this._scene.fog.color.copy(skyColor)

    // Sun colour: night→cool, dawn/dusk→orange, day→white
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
    const w = this._canvas.clientWidth
    const h = this._canvas.clientHeight
    this._renderer.setSize(w, h)
    this._camera.aspect = w / h
    this._camera.updateProjectionMatrix()
  }

  dispose() {
    cancelAnimationFrame(this._animFrameId)
    window.removeEventListener('resize', this._onResize)
    this._controls.dispose()
    this._removeTerrain()
    this._renderer.dispose()
  }
}

let _sceneManager = null

onMounted(() => {
  _sceneManager = new SceneManager(canvasRef.value)
  _sceneManager.buildTerrain(props.noiseParams)
  _sceneManager.updateLighting(props.lightingParams)
  isLoading.value = false
})

onBeforeUnmount(() => {
  _sceneManager?.dispose()
  _sceneManager = null
})

watch(
  () => props.noiseParams,
  (val) => {
    if (!_sceneManager) return
    isLoading.value = true
    setTimeout(() => {
      _sceneManager.buildTerrain({ ...val })
      isLoading.value = false
    }, 20)
  },
  { deep: true },
)

watch(
  () => props.lightingParams,
  (val) => { _sceneManager?.updateLighting({ ...val }) },
  { deep: true },
)
</script>

<style scoped>
.terrain-scene {
  position: relative;
  width: 100%;
  height: 100%;
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
  pointer-events: none;
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
