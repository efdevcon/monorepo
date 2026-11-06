// Background 4: Y2K, after the optimistic millennium CGI of c. 1997–2004 (an
// original scene; no logos or copied artwork). Unlike the pixel scenes it's
// smooth: a canvas at the viewport's size (DPR capped at 1.5). A pale icy
// field with a faint lens band and a perspective grid to a low horizon; chrome
// metaballs drifting in the margins beside the monitor (never behind it),
// merging when they touch, on a seamless 15 s loop at ≤ 15 fps, with a light
// sweep every 7.5 s; a few translucent lime blobs for accent. When Lisbon's OK
// lands the lime warms to sunset orange and one chrome blob stretches briefly
// into a slim arch (the bridge). Darker round the monitor so the screen leads.
//
// The metaballs: each blob is two or three balls orbiting its centre; the
// field f = Σ r²/d² is summed per pixel on a third-resolution buffer, only in
// the blobs' bounding boxes, and the surface is where f ≥ 1. Its normal comes
// from the field's gradient (in-plane direction) and from f itself (a lone
// ball's f = r²/d², so the sphere's nz is √(1 − 1/f)); the normal picks a
// colour from a chrome "environment": dark blue-grey above, white at the
// horizon, sky blue below, plus a fixed highlight and the moving sweep. The
// buffer is scaled up smoothly over the field.

import { rng, type RGB } from './pixel'
import type { Background, Context, Tint } from './types'

const LOOP = 15 // seconds, seamless
const SWEEP = 7.5 // a light sweep twice a loop
const FPS = 15
const DPR_MAX = 1.5
const DOWN = 3 // blob buffer: a third of the canvas resolution
const SEED = 0x2000
const WARM_MS = 2000
// The arch: grows, holds, settles back (ms).
const ARCH = [1200, 1800, 1400]

// Kept below the phosphor's brightness: the field's lightest is ~#c9d6e2.
const FIELD_IN = '#c9d6e2'
const FIELD_OUT = '#9eb2c5'
const CHROME_TOP: RGB = [52, 64, 82]
const CHROME_WHITE: RGB = [222, 232, 240]
const CHROME_LOW: RGB = [184, 216, 238]
const CHROME_SKY: RGB = [104, 160, 208]
const LIME: RGB = [168, 224, 70]
const SUNSET: RGB = [242, 160, 58]

type Ball = { x: number; y: number; r: number }
type Region = { x0: number; y0: number; x1: number; y1: number }
type Sub = { orbit: number; k: number; ph: number; r: number }
type Blob = { region: number; u: number; v: number; r: number; ax: number; ay: number; kx: number; ky: number; px: number; py: number; subs: Sub[] }
type Accent = { region: number; u: number; v: number; r: number; ax: number; ay: number; k: number; ph: number }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const TAU = Math.PI * 2

export class Y2K implements Background {
  readonly name = 'Y2K'
  el: HTMLCanvasElement | null = null
  private ctx!: CanvasRenderingContext2D
  private field!: HTMLCanvasElement
  private halo!: HTMLCanvasElement
  private buf = document.createElement('canvas')
  private bctx = this.buf.getContext('2d')!
  private img: ImageData | null = null
  private W = 0
  private H = 0
  private s = 1 // canvas px per CSS px
  private mon = { x: 0, y: 0, w: 0, h: 0 }
  private regions: Region[] = []
  private blobs: Blob[] = []
  private accents: Accent[] = []
  private layoutKey = ''
  private lastDraw = 0
  private t0 = performance.now()
  private glow = 0
  private glowShown = 0
  private lisbonAt: number | null = null
  private lisbonInstant = false

