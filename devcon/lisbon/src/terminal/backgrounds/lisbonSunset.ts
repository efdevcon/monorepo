// Background 3: a Lisbon sunset, in pixel art. During the boot it's any warm
// southern city: a dithered gold-to-violet sky, a low sun, a river, terracotta
// roofs and white walls, the monitor on a whitewashed terrace wall. When
// Lisbon's OK lands it reveals itself over ~2 s: the 25 de Abril bridge fades
// in across the river, a yellow tram slides in along a street, and the wall
// turns to blue-and-white azulejos (an original tile). A calm 12 s loop: the
// sun bobs and the sky shifts, gulls drift across, the river shimmers, and
// after the reveal the tram runs back and forth. Darker round the monitor.

import { hash, hex, PixelScene, Raster, rng, type RGB } from './pixel'

const LOOP = 12 // seconds, seamless
const REVEAL_MS = 2000
const SEED = 0x115b0a

// Kept darker than the phosphor so the screen stays the brightest thing.
const SKY: RGB[] = [hex('#21163a'), hex('#3b2552'), hex('#6c3556'), hex('#9a4a45'), hex('#b8693a'), hex('#c98c45')]
const HILLS = hex('#4a2b47')
const RIVER: RGB[] = [hex('#5c3651'), hex('#36223f')]
const BRIDGE = hex('#2a1830')
const WALLS: RGB[] = [hex('#8c7f6d'), hex('#7a6e5f'), hex('#988a76')]
const ROOFS: RGB[] = [hex('#8e4430'), hex('#a35235'), hex('#7c3a2a')]
const WINDOW = hex('#3a2a30')
const STREET = hex('#4e403c')
const LEDGE = hex('#b4a690')
const WHITEWASH = hex('#867b6c')
const TILE_WHITE = hex('#7d8794')
const TILE_BLUE = hex('#223e6c')

export class LisbonSunset extends PixelScene {
  readonly name = 'Lisbon sunset'
  private base!: HTMLCanvasElement
  private front!: HTMLCanvasElement
  private bridge!: HTMLCanvasElement
  private tiles!: HTMLCanvasElement
  private horizon = 0
  private riverH = 10
  private sill = 0
  private street = { y: 0, x0: 0, x1: 0 }
  private sun = { x: 0, y: 0 }
  private clouds: Array<{ x: number; y: number; w: number; c: string }> = []
  private shimmer: Array<{ x: number; y: number }> = []
  private revealAt: number | null = null
  private revealInstant = false

  onLisbon(instant: boolean) {
    this.revealAt = performance.now()
    this.revealInstant = instant || this.cx.reduced
    this.still()
  }

  reset() {
    this.revealAt = null
    this.still()
  }

  private reveal() {
    if (this.revealAt === null) return 0
    if (this.revealInstant) return 1
    return Math.min(1, (performance.now() - this.revealAt) / REVEAL_MS)
  }

