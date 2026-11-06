// Background 5: a sticker wall (a test). The past Devcons' stickers stuck on a
// pastel, grainy sky (after the DC7 Deva artwork) round the monitor, a few tucked a little behind its sides
// (never behind the screen), and Deva running along the chin. Plain <img>s
// (public/backgrounds/stickers/, loaded only when the scene mounts), no
// per-frame drawing: the look is CSS (terminal.css, .sticker). The layout is
// seeded, so every visit with the same window gets the same wall; it's redone
// on resize. Each sticker is tilted ±14°, bigger ones first, towards the
// corners; a few overlap a little. Wear is seeded too and leans on the older
// editions: some peel at a corner (the corner cut off and folded back, its
// underside showing), some are scuffed, a couple faded. Devcon 8 stays fresh.
// Pointer parallax of a few px, off under reduced motion and on touch.
//
// Background 6 is the same wall at night (made for the pastel skin, the
// sticker wall inverted), where the screen's halo shows again. Unlike the day
// wall it's different every time it's shown: a fresh seed for the stickers
// (places, tilts, sizes, wear) and a new dark diagonal gradient, blue-ish, now
// and then with a third colour. Background 7, the studio, is the same again
// on a near-white studio backdrop (made for the white skin), its stickers
// re-rolled each time too.
//
// On every wall a mouse click off the monitor stamps another sticker where it
// lands, at random from the wall's stickers and a stash that's never on the
// wall to begin with (three Devas). Repeats allowed, as many as you like, on
// top of the others and behind the monitor; they stay until the scene changes.

import { rng } from './pixel'
import type { Background, Context } from './types'

const DIR = `${import.meta.env.BASE_URL}backgrounds/stickers/`
const SEED = 0x5717
const EDGE = 8 // kept clear at the viewport's edge (px)
const CLEAR = 14 // and round the monitor
const W_MIN = 90
const W_MAX = 220
const H_MAX = 250 // the tall marks are capped by height
const H_MIN = 30 // and the long wordmarks kept legible
const W_LEAST = 80 // a sticker shrinks to this before it's left off
const TRIES = 700
const SHRINK = 0.88
const OVERLAP = 0.16 // the most of a sticker another may cover (bounding boxes)
const FILL = 0.5 // of the free wall, at most, for the stickers' boxes
const TILT = 14 // degrees, either way
const PARALLAX = 2.5 // px, either way
const TUCKED = 2 // stickers partly behind the case's sides
const TUCK = [6, 20] // how far behind (px of the tilted box)

// The trimmed WebPs: size, edition (for wear), and how far the art reaches
// towards each corner (max of p·d over opaque pixels, d = (∓1, ∓1)/√2:
// top-left, top-right, bottom-right, bottom-left), for the peel's fold line.
type Art = { file: string; w: number; h: number; ed: number; ext: [number, number, number, number] }
const ART: Art[] = [
  { file: 'devcon-8-mumbai-2026', w: 600, h: 286, ed: 8, ext: [-83, 339, 570, 143] },
  { file: 'devcon-0-berlin-2014', w: 600, h: 174, ed: 0, ext: [-21, 400, 520, 99] },
  { file: 'devcon-1-london-2015', w: 600, h: 145, ed: 1, ext: [-27, 402, 501, 73] },
  { file: 'devcon-2-shanghai-2016', w: 600, h: 129, ed: 2, ext: [-46, 377, 486, 63] },
  { file: 'devcon-3-cancun-2017', w: 600, h: 123, ed: 3, ext: [-42, 380, 483, 59] },
  { file: 'devcon-4-prague-2018', w: 600, h: 274, ed: 4, ext: [-90, 320, 563, 130] },
  { file: 'devcon-5-osaka-2019', w: 600, h: 886, ed: 5, ext: [-129, 296, 890, 477] },
  { file: 'devcon-6-bogota-2022', w: 600, h: 193, ed: 6, ext: [-49, 372, 513, 88] },
  { file: 'devcon-7-bangkok-2024', w: 600, h: 267, ed: 7, ext: [-70, 335, 544, 115] },
]
// Only ever stamped, never on the wall to start with (no wear, so no ext).
const STASH: Art[] = [
  { file: 'deva-head-2024', w: 387, h: 425, ed: 9, ext: [0, 0, 0, 0] },
  { file: 'deva-bogota-2022', w: 600, h: 405, ed: 9, ext: [0, 0, 0, 0] },
  { file: 'deva-running-2024', w: 600, h: 380, ed: 9, ext: [0, 0, 0, 0] },
]
const STAMPS_MAX = 400 // the oldest go past this
const CORNERS: P[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]
type P = [number, number]
type Box = { x0: number; y0: number; x1: number; y1: number }
type Look = { tilt: number; size: number; peel: number; scuff: number; faded: boolean; tuck: boolean }

