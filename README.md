# 🌍 Procedural Terrain Generator

> Interactive 3D procedural landscape built with **Vue 3** and **Three.js** — featuring a wireframe/technical aesthetic, real-time noise controls, biome presets, and dynamic day/night lighting.

![Vue 3](https://img.shields.io/badge/Vue-3.4-42b883?style=flat-square&logo=vue.js)
![Three.js](https://img.shields.io/badge/Three.js-r165-white?style=flat-square&logo=three.js&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

- **Procedural generation** via fractional Brownian motion (fBm) over Simplex noise
- **Wireframe overlay** — technical/cyberpunk aesthetic with a cyan grid
- **4 biome colour presets** — Tech, Natural, Desert, Ice
- **Real-time controls** — all parameters update the terrain live
- **Dynamic lighting** — sun position, colour and sky change with time-of-day slider
- **OrbitControls** — rotate, zoom and pan the scene freely
- **Collapsible sidebar** — BEM-structured control panel

---

## 🎮 Controls

| Parameter | Description |
|---|---|
| **Scale** | Spatial frequency of the terrain — higher = wider, smoother hills |
| **Octaves** | fBm layers — more octaves add fine surface detail |
| **Amplitude** | Vertical height of terrain peaks |
| **Persistence** | Amplitude decay per octave — lower = smoother |
| **Lacunarity** | Frequency growth per octave — higher = more jagged |
| **Seed** | Deterministic seed for the PRNG — same seed = same terrain |
| **Water level** | Height threshold below which terrain is flattened as water |
| **Time of day** | Sun angle, sky colour and light intensity (golden hour at dawn/dusk) |
| **Ambient** | Overall ambient light fill |

---

## 🗂 Project Structure

```
src/
├── utils/
│   ├── NoiseGenerator.js     # fBm over Simplex noise (seeded Mulberry32 PRNG)
│   └── TerrainGenerator.js   # Three.js BufferGeometry + per-vertex biome colours
├── components/
│   ├── TerrainScene.vue      # Three.js canvas — SceneManager OOP class inside
│   └── ControlPanel.vue      # BEM sidebar — Noise / Biomes / Lighting sections
└── App.vue                   # Reactive state, composes Scene + Panel
```

### Architecture notes

- **`NoiseGenerator`** — pure class, no Three.js dependency. Owns the seeded PRNG and fBm loop. Call `update(params)` to hot-swap any parameter; seed change triggers an internal `#rebuild()`.
- **`TerrainGenerator`** — owns `NoiseGenerator`, builds a `PlaneGeometry`, displaces vertices with fBm height and writes per-vertex RGB colours from a biome stop gradient.
- **`SceneManager`** (private class inside `TerrainScene.vue`) — encapsulates renderer, camera, lights, OrbitControls and the render loop. Exposed only via `buildTerrain()` / `updateLighting()` / `dispose()`.
- **CSS** follows strict **BEM** — `block__element--modifier` throughout. No utility-class frameworks.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build
```

---

## 🛠 Tech Stack

| | |
|---|---|
| **Vue 3** | Composition API, `reactive`, `watch`, `defineProps/Emits` |
| **Three.js r165** | WebGLRenderer, PlaneGeometry, MeshStandardMaterial, WireframeGeometry, DirectionalLight, OrbitControls |
| **simplex-noise 4** | ES-module Simplex noise with custom seeded PRNG |
| **Vite 5** | Dev server + production bundler |

---

## 📸 Presets Preview

| Tech | Natural | Desert | Ice |
|:---:|:---:|:---:|:---:|
| Dark blues, cyan peaks | Grass, water, snow | Sand, canyon, ridges | Glaciers, snowfields |

---

## 📄 License

MIT
