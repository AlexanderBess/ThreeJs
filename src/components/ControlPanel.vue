<template>
  <aside :class="['control-panel', { 'control-panel--collapsed': collapsed }]">
    <header class="control-panel__header">
      <button
          class="control-panel__toggle"
          :aria-label="collapsed ? 'Expand panel' : 'Collapse panel'"
          @click="collapsed = !collapsed"
      >
        {{ collapsed ? '◀' : '▶' }}
      </button>
      <span class="control-panel__title">TERRAIN CONTROLS</span>
    </header>

    <div class="control-panel__body">
      <section class="control-panel__section">
        <h3 class="control-panel__section-title">
          <span class="control-panel__section-icon">◈</span> Noise
        </h3>

        <div class="control-panel__row" v-for="ctrl in allNoiseControls" :key="ctrl.key">
          <label class="control-panel__label" :for="`${uid}-${ctrl.key}`">
            {{ ctrl.label }}
          </label>
          <div class="control-panel__slider-wrap">
            <input
                :id="`${uid}-${ctrl.key}`"
                class="control-panel__slider"
                type="range"
                :min="ctrl.min"
                :max="ctrl.max"
                :step="ctrl.step"
                :value="noise[ctrl.key]"
                @input="onNoiseInput(ctrl.key, $event)"
            />
            <span class="control-panel__value">
              {{ fmt(noise[ctrl.key], ctrl.decimals) }}
            </span>
          </div>
        </div>

        <button class="control-panel__btn" @click="rollSeed">⟳ Random seed</button>
      </section>

      <section class="control-panel__section">
        <h3 class="control-panel__section-title">
          <span class="control-panel__section-icon">◈</span> Biomes
        </h3>

        <div class="control-panel__row">
          <label class="control-panel__label" :for="`${uid}-waterLevel`">Water level</label>
          <div class="control-panel__slider-wrap">
            <input
                :id="`${uid}-waterLevel`"
                class="control-panel__slider"
                type="range"
                min="-0.6"
                max="0.4"
                step="0.01"
                :value="noise.waterLevel"
                @input="onNoiseInput('waterLevel', $event)"
            />
            <span class="control-panel__value">{{ fmt(noise.waterLevel, 2) }}</span>
          </div>
        </div>

        <div class="control-panel__preset-list">
          <button
              v-for="preset in colorPresets"
              :key="preset.key"
              :class="[
              'control-panel__preset-btn',
              { 'control-panel__preset-btn--active': noise.colorPreset === preset.key }
            ]"
              @click="onPresetClick(preset.key)"
          >
            <span
                class="control-panel__preset-swatch"
                :style="{ background: preset.gradient }"
            />
            {{ preset.label }}
          </button>
        </div>
      </section>

      <section class="control-panel__section">
        <h3 class="control-panel__section-title">
          <span class="control-panel__section-icon">◈</span> Lighting
        </h3>

        <div class="control-panel__row">
          <label class="control-panel__label" :for="`${uid}-timeOfDay`">Time of day</label>
          <div class="control-panel__slider-wrap">
            <input
                :id="`${uid}-timeOfDay`"
                class="control-panel__slider"
                type="range"
                min="0"
                max="24"
                step="0.1"
                :value="lighting.timeOfDay"
                @input="onLightingInput('timeOfDay', $event)"
            />
            <span class="control-panel__value">{{ formatTime(lighting.timeOfDay) }}</span>
          </div>
        </div>

        <div class="control-panel__row">
          <label class="control-panel__label" :for="`${uid}-ambientIntensity`">Ambient</label>
          <div class="control-panel__slider-wrap">
            <input
                :id="`${uid}-ambientIntensity`"
                class="control-panel__slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="lighting.ambientIntensity"
                @input="onLightingInput('ambientIntensity', $event)"
            />
            <span class="control-panel__value">{{ fmt(lighting.ambientIntensity, 2) }}</span>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, useId } from 'vue'

const props = defineProps({
  noise:    { type: Object, required: true },
  lighting: { type: Object, required: true },
})

const emit = defineEmits(['update:noise', 'update:lighting'])

const collapsed = ref(false)
const uid = useId()

const allNoiseControls = [
  { key: 'scale',       label: 'Scale',       min: 5,   max: 100,  step: 1,    decimals: 0 },
  { key: 'octaves',     label: 'Octaves',     min: 1,   max: 10,   step: 1,    decimals: 0 },
  { key: 'amplitude',   label: 'Amplitude',   min: 2,   max: 40,   step: 0.5,  decimals: 1 },
  { key: 'persistence', label: 'Persistence', min: 0.1, max: 0.9,  step: 0.01, decimals: 2 },
  { key: 'lacunarity',  label: 'Lacunarity',  min: 1.2, max: 4.0,  step: 0.05, decimals: 2 },
  { key: 'seed',        label: 'Seed',        min: 0,   max: 999,  step: 1,    decimals: 0 },
]

