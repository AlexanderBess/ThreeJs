import { createNoise2D } from 'simplex-noise'

/**
 * @class NoiseGenerator
 * Wraps simplex-noise with fractional Brownian motion (fBm).
 * All terrain height sampling goes through this class.
 */
export class NoiseGenerator {
  /** @type {Function} */
  #noise2D = null

  /**
   * @param {object} params
   * @param {number} params.seed
   * @param {number} params.scale      — spatial scale (higher = smoother/wider)
   * @param {number} params.octaves    — fBm layers
   * @param {number} params.persistence — amplitude decay per octave
   * @param {number} params.lacunarity  — frequency growth per octave
   */
  constructor({
    seed = 42,
    scale = 30,
    octaves = 5,
    persistence = 0.5,
    lacunarity = 2.0,
  } = {}) {
    this.seed = seed
    this.scale = scale
    this.octaves = octaves
    this.persistence = persistence
    this.lacunarity = lacunarity
    this.#rebuild()
  }

  /**
   * Mulberry32 — fast, seedable PRNG.
   * @param {number} seed
   * @returns {Function} random() → [0, 1)
   */
  #createPRNG(seed) {
    let s = seed >>> 0
    return () => {
      s = (s + 0x6d2b79f5) >>> 0
      let t = Math.imul(s ^ (s >>> 15), 1 | s)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
    }
  }

  #rebuild() {
    this.#noise2D = createNoise2D(this.#createPRNG(this.seed))
  }

  /**
   * Sample fBm noise at world position (x, z).
   * @returns {number} value in [-1, 1]
   */
  sample(x, z) {
    let amplitude = 1
    let frequency = 1
    let value = 0
    let maxValue = 0

    for (let i = 0; i < this.octaves; i++) {
      const nx = (x * frequency) / this.scale
      const nz = (z * frequency) / this.scale
      value += this.#noise2D(nx, nz) * amplitude
      maxValue += amplitude
      amplitude *= this.persistence
      frequency *= this.lacunarity
    }

    return value / maxValue // normalised → [-1, 1]
  }

  /**
   * Batch-update params and rebuild noise function.
   * @param {Partial<NoiseGenerator>} params
   */
  update(params) {
    const seedChanged = 'seed' in params && params.seed !== this.seed
    Object.assign(this, params)
    if (seedChanged) this.#rebuild()
  }
}