  protected build() {
    const { W, H, mon } = this
    const r = rng(SEED)
    // The monitor sits on the terrace wall's ledge.
    const sill = (this.sill = Math.min(H - 4, mon.y + mon.h))
    // On tall screens the case covers the middle, so the city drops into the
    // band above it (the horizon just over the case's top edge).
    let horizon = Math.round(sill * 0.6)
    if (mon.y - 3 > 16) horizon = Math.min(horizon, mon.y - 3)
    this.horizon = horizon
    const riverBottom = horizon + this.riverH
    const leftMargin = Math.max(0, mon.x)

    // Sky, hills on the far bank, river.
    const b = new Raster(W, H)
    b.gradient(0, 0, W, horizon, SKY)
    for (let x = 0; x < W; x++) {
      const h = 3 + Math.round(3 * Math.sin(x / 17) + 2 * Math.sin(x / 7 + 1))
      b.rect(x, horizon - h, 1, h, HILLS)
    }
    b.gradient(0, horizon, W, this.riverH, RIVER)
    this.base = b.canvas()
    this.sun = { x: Math.round(leftMargin > 30 ? leftMargin * 0.42 : W * 0.12), y: horizon - 13 }

    // Middle ground: three rows of houses stepping down to the river, with a
    // street on the left for the tram.
    const f = new Raster(W, H)
    const depth = sill - riverBottom
    const rows = 3
    this.street = { y: riverBottom + Math.round(depth * 0.55), x0: 3, x1: Math.max(3, leftMargin - 4) }
    for (let row = 0; row < rows; row++) {
      const baseY = riverBottom + 5 + Math.round(((row + 1) * (depth - 5)) / (rows + 0.4))
      let x = -Math.floor(r() * 6)
      while (x < W) {
        const w = 6 + Math.floor(r() * 9)
        const h = 5 + Math.floor(r() * 6) + row * 2
        const wall = WALLS[Math.floor(r() * WALLS.length)]
        const roof = ROOFS[Math.floor(r() * ROOFS.length)]
        f.rect(x, baseY - h, w, h, wall)
        f.rect(x - 1, baseY - h - 1, w + 2, 1, roof)
        f.rect(x, baseY - h - 2, w, 1, roof)
        f.rect(x + 2, baseY - h - 3, w - 4, 1, roof)
        for (let wy = baseY - h + 2; wy < baseY - 1; wy += 3)
          for (let wx = x + 2; wx < x + w - 1; wx += 3) if (r() < 0.7) f.rect(wx, wy, 1, 2, WINDOW)
        x += w + (r() < 0.25 ? 1 : 0)
      }
    }
    if (this.street.x1 - this.street.x0 > 16) {
      f.rect(0, this.street.y - 1, leftMargin, 4, STREET)
      f.rect(0, this.street.y - 2, leftMargin, 1, hex('#6a5a52'))
    }
    // The terrace wall: a ledge, then whitewash.
    f.rect(0, sill, W, 2, LEDGE)
    f.rect(0, sill + 2, W, H - sill - 2, WHITEWASH)
    this.front = f.canvas()

    // The bridge (revealed): towers, deck and cables across the river, on the right.
    const br = new Raster(W, H)
    // Across the river on the right; above the case when there's no margin there.
    const roomRight = W - (mon.x + mon.w) >= 30
    const bx0 = roomRight ? mon.x + mon.w + 4 : Math.round(W * 0.55)
    const t1 = bx0 + 8
    const t2 = roomRight ? bx0 + 44 : Math.min(W - 6, t1 + Math.round(W * 0.28))
    const deck = horizon - 2
    const towerTop = horizon - 24
    br.rect(bx0 - 40, deck, W - bx0 + 80, 2, BRIDGE)
    for (const tx of [t1, t2]) {
      br.rect(tx, towerTop, 2, horizon + 4 - towerTop, BRIDGE)
      br.rect(tx - 1, towerTop + 6, 4, 1, BRIDGE)
      br.rect(tx - 1, towerTop + 14, 4, 1, BRIDGE)
    }
    // Main span cable sags between the towers; side spans fall to the deck.
    for (let x = t1 + 2; x < t2; x++) {
      const u = (x - t1 - 1) / (t2 - t1 - 1)
      const y = towerTop + 1 + Math.round(20 * (1 - (2 * u - 1) ** 2))
      br.set(x, y, BRIDGE)
      if ((x - t1) % 3 === 0) for (let s = y + 1; s < deck; s++) br.set(x, s, BRIDGE)
    }
    for (let x = t1 - 1; x > t1 - 26; x--) br.set(x, towerTop + 1 + Math.round(((t1 - x) * 21) / 25), BRIDGE)
    for (let x = t2 + 2; x < t2 + 27; x++) br.set(x, towerTop + 1 + Math.round(((x - t2 - 2) * 21) / 25), BRIDGE)
    this.bridge = br.canvas()

    // Azulejos (revealed): an original 8×8 tile, a diamond with corner quarters.
    const tl = new Raster(W, H)
    const TILE = [
      'B..BB..B',
      '...BB...',
      '..B..B..',
      'BB.BB.BB',
      'BB.BB.BB',
      '..B..B..',
      '...BB...',
      'B..BB..B',
    ]
    for (let y = sill + 2; y < H; y++)
      for (let x = 0; x < W; x++) tl.set(x, y, TILE[(y - sill - 2) % 8][x % 8] === 'B' ? TILE_BLUE : TILE_WHITE)
    this.tiles = tl.canvas()

    this.clouds = Array.from({ length: 4 }, (_, i) => ({
      x: Math.floor(r() * W),
      y: 8 + Math.floor(r() * (horizon - 30)),
      w: 30 + Math.floor(r() * 40),
      c: i % 2 ? 'rgb(176 92 106 / 0.45)' : 'rgb(98 56 92 / 0.5)',
    }))
    this.shimmer = Array.from({ length: 40 }, () => ({ x: Math.floor(r() * W), y: horizon + 1 + Math.floor(r() * (this.riverH - 2)) }))
  }