const colorPresets = [
  { key: 'tech', label: 'Tech', gradient: 'linear-gradient(to right, #020a14, #071a38, #0d2f55, #1a3d28, #00e5ff)' },
  { key: 'natural', label: 'Natural', gradient: 'linear-gradient(to right, #04162e, #2a7dd8, #d4b483, #3a7a2a, #e8e8e8)' },
  { key: 'desert', label: 'Desert', gradient: 'linear-gradient(to right, #12090a, #c8a870, #b5651d, #8b3a1a, #5c2a0a)' },
  { key: 'ice', label: 'Ice', gradient: 'linear-gradient(to right, #020d18, #063854, #4a9aba, #c8eaf5, #ffffff)' },
]

let noiseFrameId = null
function emitNoiseUpdate(updatedFields) {
  if (noiseFrameId) cancelAnimationFrame(noiseFrameId)

  noiseFrameId = requestAnimationFrame(() => {
    emit('update:noise', Object.assign({}, props.noise, updatedFields))
  })
}

let lightingFrameId = null
function emitLightingUpdate(updatedFields) {
  if (lightingFrameId) cancelAnimationFrame(lightingFrameId)

  lightingFrameId = requestAnimationFrame(() => {
    emit('update:lighting', Object.assign({}, props.lighting, updatedFields))
  })
}

function onNoiseInput(key, event) {
  const raw = event.target.value
  const val = ['seed', 'octaves'].includes(key) ? parseInt(raw, 10) : parseFloat(raw)
  emitNoiseUpdate({ [key]: val })
}

function onLightingInput(key, event) {
  const val = parseFloat(event.target.value)
  emitLightingUpdate({ [key]: val })
}

function onPresetClick(key) {
  emit('update:noise', Object.assign({}, props.noise, { colorPreset: key }))
}

function rollSeed() {
  emit('update:noise', Object.assign({}, props.noise, { seed: Math.floor(Math.random() * 1000) }))
}

function fmt(val, decimals = 0) {
  return Number(val).toFixed(decimals)
}

function formatTime(val) {
  const h = Math.floor(val)
  const m = Math.floor((val - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
</script>

<style scoped>
.control-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: rgba(4, 10, 22, 0.88);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(0, 200, 224, 0.15);
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  color: #a0b8c8;
  transition: transform 0.3s ease;
  overflow: hidden;
  z-index: 10;
}

.control-panel--collapsed {
  transform: translateX(calc(100% - 40px));
}

.control-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 200, 224, 0.12);
  flex-shrink: 0;
}

.control-panel__title {
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  color: #00e5ff;
  text-transform: uppercase;
}

.control-panel__toggle {
  background: none;
  border: 1px solid rgba(0, 200, 224, 0.25);
  color: #00c8e0;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, color 0.2s;
}

.control-panel__toggle:hover {
  border-color: #00e5ff;
  color: #00e5ff;
}

.control-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 24px;
}

.control-panel__section {
  padding: 12px 16px 16px;
  border-bottom: 1px solid rgba(0, 200, 224, 0.06);
}

.control-panel__section-title {
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  color: #4a8fa8;
  text-transform: uppercase;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-panel__section-icon {
  color: #00c8e0;
}

.control-panel__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.control-panel__label {
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: #6a8a9a;
  text-transform: uppercase;
}

.control-panel__slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-panel__slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 2px;
  background: rgba(0, 200, 224, 0.15);
  outline: none;
  cursor: pointer;
  border-radius: 1px;
}

.control-panel__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #00c8e0;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(0, 200, 224, 0.6);
  cursor: pointer;
  transition: transform 0.15s;
}

.control-panel__slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

.control-panel__slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #00c8e0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.control-panel__value {
  font-size: 0.65rem;
  color: #00e5ff;
  min-width: 36px;
  text-align: right;
  letter-spacing: 0.05em;
}

.control-panel__btn {
  width: 100%;
  margin-top: 4px;
  padding: 6px 0;
  background: rgba(0, 200, 224, 0.08);
  border: 1px solid rgba(0, 200, 224, 0.2);
  color: #00c8e0;
  font-family: inherit;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.control-panel__btn:hover {
  background: rgba(0, 200, 224, 0.16);
  border-color: #00e5ff;
}

.control-panel__preset-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
}

.control-panel__preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 7px 6px;
  background: rgba(0, 200, 224, 0.05);
  border: 1px solid rgba(0, 200, 224, 0.12);
  color: #6a8a9a;
  font-family: inherit;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.control-panel__preset-btn:hover {
  border-color: rgba(0, 200, 224, 0.35);
  color: #a0c8d8;
}

.control-panel__preset-btn--active {
  border-color: #00c8e0;
  color: #00e5ff;
  background: rgba(0, 200, 224, 0.12);
}

.control-panel__preset-swatch {
  display: block;
  width: 100%;
  height: 6px;
  border-radius: 1px;
}

.control-panel::-webkit-scrollbar,
.control-panel__body::-webkit-scrollbar {
  width: 3px;
}
.control-panel__body::-webkit-scrollbar-track {
  background: transparent;
}
.control-panel__body::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 224, 0.2);
  border-radius: 2px;
}
</style>
