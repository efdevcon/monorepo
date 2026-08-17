/**
 * VENDORED copy of lib/helpers/blockies-svg.ts — devcon-api's plain tsc build
 * can't compile TS imported from outside src/, unlike the Next.js apps which
 * transpile the lib workspace. Keep the two files in sync if the algorithm
 * ever changes (it shouldn't — it mirrors the canonical Ethereum blockies).
 */
/**
 * SVG blockies — drop-in replacement for `ethereum-blockies-base64`.
 *
 * Implements the canonical Ethereum blockies algorithm (same seeded xorshift
 * PRNG, same HSL color derivation, same 8x8 mirrored pattern), so any seed
 * produces the SAME identicon as the PNG library — but rendered as an SVG
 * data URL: ~5-10x smaller than the base64 PNG, crisp at any display size,
 * and with no canvas dependency (safe in SSR and workers).
 *
 * makeBlockie('vitalik.eth')  -> data:image/svg+xml,...  (~700 bytes)
 * vs ethereum-blockies-base64 -> data:image/png;base64,... (several KB)
 */

const SIZE = 8 // canonical blockies grid

// ── Canonical blockies PRNG (xorshift over 4 int32 seeds) ──
function createRand(seed: string) {
  const randseed = new Int32Array(4)
  for (let i = 0; i < seed.length; i++) {
    randseed[i % 4] = (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i)
  }
  return function rand(): number {
    const t = randseed[0] ^ (randseed[0] << 11)
    randseed[0] = randseed[1]
    randseed[1] = randseed[2]
    randseed[2] = randseed[3]
    randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8)
    return (randseed[3] >>> 0) / ((1 << 31) >>> 0)
  }
}

/** Standard HSL->RGB (same math browsers use for canvas hsl() fills), emitted
 *  as hex — identical color, ~3x shorter than `hsl(...)` once URL-encoded. */
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function createColor(rand: () => number): string {
  const h = Math.floor(rand() * 360)
  const s = rand() * 60 + 40
  const l = (rand() + rand() + rand() + rand()) * 25
  return hslToHex(h, s, l)
}

function createImageData(rand: () => number): number[] {
  const dataWidth = Math.ceil(SIZE / 2)
  const mirrorWidth = SIZE - dataWidth
  const data: number[] = []
  for (let y = 0; y < SIZE; y++) {
    const row: number[] = []
    for (let x = 0; x < dataWidth; x++) {
      // 43% cell color, 43% background, 13% spot color — canonical weights
      row[x] = Math.floor(rand() * 2.3)
    }
    const mirror = row.slice(0, mirrorWidth).reverse()
    data.push(...row, ...mirror)
  }
  return data
}

/** One compact `<path>` per color: horizontal runs of same-colored cells
 *  become `M<x> <y>h<len>v1h-<len>z` segments (run-length encoding). */
function colorPath(data: number[], value: number): string {
  let d = ''
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (data[y * SIZE + x] !== value) continue
      let len = 1
      while (x + len < SIZE && data[y * SIZE + x + len] === value) len++
      d += `M${x} ${y}h${len}v1h-${len}z`
      x += len - 1
    }
  }
  return d
}

/** Raw SVG markup for a blockie identicon (single-quoted for cheap URL embedding). */
export function blockiesSvgMarkup(seed: string): string {
  const rand = createRand(seed.toLowerCase())
  const color = createColor(rand)
  const bgcolor = createColor(rand)
  const spotcolor = createColor(rand)
  const data = createImageData(rand)

  let paths = ''
  for (const [value, fill] of [
    [1, color],
    [2, spotcolor],
  ] as const) {
    const d = colorPath(data, value)
    if (d) paths += `<path fill='${fill}' d='${d}'/>`
  }
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${SIZE} ${SIZE}' shape-rendering='crispEdges'>` +
    `<rect width='${SIZE}' height='${SIZE}' fill='${bgcolor}'/>${paths}</svg>`
  )
}

/** Minimal escaping for embedding SVG in a data URL: only the characters that
 *  actually break URLs/HTML attributes — full encodeURIComponent inflates the
 *  result ~30% for no benefit (mini-svg-data-uri technique). */
function encodeSvgForUrl(svg: string): string {
  return svg.replace(/[#<>"&\s]/g, (c) => (c === ' ' ? '%20' : `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
}

/** Blockie identicon as an SVG data URL — drop-in for ethereum-blockies-base64's default export. */
export default function makeBlockie(seed: string): string {
  return `data:image/svg+xml,${encodeSvgForUrl(blockiesSvgMarkup(seed))}`
}
