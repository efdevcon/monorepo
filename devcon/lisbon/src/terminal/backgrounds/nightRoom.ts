// Background 2: a room at night. A big window over a generic dusk skyline
// (no real city), deep indigo walls, a desk the monitor sits on, a few
// silhouetted props. A seamless 10 s loop: rain on the glass, windows
// switching on and off, drifting clouds, a blinking aircraft and mast light.
// The CRT's light pools on the desk in the current phosphor colour.

import { hash, hex, PixelScene, Raster, rng, type Box, type RGB } from './pixel'

const LOOP = 10 // seconds, seamless
const SEED = 0x6e167

const WALL: RGB[] = [hex('#120c27'), hex('#1b1336')]
const SKY: RGB[] = [hex('#170e3a'), hex('#2a1450'), hex('#4c1d66'), hex('#7a2770'), hex('#a33573')]
const BUILDINGS: RGB[] = [hex('#3a1f5c'), hex('#28154a'), hex('#190d32')]
const LIT: RGB[] = [hex('#f2c46e'), hex('#ff8fc8'), hex('#78e2f0'), hex('#f2c46e')]
const FRAME = hex('#0b0720')
const SILL = hex('#2b1f52')
const SILL_HI = hex('#3d2d6e')
const DESK: RGB[] = [hex('#231841'), hex('#130c27')]
const DESK_EDGE = hex('#3a2a66')

interface Dot {
  x: number
  y: number
  c: RGB
}

export class NightRoom extends PixelScene {
  readonly name = 'Night room'
  private sky!: HTMLCanvasElement
  private front!: HTMLCanvasElement
  private win: Box = { x: 0, y: 0, w: 0, h: 0 }
  private deskY = 0
  private flicker: Dot[] = []
  private rain: Array<{ x: number; y: number; k: number; len: number }> = []
  private clouds: Array<{ x: number; y: number; w: number }> = []
  private mast = { x: 0, y: 0 }

  protected build() {
    const { W, H, mon } = this
    const r = rng(SEED)
    // The desk top is where the monitor's case ends.
    const deskY = (this.deskY = Math.min(H - 6, mon.y + mon.h))
    const win = (this.win = { x: Math.round(W * 0.05), y: 8, w: Math.round(W * 0.9), h: Math.max(20, deskY - 8 - 12) })
    const horizon = win.y + win.h

    // Back layer: the wall and the sky through the window.
    const back = new Raster(W, H)
    back.gradient(0, 0, W, H, WALL)
    back.gradient(win.x, win.y, win.w, win.h, SKY)
    this.sky = back.canvas()

    // Front layer: skyline, frame, desk, props (transparent where the sky shows).
    const f = new Raster(W, H)
    this.flicker = []
    const heights: Array<[number, number]> = [
      [0.35, 0.7],
      [0.2, 0.48],
      [0.08, 0.28],
    ]
    BUILDINGS.forEach((colour, layer) => {
      let x = win.x
      while (x < win.x + win.w) {
        const bw = 5 + Math.floor(r() * 14)
        const [lo, hi] = heights[layer]
        const bh = Math.round(win.h * (lo + r() * (hi - lo)))
        f.rect(x, horizon - bh, Math.min(bw, win.x + win.w - x), bh, colour)
        // A roof aerial now and then.
        if (r() < 0.25) f.rect(x + 1 + Math.floor(r() * (bw - 2)), horizon - bh - 3, 1, 3, colour)
        if (layer > 0) {
          for (let wy = horizon - bh + 2; wy < horizon - 1; wy += 3)
            for (let wx = x + 1; wx < Math.min(x + bw - 1, win.x + win.w - 1); wx += 2) {
              if (r() > 0.22) continue
              const c = LIT[Math.floor(r() * LIT.length)]
              if (r() < 0.18) this.flicker.push({ x: wx, y: wy, c })
              else f.set(wx, wy, c)
            }
        }
        x += bw + (r() < 0.3 ? 1 : 0)
      }
    })
    // One tall, slim, generic tower with a mast light.
    const tx = win.x + Math.round(win.w * 0.8)
    const top = win.y + Math.round(win.h * 0.14)
    f.rect(tx, top, 2, horizon - top, hex('#43225f'))
    f.rect(tx - 1, top + Math.round((horizon - top) * 0.3), 4, 2, hex('#43225f'))
    f.rect(tx, top - 4, 1, 4, hex('#43225f'))
    this.mast = { x: tx, y: top - 5 }

    // The window frame: border, a mullion and a transom, then the sill.
    f.rect(win.x - 3, win.y - 3, win.w + 6, 3, FRAME)
    f.rect(win.x - 3, horizon, win.w + 6, 3, FRAME)
    f.rect(win.x - 3, win.y, 3, win.h, FRAME)
    f.rect(win.x + win.w, win.y, 3, win.h, FRAME)
    f.rect(win.x + Math.round(win.w / 2) - 1, win.y, 2, win.h, FRAME)
    f.rect(win.x, win.y + Math.round(win.h * 0.42), win.w, 2, FRAME)
    f.rect(win.x - 5, horizon + 3, win.w + 10, 2, SILL)
    f.rect(win.x - 5, horizon + 3, win.w + 10, 1, SILL_HI)

    // The desk, with the monitor's contact shadow.
    f.rect(0, deskY, W, 1, DESK_EDGE)
    f.gradient(0, deskY + 1, W, H - deskY - 1, DESK)
    f.rect(mon.x + 2, deskY, mon.w - 4, 2, hex('#07040f'))

    // Props beside the monitor: a plant on the left, books and a lamp on the right.
    const px = mon.x - 16
    if (px > 2) {
      f.rect(px, deskY - 6, 8, 6, hex('#2d1d4c'))
      f.rect(px - 1, deskY - 7, 10, 1, hex('#3a2860'))
      for (let k = 0; k < 7; k++) {
        const len = 4 + Math.floor(r() * 6)
        const dx = (r() - 0.5) * 1.6
        for (let s = 0; s < len; s++) f.set(px + 4 + Math.round(dx * s), deskY - 8 - s, hex('#163232'))
      }
    }
    const bx = mon.x + mon.w + 6
    if (bx + 16 < W) {
      const books: Array<[number, number, string]> = [
        [16, 3, '#3a1d58'],
        [14, 2, '#4b1f4c'],
        [15, 3, '#2b1950'],
      ]
      let y = deskY
      for (const [w, h, c] of books) {
        y -= h
        f.rect(bx + (16 - w) / 2, y, w, h, hex(c))
      }
      const lx = bx + 22
      if (lx + 10 < W) {
        const metal = hex('#2e1f50')
        f.rect(lx, deskY - 2, 8, 2, metal)
        for (let s = 0; s < 12; s++) f.set(lx + 4 + Math.round(s * 0.35), deskY - 3 - s, metal)
        f.rect(lx + 5, deskY - 18, 8, 3, metal)
        f.rect(lx + 6, deskY - 19, 6, 1, metal)
      }
    }
    this.front = f.canvas()

    // Rain and clouds: speeds are whole multiples of the loop, so it's seamless.
    this.rain = Array.from({ length: 48 }, () => ({
      x: win.x + Math.floor(r() * win.w),
      y: Math.floor(r() * win.h),
      k: 1 + Math.floor(r() * 3),
      len: 2 + Math.floor(r() * 3),
    }))
    this.clouds = Array.from({ length: 4 }, () => ({
      x: Math.floor(r() * win.w),
      y: win.y + 3 + Math.floor(r() * win.h * 0.35),
      w: 20 + Math.floor(r() * 30),
    }))
  }

