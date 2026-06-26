import * as THREE from 'three'
import { NoiseGenerator } from './NoiseGenerator.js'

/**
 * Each preset is an array of { height: number[-1..1], hex: string } stops.
 * Colours are linearly interpolated between stops.
 */
export const COLOR_PRESETS = {
  tech: [
    { height: -1.00, hex: 0x020a14 }, // abyss
    { height: -0.25, hex: 0x071a38 }, // deep ocean
    { height:  0.00, hex: 0x0d2f55 }, // shore
    { height:  0.08, hex: 0x1a3d28 }, // low ground
    { height:  0.35, hex: 0x0f2a1a }, // mid
    { height:  0.65, hex: 0x1a1a1a }, // rock
    { height:  1.00, hex: 0x00e5ff }, // peak — cyan highlight
  ],
  natural: [
    { height: -1.00, hex: 0x04162e },
    { height: -0.20, hex: 0x1b4f8a },
    { height:  0.00, hex: 0x2a7dd8 },
    { height:  0.05, hex: 0xd4b483 }, // sand
    { height:  0.20, hex: 0x3a7a2a }, // grass
    { height:  0.55, hex: 0x1e4a12 }, // forest
    { height:  0.75, hex: 0x6b5a4a }, // rock
    { height:  1.00, hex: 0xe8e8e8 }, // snow
  ],
  desert: [
    { height: -1.00, hex: 0x12090a },
    { height: -0.10, hex: 0x8b4513 },
    { height:  0.10, hex: 0xc8a870 }, // sand
    { height:  0.40, hex: 0xb5651d }, // dunes
    { height:  0.70, hex: 0x8b3a1a }, // canyon
    { height:  1.00, hex: 0x5c2a0a }, // ridge
  ],
  ice: [
    { height: -1.00, hex: 0x020d18 },
    { height: -0.30, hex: 0x063854 },
    { height:  0.00, hex: 0x4a9aba }, // ice shelf
    { height:  0.20, hex: 0x89cfe0 }, // glacier
    { height:  0.55, hex: 0xc8eaf5 }, // snowfield
    { height:  1.00, hex: 0xffffff }, // peak
  ],
}

/**
 * @class TerrainGenerator
 * Produces a Three.js BufferGeometry (PlaneGeometry) displaced by fBm noise,
 * with per-vertex biome colours.
 */
export class TerrainGenerator {
  /**
   * @param {object} opts
   * @param {number} opts.size           — world units (width & depth)
   * @param {number} opts.resolution     — segments per side
   * @param {number} opts.amplitude      — max vertical displacement
   */
  constructor({ size = 100, resolution = 180, amplitude = 18 } = {}) {
    this.size = size
    this.resolution = resolution
    this.amplitude = amplitude
    this._noise = new NoiseGenerator()
  }

  /**
   * Linearly interpolate a colour from a sorted stops array.
   * @param {number} h  height in [-1, 1]
   * @param {Array}  stops
   * @returns {THREE.Color}
   */
  #sampleBiome(h, stops) {
    if (h <= stops[0].height) return new THREE.Color(stops[0].hex)
    if (h >= stops[stops.length - 1].height)
      return new THREE.Color(stops[stops.length - 1].hex)

    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]
      const b = stops[i + 1]
      if (h >= a.height && h <= b.height) {
        const t = (h - a.height) / (b.height - a.height)
        return new THREE.Color(a.hex).lerp(new THREE.Color(b.hex), t)
      }
    }
    return new THREE.Color(0xffffff)
  }

  /**
   * Build (or rebuild) geometry with given noise + biome params.
   * @param {object} params
   * @param {number} params.scale
   * @param {number} params.octaves
   * @param {number} params.persistence
   * @param {number} params.lacunarity
   * @param {number} params.seed
   * @param {number} params.amplitude
   * @param {string} params.colorPreset  — key of COLOR_PRESETS
   * @param {number} params.waterLevel   — height threshold [-1, 1] below which terrain is flat water
   * @returns {THREE.BufferGeometry}
   */
  generate({
    scale = 30,
    octaves = 5,
    persistence = 0.5,
    lacunarity = 2.0,
    seed = 42,
    amplitude = 18,
    colorPreset = 'tech',
    waterLevel = -0.1,
  } = {}) {
    this._noise.update({ scale, octaves, persistence, lacunarity, seed })
    this.amplitude = amplitude

    const stops = COLOR_PRESETS[colorPreset] ?? COLOR_PRESETS.tech

    const geometry = new THREE.PlaneGeometry(
      this.size, this.size,
      this.resolution, this.resolution,
    )
    geometry.rotateX(-Math.PI / 2)

    const pos = geometry.attributes.position
    const count = pos.count
    const colorArr = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      let h = this._noise.sample(x, z) // [-1, 1]
      const isWater = h < waterLevel

      // Flatten water surface
      const y = isWater ? waterLevel * this.amplitude : h * this.amplitude
      pos.setY(i, y)

      // Vertex colour
      const col = this.#sampleBiome(isWater ? waterLevel : h, stops)
      colorArr[i * 3]     = col.r
      colorArr[i * 3 + 1] = col.g
      colorArr[i * 3 + 2] = col.b
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colorArr, 3))
    geometry.computeVertexNormals()
    pos.needsUpdate = true

    return geometry
  }
}
