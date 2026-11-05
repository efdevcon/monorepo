// Shared pieces for the pixel-art backgrounds: a seeded RNG, colour helpers,
// a small raster for baking static layers, and a base class that owns a
// low-resolution canvas (180 rows, scaled up pixelated) behind the monitor.

import type { Background, Context, Tint } from './types'

export type RGB = [number, number, number]

export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const css = (c: RGB, a = 1) => `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${a})`

/** mulberry32: a tiny seeded PRNG, so every visit draws the same scene. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable pseudo-random 0..1 for an integer pair (window flicker and the like). */
export const hash = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h ^= h >>> 13
  h = Math.imul(h, 0x27d4eb2d)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

// 4×4 ordered dither, for banded gradients that read as pixel art.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]

/** An RGBA buffer for baking a static layer pixel by pixel; transparent until drawn. */
export class Raster {
  readonly img: ImageData
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.img = new ImageData(w, h)
  }
  set(x: number, y: number, c: RGB, a = 255) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = (y * this.w + x) * 4
    const d = this.img.data
    d[i] = c[0]
    d[i + 1] = c[1]
    d[i + 2] = c[2]
    d[i + 3] = a
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }
  /** A vertical gradient through `stops`, dithered between neighbouring stops. */
  gradient(x0: number, y0: number, w: number, h: number, stops: RGB[]) {
    for (let y = 0; y < h; y++) {
      const f = (y / Math.max(1, h - 1)) * (stops.length - 1)
      const i = Math.min(stops.length - 2, Math.floor(f))
      const fr = f - i
      for (let x = 0; x < w; x++) this.set(x0 + x, y0 + y, fr > bayer(x0 + x, y0 + y) ? stops[i + 1] : stops[i])
    }
  }
  canvas(): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = this.w
    c.height = this.h
    c.getContext('2d')!.putImageData(this.img, 0, 0)
    return c
  }
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

const ROWS = 180
const FPS = 12

/**
 * A pixel-art background. Subclasses bake static layers in build() (when the
 * viewport or the monitor's place changes) and draw the moving parts in draw().
 */
export abstract class PixelScene implements Background {
  abstract readonly name: string
  el: HTMLCanvasElement | null = null
  protected ctx!: CanvasRenderingContext2D
  protected W = 0
  protected readonly H = ROWS
  /** The monitor's case, in canvas pixels. */
  protected mon: Box = { x: 0, y: 0, w: 0, h: 0 }
  protected tint: Tint = [0.26, 1, 0.45]
  protected glow = 0
  private layoutKey = ''
  private lastDraw = 0
  private t0 = performance.now()

  constructor(protected readonly cx: Context) {}

  protected abstract build(): void
  protected abstract draw(t: number): void

  mount() {
    const c = document.createElement('canvas')
    c.className = 'bg-canvas'
    c.setAttribute('aria-hidden', 'true')
    // Appended, so a scene fading in paints over the one it replaces.
    document.body.append(c)
    this.el = c
    this.ctx = c.getContext('2d')!
    this.render(performance.now())
  }

  unmount() {
    this.el?.remove()
    this.el = null
    this.layoutKey = ''
  }

  setGlow(tint: Tint, level: number) {
    this.tint = tint
    this.glow = level
    this.still()
  }

  onLisbon(_instant: boolean) {}
  reset() {}

  frame(now: number) {
    if (!this.el || this.cx.reduced || now - this.lastDraw < 1000 / FPS) return
    this.render(now)
  }

  /** Reduced motion draws one frame per change instead of a loop. */
  protected still() {
    if (this.el && this.cx.reduced) this.render(performance.now())
  }

  private render(now: number) {
    const el = this.el!
    const W = Math.max(1, Math.round((ROWS * innerWidth) / Math.max(1, innerHeight)))
    const px = innerHeight / ROWS
    const r = this.cx.monitor.getBoundingClientRect()
    this.mon = { x: Math.round(r.left / px), y: Math.round(r.top / px), w: Math.round(r.width / px), h: Math.round(r.height / px) }
    const key = `${W}:${this.mon.x}:${this.mon.y}:${this.mon.w}:${this.mon.h}`
    if (key !== this.layoutKey) {
      this.layoutKey = key
      this.W = W
      el.width = W
      el.height = ROWS
      this.build()
    }
    this.lastDraw = now
    this.draw(this.cx.reduced ? 0 : (now - this.t0) / 1000)
  }

  /** The CRT's light pooling on a surface at row `y` under the monitor. */
  protected spill(y: number, depth: number, strength: number) {
    if (this.glow <= 0) return
    const ctx = this.ctx
    const cxp = this.mon.x + this.mon.w / 2
    const g = ctx.createRadialGradient(cxp, y, 0, cxp, y, this.mon.w * 0.6)
    const [r, gg, b] = this.tint.map((v) => Math.round(v * 255))
    g.addColorStop(0, `rgb(${r} ${gg} ${b} / ${0.32 * strength * this.glow})`)
    g.addColorStop(1, `rgb(${r} ${gg} ${b} / 0)`)
    ctx.fillStyle = g
    ctx.fillRect(this.mon.x - this.mon.w * 0.3, y, this.mon.w * 1.6, depth)
  }
}