  protected draw(t: number) {
    const { ctx, win } = this
    const ph = (t % LOOP) / LOOP
    ctx.drawImage(this.sky, 0, 0)

    // Behind the skyline: clouds and the aircraft, clipped to the glass.
    ctx.save()
    ctx.beginPath()
    ctx.rect(win.x, win.y, win.w, win.h)
    ctx.clip()
    ctx.fillStyle = 'rgb(72 30 98 / 0.55)'
    for (const c of this.clouds) {
      const span = win.w + c.w
      const x = win.x + ((c.x + ph * span) % span) - c.w
      ctx.fillRect(Math.round(x), c.y, c.w, 2)
      ctx.fillRect(Math.round(x) + 4, c.y - 1, c.w - 9, 1)
    }
    if (Math.floor(t * 1.6) % 2 === 0) {
      ctx.fillStyle = Math.floor(t * 0.8) % 2 ? '#ff5470' : '#f4f0ff'
      ctx.fillRect(Math.round(win.x + ph * win.w), win.y + 5 + Math.round(Math.sin(ph * Math.PI) * 2), 1, 1)
    }
    ctx.restore()

    ctx.drawImage(this.front, 0, 0)

    // Windows switching on and off, and the mast light.
    for (const [i, d] of this.flicker.entries()) {
      if (hash(i, Math.floor(ph * 10)) < 0.45) continue
      ctx.fillStyle = `rgb(${d.c[0]} ${d.c[1]} ${d.c[2]})`
      ctx.fillRect(d.x, d.y, 1, 1)
    }
    if (t % 2 < 0.4) {
      ctx.fillStyle = '#ff4a66'
      ctx.fillRect(this.mast.x, this.mast.y, 1, 1)
    }

    // Rain on the glass.
    ctx.save()
    ctx.beginPath()
    ctx.rect(win.x, win.y, win.w, win.h)
    ctx.clip()
    ctx.fillStyle = 'rgb(176 166 236 / 0.32)'
    for (const s of this.rain) {
      const y = win.y + ((s.y + ph * win.h * s.k) % win.h)
      ctx.fillRect(s.x, Math.round(y), 1, s.len)
    }
    ctx.restore()

    // The CRT's light on the desk.
    this.spill(this.deskY, this.H - this.deskY, 1)
  }
}