  constructor(private readonly cx: Context) {
    // Seeded, so every visit has the same blobs.
    const r = rng(SEED)
    const subs = (n: number): Sub[] =>
      Array.from({ length: n }, (_, i) => ({ orbit: 0.25 + r() * 0.3, k: 1 + (i % 2), ph: r() * TAU, r: 0.55 + r() * 0.25 }))
    // Three chrome blobs a side, of different sizes; the two larger ones drift
    // through each other's space, so they merge and part during the loop.
    for (const region of [0, 1])
      for (const [i, size] of [0.3, 0.22, 0.13].entries())
        this.blobs.push({
          region,
          u: 0.3 + r() * 0.4,
          v: [0.22, 0.5, 0.8][(i + region) % 3],
          r: size * (0.9 + r() * 0.2),
          ax: 0.06 + r() * 0.06,
          ay: 0.05 + r() * 0.05,
          kx: 1,
          ky: 1 + Math.floor(r() * 2),
          px: r() * TAU,
          py: r() * TAU,
          subs: subs(i === 2 ? 2 : 3),
        })
    // Three small translucent accents.
    for (const [region, v] of [[0, 0.62], [1, 0.32], [1, 0.9]] as const)
      this.accents.push({ region, u: 0.25 + r() * 0.5, v, r: 0.07 + r() * 0.04, ax: 0.05, ay: 0.04, k: 1 + Math.floor(r() * 2), ph: r() * TAU })
  }

  mount() {
    const c = document.createElement('canvas')
    c.className = 'bg-canvas bg-canvas--smooth'
    c.setAttribute('aria-hidden', 'true')
    document.body.append(c)
    this.el = c
    this.ctx = c.getContext('2d')!
    document.documentElement.dataset.bg = 'y2k'
    this.glowShown = this.glow
    this.render(performance.now())
  }

  unmount() {
    this.el?.remove()
    this.el = null
    this.layoutKey = ''
    if (document.documentElement.dataset.bg === 'y2k') delete document.documentElement.dataset.bg
  }

  /** The screen's light: an ice-white halo here, whatever the phosphor. */
  setGlow(_tint: Tint, level: number) {
    this.glow = level
    this.still()
  }

  onLisbon(instant: boolean) {
    this.lisbonAt = performance.now()
    this.lisbonInstant = instant || this.cx.reduced
    this.still()
  }

  reset() {
    this.lisbonAt = null
    this.still()
  }

  frame(now: number) {
    if (!this.el || this.cx.reduced || now - this.lastDraw < 1000 / FPS) return
    this.render(now)
  }

  private still() {
    if (this.el && this.cx.reduced) this.render(performance.now())
  }

  private render(now: number) {
    const el = this.el!
    // Hidden on small screens (CSS): nothing to draw.
    if (!el.clientWidth) return
    const r = this.cx.monitor.getBoundingClientRect()
    const key = `${innerWidth}:${innerHeight}:${devicePixelRatio}:${r.left}:${r.top}:${r.width}:${r.height}`
    if (key !== this.layoutKey) {
      this.layoutKey = key
      this.build(r)
    }
    const dt = now - this.lastDraw
    this.lastDraw = now
    // The halo follows the screen's power over ~1 s (the CSS halo's fade).
    this.glowShown = this.cx.reduced ? this.glow : lerp(this.glowShown, this.glow, Math.min(1, dt / 1000))
    this.draw(this.cx.reduced ? 0 : (now - this.t0) / 1000, now)
  }

