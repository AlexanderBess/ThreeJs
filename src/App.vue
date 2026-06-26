<template>
  <div class="app">
    <div class="app__scene">
      <TerrainScene
        :noiseParams="noiseParams"
        :lightingParams="lightingParams"
      />
    </div>

    <ControlPanel
      class="app__panel"
      :noise="noiseParams"
      :lighting="lightingParams"
      @update:noise="Object.assign(noiseParams, $event)"
      @update:lighting="Object.assign(lightingParams, $event)"
    />

    <!-- HUD badge -->
    <footer class="app__hud">
      <span class="app__hud-text">Vue 3 + Three.js — Procedural Terrain</span>
    </footer>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import TerrainScene from './components/TerrainScene.vue'
import ControlPanel from './components/ControlPanel.vue'

// ─── Shared reactive state ───────────────────────────────────────────────────

const noiseParams = reactive({
  scale:       30,
  octaves:     5,
  amplitude:   18,
  persistence: 0.5,
  lacunarity:  2.0,
  seed:        42,
  waterLevel:  -0.1,
  colorPreset: 'tech',
})

const lightingParams = reactive({
  timeOfDay:        12,
  ambientIntensity: 0.4,
})
</script>

<style scoped>
.app {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app__scene {
  position: absolute;
  inset: 0;
}

/* ControlPanel already positions itself absolutely inside */
.app__panel {
  /* positioning handled inside the component */
}

.app__hud {
  position: absolute;
  bottom: 16px;
  left: 20px;
  pointer-events: none;
}

.app__hud-text {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(0, 200, 224, 0.35);
}
</style>