  protected draw(t: number) {
    const { ctx, W, H, mon, horizon } = this
    const ph = (t % LOOP) / LOOP
    const wave = Math.sin(ph * Math.PI * 2)
    const rev = this.reveal()
    ctx.globalAlpha = 1
    ctx.drawImage(this.base, 0, 0)

    // The sky's colour shifts a little, and the sun bobs low.
    ctx.fillStyle = `rgb(120 40 90 / ${0.07 + 0.05 * wave})`
    ctx.fillRect(0, 0, W, horizon - 6)
    const sy = this.sun.y + Math.round(wave * 1.5)
    ctx.fillStyle = 'rgb(232 160 74 / 0.35)'
    ctx.fillRect(this.sun.x - 9, sy - 1, 19, 3)
    ctx.fillStyle = '#e09a48'
    for (let dy = -6; dy <= 6; dy++) {
      const half = Math.round(Math.sqrt(36 - dy * dy))
      ctx.fillRect(this.sun.x - half, sy + dy, half * 2 + 1, 1)
    }
    ctx.fillStyle = '#eebc66'
    ctx.fillRect(this.sun.x - 2, sy - 2, 5, 5)
    // The far bank hides the sun's lower edge.
    ctx.drawImage(this.base, 0, horizon - 8, W, 8, 0, horizon - 8, W, 8)

    for (const c of this.clouds) {
      const span = W + c.w
      const x = ((c.x + ph * span) % span) - c.w
      ctx.fillStyle = c.c
      ctx.fillRect(Math.round(x), c.y, c.w, 1)
      ctx.fillRect(Math.round(x) + 6, c.y + 1, c.w - 14, 1)
    }

    // Gulls drift across, once a loop each.
    ctx.fillStyle = 'rgb(232 220 206 / 0.75)'
    for (let i = 0; i < 3; i++) {
      const gx = Math.round(((ph + i / 3) % 1) * (W + 10)) - 5
      const gy = 18 + i * 14 + Math.round(Math.sin((ph + i) * Math.PI * 4) * 2)
      const up = Math.floor(t * 3 + i) % 2
      ctx.fillRect(gx, gy + up, 1, 1)
      ctx.fillRect(gx + 1, gy + 1 - up, 1, 1)
      ctx.fillRect(gx + 2, gy + up, 1, 1)
    }

    // The bridge, across the river on the right.
    if (rev > 0) {
      ctx.globalAlpha = rev
      ctx.drawImage(this.bridge, 0, 0)
      ctx.globalAlpha = 1
    }

    // The river shimmers.
    ctx.fillStyle = 'rgb(232 168 90 / 0.55)'
    for (const [i, s] of this.shimmer.entries()) if (hash(i, Math.floor(ph * 24)) > 0.6) ctx.fillRect(s.x, s.y, 2, 1)

    ctx.drawImage(this.front, 0, 0)

    // The tram slides in along the street, then runs back and forth.
    const { y: sty, x0, x1 } = this.street
    if (rev > 0 && x1 - x0 > 16) {
      const run = x0 + (x1 - x0 - 12) * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2))
      const x = Math.round(-14 + (run + 14) * Math.min(1, rev * 1.2))
      ctx.globalAlpha = Math.min(1, rev * 2)
      ctx.fillStyle = '#d9a72c'
      ctx.fillRect(x, sty - 5, 12, 5)
      ctx.fillStyle = '#f0c445'
      ctx.fillRect(x, sty - 5, 12, 1)
      ctx.fillStyle = '#3a2a30'
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 1 + k * 3, sty - 4, 2, 2)
      ctx.fillStyle = '#2a1e22'
      ctx.fillRect(x + 5, sty - 8, 1, 3)
      ctx.globalAlpha = 1
    }

    // The wall turns to azulejos.
    if (rev > 0) {
      ctx.globalAlpha = rev
      ctx.drawImage(this.tiles, 0, 0)
      ctx.globalAlpha = 1
    }

    // The wall sits in shadow under the sunset, so it never outshines the screen.
    const wallTop = this.sill + 2
    const shade = ctx.createLinearGradient(0, wallTop, 0, H)
    shade.addColorStop(0, 'rgb(14 8 16 / 0.25)')
    shade.addColorStop(1, 'rgb(14 8 16 / 0.6)')
    ctx.fillStyle = shade
    ctx.fillRect(0, wallTop, W, H - wallTop)

    // Darker round the monitor, so the screen stays readable.
    const cxm = mon.x + mon.w / 2
    const cym = mon.y + mon.h / 2
    const v = ctx.createRadialGradient(cxm, cym, mon.w * 0.35, cxm, cym, mon.w * 0.85)
    v.addColorStop(0, 'rgb(14 8 16 / 0.55)')
    v.addColorStop(1, 'rgb(14 8 16 / 0)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, W, H)

    // The CRT's light on the ledge.
    this.spill(this.sill, 3, 1.2)
  }
}