  private build(r: DOMRect) {
    const s = (this.s = Math.min(devicePixelRatio || 1, DPR_MAX))
    const W = (this.W = Math.max(1, Math.round(innerWidth * s)))
    const H = (this.H = Math.max(1, Math.round(innerHeight * s)))
    this.el!.width = W
    this.el!.height = H
    // The case and its top surface, with a little clearance.
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 0
    const mon = (this.mon = { x: r.left * s, y: (r.top - top) * s, w: r.width * s, h: (r.height + top) * s })
    // Blobs live in the side margins, or above and below when those are thin.
    const clear = 18 * s
    const edge = 10 * s
    const left = mon.x - clear - edge
    const right = W - (mon.x + mon.w) - clear - edge
    const above = mon.y - clear - edge
    const below = H - (mon.y + mon.h) - clear - edge
    const min = 90 * s
    this.regions =
      Math.min(left, right) >= min
        ? [
            { x0: edge, y0: edge, x1: mon.x - clear, y1: H - edge },
            { x0: mon.x + mon.w + clear, y0: edge, x1: W - edge, y1: H - edge },
          ]
        : Math.min(above, below) >= min
          ? [
              { x0: edge, y0: edge, x1: W - edge, y1: mon.y - clear },
              { x0: edge, y0: mon.y + mon.h + clear, x1: W - edge, y1: H - edge },
            ]
          : []

    // The field: an icy radial gradient, a faint lens band, a perspective grid.
    const f = (this.field = document.createElement('canvas'))
    f.width = W
    f.height = H
    const g = f.getContext('2d')!
    const sky = g.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.hypot(W, H) * 0.6)
    sky.addColorStop(0, FIELD_IN)
    sky.addColorStop(1, FIELD_OUT)
    g.fillStyle = sky
    g.fillRect(0, 0, W, H)
    const horizon = Math.round(H * 0.78)
    const lens = g.createLinearGradient(0, horizon - H * 0.12, 0, horizon + H * 0.05)
    lens.addColorStop(0, 'rgb(232 240 248 / 0)')
    lens.addColorStop(0.75, 'rgb(232 240 248 / 0.22)')
    lens.addColorStop(1, 'rgb(232 240 248 / 0)')
    g.fillStyle = lens
    g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgb(118 134 152 / 0.28)'
    g.lineWidth = Math.max(1, s)
    g.beginPath()
    g.moveTo(0, horizon)
    g.lineTo(W, horizon)
    // Rows closer together towards the horizon; columns fanning from its centre.
    for (let i = 1; i <= 9; i++) {
      const y = horizon + (H - horizon) * (i / 9) ** 1.8
      g.moveTo(0, y)
      g.lineTo(W, y)
    }
    for (let i = -14; i <= 14; i++) {
      g.moveTo(W / 2 + i * W * 0.012, horizon)
      g.lineTo(W / 2 + i * W * 0.16, H)
    }
    g.stroke()
    // Darker just round the monitor, so the green text stays the brightest thing.
    const cxm = mon.x + mon.w / 2
    const cym = mon.y + mon.h / 2
    const v = g.createRadialGradient(cxm, cym, mon.w * 0.42, cxm, cym, mon.w * 0.82)
    v.addColorStop(0, 'rgb(38 52 72 / 0.42)')
    v.addColorStop(1, 'rgb(38 52 72 / 0)')
    g.fillStyle = v
    g.fillRect(0, 0, W, H)

    // The screen's light: an ice-white halo hugging the case (under it).
    const h = (this.halo = document.createElement('canvas'))
    h.width = W
    h.height = H
    const hg = h.getContext('2d')!
    hg.shadowColor = 'rgb(214 236 255 / 0.85)'
    hg.shadowBlur = 70 * s
    hg.fillStyle = 'rgb(214 236 255)'
    hg.beginPath()
    hg.roundRect(mon.x + 6 * s, mon.y + 6 * s, mon.w - 12 * s, mon.h - 12 * s, 20 * s)
    hg.fill()