const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
const meet = (a: Box, b: Box): Box => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) })
const hits = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/** Half the size of a w × h box tilted by `deg`. */
const halves = (w: number, h: number, deg: number): P => {
  const c = Math.abs(Math.cos((deg * Math.PI) / 180))
  const s = Math.abs(Math.sin((deg * Math.PI) / 180))
  return [(w * c + h * s) / 2, (w * s + h * c) / 2]
}
/** The polygon's part on one side of the line p·d = at (`below`: p·d ≤ at). */
function cut(poly: P[], d: P, at: number, below: boolean): P[] {
  const side = (q: P) => (q[0] * d[0] + q[1] * d[1] - at) * (below ? -1 : 1)
  const out: P[] = []
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const sa = side(a)
    const sb = side(b)
    if (sa >= 0) out.push(a)
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  })
  return out
}
const polygon = (poly: P[]) => `polygon(${poly.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`
const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

/** The width (px) for a sticker of `size` 0..1: long wordmarks kept legible, tall ones capped. */
function widthFor(art: Art, size: number) {
  const w = Math.max(W_MIN + (W_MAX - W_MIN) * size, (H_MIN * art.w) / art.h)
  return Math.min(w, W_MAX, (H_MAX * art.w) / art.h)
}

/** A dark diagonal gradient: a deep blue-ish colour to a near-black one, sometimes a third between. */
function nightGradient(r: () => number) {
  const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(1)}%)`
  const hue = 205 + r() * 70 // blue to indigo-violet
  const from = hsl(hue, 50 + r() * 25, 17 + r() * 8)
  const to = hsl(hue + (r() * 2 - 1) * 25, 55 + r() * 20, 3 + r() * 4)
  // The third colour, about a third of the time: teal to magenta, kept dark.
  const third = r() < 0.35 ? hsl(170 + r() * 160, 40 + r() * 30, 11 + r() * 7) : ''
  const angle = [135, 225, 315, 45][Math.floor(r() * 4)] + (r() * 2 - 1) * 15
  return `linear-gradient(${angle.toFixed(0)}deg, ${from}, ${third ? `${third} ${(40 + r() * 20).toFixed(0)}%, ` : ''}${to})`
}

export class StickerWall implements Background {
  readonly name: string
  el: HTMLElement | null = null
  private layer: HTMLElement | null = null
  private base: HTMLElement | null = null
  private stamps: HTMLElement | null = null
  private deva: HTMLElement | null = null
  private looks: Look[] = []
  private seed = SEED
  private queued = 0
  private watch: ResizeObserver | null = null
  private readonly fine = matchMedia('(hover: hover) and (pointer: fine)')

  constructor(
    private readonly cx: Context,
    private readonly kind: 'day' | 'night' | 'studio' = 'day',
  ) {
    this.name = { day: 'Sticker wall', night: 'Sticker wall (night)', studio: 'Studio' }[kind]
    this.roll()
  }

  /** Tilt and size per sticker, then the wear, weighted to the old ones; from this.seed. */
  private roll() {
    const r = rng(this.seed)
    this.looks = ART.map(() => ({ tilt: (r() * 2 - 1) * TILT, size: r(), peel: -1, scuff: -1, faded: false, tuck: false }))
    // Devcon 8 leads: biggest, nearly upright.
    this.looks[0].size = 1
    this.looks[0].tilt *= 0.4
    const age = (ed: number) => (ed <= 3 ? 4 : ed <= 5 ? 2 : 1)
    const pick = (n: number) => {
      const pool = ART.map((a, i) => i).filter((i) => ART[i].ed < 8)
      const out: number[] = []
      while (out.length < n && pool.length) {
        let x = r() * pool.reduce((s, i) => s + age(ART[i].ed), 0)
        const k = pool.findIndex((i) => (x -= age(ART[i].ed)) < 0)
        out.push(...pool.splice(k < 0 ? pool.length - 1 : k, 1))
      }
      return out
    }
    for (const i of pick(3)) this.looks[i].peel = Math.floor(r() * 4)
    for (const i of pick(2)) this.looks[i].scuff = Math.floor(r() * 4)
    for (const i of pick(2)) this.looks[i].faded = true
    // A few tucked behind the case, any edition but the leading one.
    for (let n = 0; n < TUCKED; ) {
      const i = 1 + Math.floor(r() * (ART.length - 1))
      if (!this.looks[i].tuck) (this.looks[i].tuck = true), n++
    }
  }

  mount() {
    const el = document.createElement('div')
    el.className = `bg-canvas bg-wall${this.kind === 'day' ? '' : ` bg-wall--${this.kind}`}`
    if (this.kind !== 'day') {
      // A new wall each time: the seed (kept while shown, so a resize keeps it), and at night the colours.
      this.seed = (Math.random() * 2 ** 32) >>> 0
      this.roll()
      if (this.kind === 'night') el.style.setProperty('--wall', nightGradient(rng(this.seed + 2)))
    }
    el.setAttribute('aria-hidden', 'true')
    const layer = document.createElement('div')
    layer.className = 'bg-wall__layer'
    // The laid-out stickers (redone on resize), then the stamped ones over them.
    this.base = document.createElement('div')
    this.stamps = document.createElement('div')
    layer.append(this.base, this.stamps)
    el.append(layer)
    document.body.append(el)
    this.el = el
    this.layer = layer
    addEventListener('click', this.stamp)
    document.documentElement.dataset.bg = this.id
    addEventListener('resize', this.queue)
    this.watch = new ResizeObserver(this.queue)
    this.watch.observe(this.cx.monitor)
    if (!this.cx.reduced) addEventListener('pointermove', this.shift, { passive: true })
    this.layout()
  }

  unmount() {
    removeEventListener('resize', this.queue)
    removeEventListener('pointermove', this.shift)
    removeEventListener('click', this.stamp)
    this.watch?.disconnect()
    this.watch = null
    cancelAnimationFrame(this.queued)
    this.el?.remove()
    this.deva?.remove()
    this.el = this.layer = this.base = this.stamps = this.deva = null
    if (document.documentElement.dataset.bg === this.id) delete document.documentElement.dataset.bg
  }

  private get id() {
    return this.kind === 'day' ? 'stickers' : `stickers-${this.kind}`
  }

  setGlow() {}

  onLisbon() {}
  reset() {}

  private queue = () => {
    cancelAnimationFrame(this.queued)
    this.queued = requestAnimationFrame(() => this.layout())
  }

  /** The wall follows the mouse a few px; not touch. */
  private shift = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !this.fine.matches || !this.layer) return
    const x = (e.clientX / innerWidth - 0.5) * -2 * PARALLAX
    const y = (e.clientY / innerHeight - 0.5) * -2 * PARALLAX
    this.layer.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
  }

  /** A click on the wall (not the monitor or anything on it): a random sticker stuck where it lands. */
  private stamp = (e: MouseEvent) => {
    if (e.button !== 0 || !this.el?.clientWidth || !this.stamps) return
    if (e.target !== document.body && e.target !== document.documentElement) return
    const all = [...ART, ...STASH]
    const art = all[Math.floor(Math.random() * all.length)]
    const look: Look = { tilt: (Math.random() * 2 - 1) * TILT, size: Math.random(), peel: -1, scuff: -1, faded: false, tuck: false }
    // The layer is shifted by the parallax: stick it under the pointer all the same.
    const t = getComputedStyle(this.layer!).transform
    const m = new DOMMatrix(t === 'none' ? undefined : t)
    const s = this.sticker(art, look, widthFor(art, look.size), e.clientX - m.e, e.clientY - m.f)
    if (!this.cx.reduced) s.classList.add('is-stamped')
    this.stamps.append(s)
    while (this.stamps.childElementCount > STAMPS_MAX) this.stamps.firstElementChild!.remove()
  }

  private layout() {
    const el = this.el
    const layer = this.base
    // Hidden on small screens (CSS): nothing placed, nothing loaded.
    if (!el || !layer || !el.clientWidth) return
    layer.replaceChildren()
    this.placeDeva()
    const vw = innerWidth
    const vh = innerHeight
    const r = this.cx.monitor.getBoundingClientRect()
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 0
    const tv: Box = { x0: r.left, y0: r.top - top, x1: r.right, y1: r.bottom }
    const mon: Box = { x0: tv.x0 - CLEAR, y0: tv.y0 - CLEAR, x1: tv.x1 + CLEAR, y1: tv.y1 + CLEAR }
    const rand = rng(this.seed + 1)
    /** Clear of the monitor, or (tucked) just behind one of its sides. */
    const clear = (box: Box, tuck: boolean) => {
      if (!tuck) return !hits(box, mon)
      const depth = box.x0 < tv.x0 ? box.x1 - tv.x0 : tv.x1 - box.x0
      return box.y0 > tv.y0 + 30 && box.y1 < tv.y1 - 30 && depth >= TUCK[0] && depth <= Math.min(TUCK[1], (box.x1 - box.x0) * 0.25)
    }
    const placed: Box[] = []
    const missing: string[] = []
    const wide = Math.hypot(vw, vh)
    // Devcon 8 first, then biggest first, so the big ones take the corners.
    const size = ({ i, w }: { i: number; w: number }) => (w * w * ART[i].h) / ART[i].w
    const order = ART.map((_, i) => ({ i, w: this.width(i) })).sort((a, b) => (a.i === 0 ? -1 : b.i === 0 ? 1 : size(b) - size(a)))
    // Smaller all round when the wall round the monitor is small: the
    // stickers' boxes should take about half of it.
    const view: Box = { x0: 0, y0: 0, x1: vw, y1: vh }
    const free = area(view) - area(meet(view, mon))
    const want = order.reduce((s, { i, w }) => {
      const [hx, hy] = halves(w, (w * ART[i].h) / ART[i].w, this.looks[i].tilt)
      return s + 4 * hx * hy
    }, 0)
    const fit = Math.min(1, Math.max(0.6, Math.sqrt((free * FILL) / want)))
    for (const { i, w: w0 } of order) {
      const art = ART[i]
      const look = this.looks[i]
      let w = Math.max(W_LEAST, w0 * fit)
      let best: { box: Box; score: number } | null = null
      while (!best && w >= W_LEAST) {
        const h = (w * art.h) / art.w
        const [hx, hy] = halves(w, h, look.tilt)
        // The top two-fifths for Devcon 8.
        const yMax = i === 0 ? Math.max(EDGE + hy, vh * 0.4) : vh - EDGE - hy
        if (vw - 2 * EDGE >= 2 * hx && yMax >= EDGE + hy)
          for (let t = 0; t < TRIES; t++) {
            const cx = EDGE + hx + rand() * (vw - 2 * EDGE - 2 * hx)
            const cy = EDGE + hy + rand() * (yMax - EDGE - hy)
            const box: Box = { x0: cx - hx, y0: cy - hy, x1: cx + hx, y1: cy + hy }
            if (!clear(box, look.tuck)) continue
            let cover = 0
            let bad = false
            for (const o of placed) {
              const a = area(meet(box, o)) / Math.min(area(box), area(o))
              if (a > OVERLAP) bad = true
              cover += a
            }
            if (bad) continue
            // Corners and sides over the wall by the monitor; a little overlap is fine.
            const corner = Math.min(Math.hypot(cx, cy), Math.hypot(vw - cx, cy), Math.hypot(cx, vh - cy), Math.hypot(vw - cx, vh - cy)) / wide
            const away = Math.min(Math.max(mon.x0 - box.x1, box.x0 - mon.x1, mon.y0 - box.y1, box.y0 - mon.y1, 0), 160) / 160
            const score = away - corner * 3 - cover + rand() * 0.25 + (i === 0 ? 1 - cy / vh : 0)
            if (!best || score > best.score) best = { box, score }
          }
        if (!best) w *= SHRINK
      }
      if (!best) {
        missing.push(art.file)
        continue
      }
      placed.push(best.box)
      layer.append(this.sticker(art, look, w, (best.box.x0 + best.box.x1) / 2, (best.box.y0 + best.box.y1) / 2))
    }
    // For checks: what didn't fit.
    el.dataset.missing = missing.join(' ')
  }

  /** The width a sticker would like (px). */
  private width(i: number) {
    return widthFor(ART[i], this.looks[i].size)
  }

  private sticker(art: Art, look: Look, w: number, cx: number, cy: number) {
    const h = (w * art.h) / art.w
    const src = `${DIR}${art.file}.webp`
    const s = document.createElement('div')
    s.className = 'sticker'
    s.style.cssText = `left:${(cx - w / 2).toFixed(1)}px;top:${(cy - h / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;--src:url("${src}")`
    const body = document.createElement('div')
    body.className = 'sticker__body'
    body.style.transform = `rotate(${look.tilt.toFixed(1)}deg)`
    const face = document.createElement('div')
    face.className = 'sticker__face'
    face.classList.toggle('is-faded', look.faded)
    const img = document.createElement('img')
    img.src = src
    img.alt = ''
    img.decoding = 'async'
    img.draggable = false
    face.append(img)
    if (look.scuff >= 0) {
      const scuff = document.createElement('div')
      scuff.className = 'sticker__scuff'
      const [dx, dy] = CORNERS[look.scuff]
      scuff.style.setProperty('--at', `${dx < 0 ? 12 : 88}% ${dy < 0 ? 15 : 85}%`)
      face.append(scuff)
    }
    body.append(face)
    if (look.peel >= 0) body.append(this.peel(face, art, look.peel, w, h))
    s.append(body)
    return s
  }

  /**
   * A peeled corner: the face loses what's past a fold line across the corner,
   * and that piece comes back folded over it (mirrored in the line, a little
   * foreshortened, as if lifting), showing its light underside.
   */
  private peel(face: HTMLElement, art: Art, corner: number, w: number, h: number) {
    const k = Math.SQRT1_2
    const d: P = [CORNERS[corner][0] * k, CORNERS[corner][1] * k]
    const far = (art.ext[corner] * w) / art.w
    const depth = Math.min(30, Math.max(8, Math.min(w, h) * 0.32))
    const at = far - depth
    // Kept: everything this side of the fold, with room round it for the shadow.
    face.style.clipPath = polygon(cut(rect(-30, -30, w + 30, h + 30), d, at, true))
    const flap = document.createElement('div')
    flap.className = 'sticker__flap'
    const lift = 0.8 // 1 would be folded flat
    const m = 1 + lift
    flap.style.transform = `matrix(${1 - m * d[0] * d[0]},${-m * d[0] * d[1]},${-m * d[0] * d[1]},${1 - m * d[1] * d[1]},${m * at * d[0]},${m * at * d[1]})`
    const under = document.createElement('div')
    under.className = 'sticker__under'
    under.style.clipPath = polygon(cut(rect(0, 0, w, h), d, at, false))
    // Shaded along the fold: dark in the bend, a highlight, then the paper.
    const angle = Math.atan2(d[0], -d[1])
    const len = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))
    const mid = (w / 2) * d[0] + (h / 2) * d[1]
    const pc = (v: number) => `${(((v - mid) / len + 0.5) * 100).toFixed(1)}%`
    under.style.background = `linear-gradient(${((angle * 180) / Math.PI).toFixed(1)}deg, #8d887e ${pc(at)}, #d6d2c8 ${pc(at + depth * 0.18)}, #f4f1ea ${pc(at + depth * 0.45)}, #dfdbd2 ${pc(far)})`
    flap.append(under)
    return flap
  }

  /** Deva, small, on the chin: midway between the controls and the logo. */
  private placeDeva() {
    const chin = this.cx.monitor.querySelector<HTMLElement>('.chin')
    const controls = chin?.querySelector('.controls')
    const brand = chin?.querySelector('.brand__mark')
    if (!chin || !controls || !brand) return
    if (!this.deva) {
      const src = `${DIR}deva-running-2024.webp`
      const d = (this.deva = document.createElement('div'))
      d.className = 'sticker sticker--deva'
      d.setAttribute('aria-hidden', 'true')
      d.style.setProperty('--src', `url("${src}")`)
      d.innerHTML = `<div class="sticker__body"><div class="sticker__face"><img src="${src}" alt="" decoding="async" draggable="false"></div></div>`
      chin.append(d)
    }
    const c = chin.getBoundingClientRect()
    const x = (controls.getBoundingClientRect().right + brand.getBoundingClientRect().left) / 2
    this.deva.style.left = `${(x - c.left).toFixed(1)}px`
  }
}