    this.buf.width = Math.ceil(W / DOWN)
    this.buf.height = Math.ceil(H / DOWN)
    this.img = this.bctx.createImageData(this.buf.width, this.buf.height)
  }

  /** How far into the Lisbon moment: the accents' warmth and the arch (0..1 each). */
  private lisbon(now: number) {
    if (this.lisbonAt === null) return { warm: 0, arch: 0 }
    if (this.lisbonInstant) return { warm: 1, arch: 0 }
    const ms = now - this.lisbonAt
    const warm = Math.min(1, ms / WARM_MS)
    const [up, hold, down] = ARCH
    const arch = ms < up ? smooth(0, up, ms) : ms < up + hold ? 1 : 1 - smooth(up + hold, up + hold + down, ms)
    return { warm, arch }
  }

  /** The blobs' balls at time t, in canvas pixels, per region. */
  private balls(t: number, arch: number): Ball[][] {
    const ph = (t % LOOP) / LOOP
    const out: Ball[][] = this.regions.map(() => [])
    this.blobs.forEach((b, i) => {
      const reg = this.regions[b.region]
      if (!reg) return
      const rw = reg.x1 - reg.x0
      const rh = reg.y1 - reg.y0
      const unit = Math.min(rw, rh)
      const R = b.r * unit
      // Keep the whole blob (and its drift) inside the region.
      const ext = R * 1.35 + Math.max(b.ax, b.ay) * unit
      const cx = Math.min(reg.x1 - ext, Math.max(reg.x0 + ext, reg.x0 + b.u * rw)) + Math.sin(ph * TAU * b.kx + b.px) * b.ax * unit
      const cy = Math.min(reg.y1 - ext, Math.max(reg.y0 + ext, reg.y0 + b.v * rh)) + Math.sin(ph * TAU * b.ky + b.py) * b.ay * unit
      // The first blob of the first region becomes the arch.
      const a = i === 0 ? arch : 0
      for (const sub of b.subs) {
        const ang = ph * TAU * sub.k + sub.ph
        out[b.region].push({ x: cx + Math.cos(ang) * sub.orbit * R, y: cy + Math.sin(ang) * sub.orbit * R * 0.8, r: sub.r * R * (1 - a) })
      }
      if (a > 0) {
        // A slim arch across the region's width, its feet at the blob's height.
        const n = 48
        const aw = rw * 0.8
        const ah = Math.min(rh * 0.25, aw * 0.55)
        const ax0 = reg.x0 + (rw - aw) / 2
        const base = Math.min(reg.y1 - 10, cy + ah * 0.5)
        const step = (Math.PI * (aw / 2 + ah)) / 2 / (n - 1)
        for (let k = 0; k < n; k++) {
          const u = k / (n - 1)
          const x = ax0 + aw * u
          const y = base - ah * Math.sin(Math.PI * u)
          out[b.region].push({ x: lerp(cx, x, a), y: lerp(cy, y, a), r: (step / 1.1) * a })
        }
      }
    })
    return out
  }

  private draw(t: number, now: number) {
    const { ctx } = this
    const { warm, arch } = this.lisbon(now)
    ctx.globalAlpha = 1
    ctx.drawImage(this.field, 0, 0)
    if (this.glowShown > 0.01) {
      ctx.globalAlpha = this.glowShown * 0.55
      ctx.drawImage(this.halo, 0, 0)
      ctx.globalAlpha = 1
    }
    const ph = (t % LOOP) / LOOP
    const groups = this.balls(t, arch)

    // Soft contact shadows on the field, under each blob and accent.
    const shadow = (x: number, y: number, r: number, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgb(40 56 78 / ${a})`)
      g.addColorStop(1, 'rgb(40 56 78 / 0)')
      ctx.fillStyle = g
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, 0.22)
      ctx.translate(-x, -y)
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
      ctx.restore()
    }
    for (const balls of groups) for (const b of balls) if (b.r > 0) shadow(b.x, b.y + b.r * 2.2, b.r * 1.5, 0.1)
    const accents = this.accentBalls(ph)
    for (const a of accents) shadow(a.x, a.y + a.r * 2.4, a.r * 1.6, 0.08)

    // Chrome: the metaball field on the small buffer, scaled up.
    this.chrome(groups, t)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(this.buf, 0, 0, this.buf.width * DOWN, this.buf.height * DOWN)

    // Translucent accents: lime, warming to sunset orange after Lisbon.
    const col = mixRGB(LIME, SUNSET, warm)
    const c = (k: number, a: number) => `rgb(${Math.round(col[0] * k)} ${Math.round(col[1] * k)} ${Math.round(col[2] * k)} / ${a})`
    for (const a of accents) {
      const g = ctx.createRadialGradient(a.x - a.r * 0.35, a.y - a.r * 0.4, a.r * 0.1, a.x, a.y, a.r)
      g.addColorStop(0, c(1.08, 0.7))
      g.addColorStop(0.7, c(0.9, 0.5))
      g.addColorStop(1, c(0.7, 0.62))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(a.x, a.y, a.r * a.sx, a.r / a.sx, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = 'rgb(236 244 250 / 0.55)'
      ctx.beginPath()
      ctx.ellipse(a.x - a.r * 0.32, a.y - a.r * 0.42, a.r * 0.26, a.r * 0.14, -0.5, 0, TAU)
      ctx.fill()
    }
  }

  private accentBalls(ph: number) {
    return this.accents.flatMap((a) => {
      const reg = this.regions[a.region]
      if (!reg) return []
      const rw = reg.x1 - reg.x0
      const rh = reg.y1 - reg.y0
      const unit = Math.min(rw, rh)
      const r = a.r * unit
      const ext = r * 1.2 + a.ax * unit
      const x = Math.min(reg.x1 - ext, Math.max(reg.x0 + ext, reg.x0 + a.u * rw)) + Math.sin(ph * TAU * a.k + a.ph) * a.ax * unit
      const y = Math.min(reg.y1 - ext, Math.max(reg.y0 + ext, reg.y0 + a.v * rh)) + Math.cos(ph * TAU * a.k + a.ph) * a.ay * unit
      // A slow wobble between round and a little squashed.
      return [{ x, y, r, sx: 1 + 0.08 * Math.sin(ph * TAU * 2 + a.ph) }]
    })
  }

  /** Shade the metaballs into the small buffer (only inside their bounding boxes). */
  private chrome(groups: Ball[][], t: number) {
    const img = this.img!
    const d = img.data
    d.fill(0)
    const bw = this.buf.width
    const bh = this.buf.height
    // The sweep: a diagonal band of light crossing the screen in ~1.6 s, every 7.5 s.
    const sp = (t % SWEEP) / 1.6
    const sweepOn = !this.cx.reduced && sp < 1
    const sweepX = lerp(-0.3, 1.3, sp) * bw
    const sweepW = bw * 0.06
    // A fixed key light up and to the left.
    const L = [-0.42, -0.62, 0.66]
    for (const all of groups) {
      const balls = all.filter((b) => b.r > 0.5).map((b) => ({ x: b.x / DOWN, y: b.y / DOWN, r2: (b.r / DOWN) ** 2, r: b.r / DOWN }))
      if (!balls.length) continue
      let x0 = Infinity
      let y0 = Infinity
      let x1 = -Infinity
      let y1 = -Infinity
      for (const b of balls) {
        // A chain of small balls (the arch) reaches further than one ball's 1.8 r.
        x0 = Math.min(x0, b.x - b.r * 3)
        y0 = Math.min(y0, b.y - b.r * 3)
        x1 = Math.max(x1, b.x + b.r * 3)
        y1 = Math.max(y1, b.y + b.r * 3)
      }
      x0 = Math.max(0, Math.floor(x0))
      y0 = Math.max(0, Math.floor(y0))
      x1 = Math.min(bw - 1, Math.ceil(x1))
      y1 = Math.min(bh - 1, Math.ceil(y1))
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          let f = 0
          let gx = 0
          let gy = 0
          for (const b of balls) {
            const dx = x - b.x
            const dy = y - b.y
            const d2 = dx * dx + dy * dy + 0.01
            const q = b.r2 / d2
            f += q
            gx -= (2 * q * dx) / d2
            gy -= (2 * q * dy) / d2
          }
          if (f < 0.8) continue
          const alpha = smooth(0.82, 1.06, f)
          const gl = Math.hypot(gx, gy) || 1
          const k = 1 / Math.sqrt(f)
          const nx = (-gx / gl) * k
          const ny = (-gy / gl) * k
          const nz = Math.sqrt(Math.max(0, 1 - 1 / f))
          // The chrome environment by how far the surface faces up or down,
          // bent a little by the side it faces for a liquid look.
          const e = -ny * 0.95 + nx * 0.08
          // Soft steps, so the horizon doesn't alias on the small buffer.
          const c =
            e > 0
              ? mixRGB(CHROME_WHITE, CHROME_TOP, smooth(0.02, 0.8, e))
              : mixRGB(mixRGB(CHROME_WHITE, CHROME_LOW, smooth(0, -0.16, e)), CHROME_SKY, smooth(-0.16, -0.9, e))
          // Reflect the view about the normal for the highlights.
          const rx = 2 * nz * nx
          const ry = 2 * nz * ny
          const rz = 2 * nz * nz - 1
          const spec = Math.max(0, rx * L[0] + ry * L[1] + rz * L[2]) ** 28 * 0.9
          let sweep = 0
          if (sweepOn) {
            const u = (x + y * 0.45 - sweepX) / sweepW
            sweep = Math.exp(-u * u) * 0.55 * (0.4 + 0.6 * nz)
          }
          const rim = 0.86 + 0.14 * nz
          const lift = (spec + sweep) * 236
          const i = (y * bw + x) * 4
          d[i] = Math.min(236, c[0] * rim + lift)
          d[i + 1] = Math.min(240, c[1] * rim + lift)
          d[i + 2] = Math.min(246, c[2] * rim + lift)
          d[i + 3] = alpha * 255
        }
      }
    }
    this.bctx.putImageData(img, 0, 0)
  }
}
