// The Ethereum octahedron, rasterised into character cells at any size.
// Geometry is the official mark (256 × 417 viewBox); each facet gets its own
// phosphor intensity so the shape reads as faceted, like the original's greys.

type Pt = [number, number]
interface Facet {
  pts: Pt[]
  ch: string
}

// Painter's order: later facets win. The lower chevron is nudged down 14
// units from the official 312/237 so the gap survives coarse rasterising.
const FACETS: Facet[] = [
  { pts: [[128, 0], [256, 212], [128, 288]], ch: '▓' }, // top right
  { pts: [[128, 0], [0, 212], [128, 288]], ch: '█' }, // top left
  { pts: [[128, 154], [256, 212], [128, 288]], ch: '░' }, // inner right
  { pts: [[128, 154], [0, 212], [128, 288]], ch: '▒' }, // inner left
  { pts: [[128, 326], [256, 251], [128, 431]], ch: '▓' }, // lower right
  { pts: [[128, 326], [0, 251], [128, 431]], ch: '█' }, // lower left
]

function inPoly(x: number, y: number, pts: Pt[]) {
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function facetAt(x: number, y: number): string | null {
  let ch: string | null = null
  for (const f of FACETS) if (inPoly(x, y, f.pts)) ch = f.ch
  return ch
}

const SHADES = '█▓▒░'

/**
 * Half-block cell: a top and bottom "pixel", each 0 (empty) or 1–4 (a shade
 * from SHADES). Encoded in the private-use area and drawn by Screen.
 */
export const halves = (top: number, bottom: number) => String.fromCharCode(0xe100 + top * 5 + bottom)

/** Majority facet over a small supersample grid, or 0 if mostly empty. */
function sample(x0: number, y0: number, w: number, h: number): number {
  const counts = new Map<string, number>()
  const N = 4
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const f = facetAt(x0 + ((i + 0.5) / N) * w, y0 + ((j + 0.5) / N) * h)
      if (f) counts.set(f, (counts.get(f) ?? 0) + 1)
    }
  let best = ''
  let n = 0
  let total = 0
  for (const [f, c] of counts) {
    total += c
    if (c > n) (best = f), (n = c)
  }
  return total >= (N * N) / 2 ? SHADES.indexOf(best) + 1 : 0
}

/**
 * Rasterise at two pixels per character cell (top/bottom halves), which with
 * tall terminal cells gives near-square pixels.
 * @param rows height in character rows
 * @param cellAspect character cell height ÷ width
 */
export function diamond(rows: number, cellAspect: number): string[] {
  const py = 431 / (rows * 2) // logo units per half-cell pixel
  const px = py * (2 / cellAspect) // pixel width in logo units
  // Even column count so the centre seam falls on a cell boundary.
  const cols = Math.round(256 / px / 2) * 2
  const x0 = (256 - cols * px) / 2
  const out: string[] = []
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * px
      const top = sample(x, r * 2 * py, px, py)
      const bottom = sample(x, (r * 2 + 1) * py, px, py)
      line += top || bottom ? halves(top, bottom) : ' '
    }
    out.push(line.replace(/\s+$/, ''))
  }
  return out
}

// figlet "ANSI Shadow"
export const WORDMARK_WIDE = [
  '██████╗ ███████╗██╗   ██╗ ██████╗ ██████╗ ███╗   ██╗',
  '██╔══██╗██╔════╝██║   ██║██╔════╝██╔═══██╗████╗  ██║',
  '██║  ██║█████╗  ██║   ██║██║     ██║   ██║██╔██╗ ██║',
  '██║  ██║██╔══╝  ╚██╗ ██╔╝██║     ██║   ██║██║╚██╗██║',
  '██████╔╝███████╗ ╚████╔╝ ╚██████╗╚██████╔╝██║ ╚████║',
  '╚═════╝ ╚══════╝  ╚═══╝   ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝',
]

// The rest of figlet's "ANSI Shadow" alphabet, for building other words in the
// same style (the city at the reveal). Joining these reproduces figlet's output.
const SHADOW: Record<string, string[]> = {
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  B: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██████╔╝', '╚═════╝ '],
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  D: ['██████╗ ', '██╔══██╗', '██║  ██║', '██║  ██║', '██████╔╝', '╚═════╝ '],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  F: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '██║     ', '╚═╝     '],
  G: [' ██████╗ ', '██╔════╝ ', '██║  ███╗', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  H: ['██╗  ██╗', '██║  ██║', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  I: ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
  J: ['     ██╗', '     ██║', '     ██║', '██   ██║', '╚█████╔╝', ' ╚════╝ '],
  K: ['██╗  ██╗', '██║ ██╔╝', '█████╔╝ ', '██╔═██╗ ', '██║  ██╗', '╚═╝  ╚═╝'],
  L: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
  M: ['███╗   ███╗', '████╗ ████║', '██╔████╔██║', '██║╚██╔╝██║', '██║ ╚═╝ ██║', '╚═╝     ╚═╝'],
  N: ['███╗   ██╗', '████╗  ██║', '██╔██╗ ██║', '██║╚██╗██║', '██║ ╚████║', '╚═╝  ╚═══╝'],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  P: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔═══╝ ', '██║     ', '╚═╝     '],
  Q: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║▄▄ ██║', '╚██████╔╝', ' ╚══▀▀═╝ '],
  R: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
  S: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  T: ['████████╗', '╚══██╔══╝', '   ██║   ', '   ██║   ', '   ██║   ', '   ╚═╝   '],
  U: ['██╗   ██╗', '██║   ██║', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  V: ['██╗   ██╗', '██║   ██║', '██║   ██║', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚═══╝  '],
  W: ['██╗    ██╗', '██║    ██║', '██║ █╗ ██║', '██║███╗██║', '╚███╔███╔╝', ' ╚══╝╚══╝ '],
  X: ['██╗  ██╗', '╚██╗██╔╝', ' ╚███╔╝ ', ' ██╔██╗ ', '██╔╝ ██╗', '╚═╝  ╚═╝'],
  Y: ['██╗   ██╗', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚██╔╝  ', '   ██║   ', '   ╚═╝   '],
  Z: ['███████╗', '╚══███╔╝', '  ███╔╝ ', ' ███╔╝  ', '███████╗', '╚══════╝'],
}

/** A word in ANSI Shadow (A–Z; anything else becomes a gap). */
export function shadowWord(word: string): string[] {
  return Array.from({ length: 6 }, (_, r) =>
    [...word.toUpperCase()].map((ch) => SHADOW[ch]?.[r] ?? '   ').join('').replace(/\s+$/, ''),
  )
}

// 5×7 pixel letters, one font row per character row: tall and condensed,
// for screens too narrow for the ANSI Shadow mark (36 columns).
const PIXEL: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
}

/** A word in the 5×7 pixel font (letters above; anything else becomes a gap). */
export function pixelWord(word: string): string[] {
  return Array.from({ length: 7 }, (_, r) =>
    [...word.toUpperCase()]
      .map((ch) => (PIXEL[ch]?.[r] ?? '.....').replace(/#/g, '█').replace(/\./g, ' '))
      .join(' '),
  )
}
export const WORDMARK_NARROW = pixelWord('DEVCON')

// The start screen's title, DEVCON IX: on one line in ANSI Shadow where it
// fits, else stacked in the pixel font with IX centred under DEVCON.
const IX = shadowWord('IX')
export const TITLE_WIDE = WORDMARK_WIDE.map((l, r) => l.padEnd(WORDMARK_WIDE[0].length) + '   ' + IX[r])
const ixNarrow = pixelWord('IX')
const ixPad = ' '.repeat((WORDMARK_NARROW[0].length - ixNarrow[0].length) >> 1)
export const TITLE_NARROW = [...WORDMARK_NARROW, '', ...ixNarrow.map((l) => ixPad + l)]

// Lisbon for the reveal: the 25 de Abril bridge over the Tagus, the castle on
// its hill and the rooftops stepping down to the river, Almada across the water.
// Original drawings, one per screen size. ░ draws dim, blocks normal, lines
// bright; rows from `water` down (the Tagus) are dim.
export const LISBON_WIDE = {
  water: 11,
  rows: [
    '    ▄ ▄ ▄         _▄▄▄                           ▄▄▄_',
    '   ▄█▄█▄█▄      _- █ █\\                         /█ █ -_',
    '  ░░█████░░   _-   █ █ -_                     _- █ █   _',
    '░░░░░░░░░░░░░_ │   █▀█  │_                   _   █▀█   │-_',
    '░░░░░░░░░░░_-░░░   █ █  │ -_               _-│   █ █   │  -',
    '▄▀▄░▄▀▀▄░_-▄▀▄░░░░ █ █  │  │--_         _--  │   █ █   │  │-_░░░░░░░░░',
    '█▌█▄█▐▌█-▀▄█▐█▄▀▄░░█▀█  │  │  │---___---  │  │   █▀█   │░░▄▀▄-_▄▀▀▄░░░',
    '█▄█▐▌█_-▐▌█▄█▄▌▐█▄▀█ █  │  │  │  │  │  │  │  │   █ █  ▄▄█▐▌█▄█▄_▌█▄█▄▌',
    '  ══════════════════════════════════════════════════════════════════',
    '    \\/\\/\\/\\/\\/\\/\\/\\█ █\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\█ █\\/\\/\\/\\/\\/\\/\\/',
    '      │     │      ▀█▀                           ▀█▀      │     │',
    '   -_     _-   -  ▐ ▌   _-    -     -_    -   ▐ ▌    _-     -_    -',
    '       -       _   ▌     -      _-     -      ▐       -     _',
  ],
}

export const LISBON_COMPACT = {
  water: 8,
  rows: [
    ' ▄ ▄ ▄  ▄▄            ▄▄',
    ' █▄█▄█ /▐▌\\          /▐▌\\',
    '░░░░░ / ██ \\_      _/ ██ \\',
    '░▄▀▄ /  ▐▌ │ -_  _- │ ▐▌  \\  ░░░',
    '▄█▐▌/█▄█▐▌ │ │ __ │ │ ▐▌  ▄_\\█▐▌',
    '════════════════════════════════',
    ' \\/\\/\\/\\▐▌/\\/\\/\\/\\/\\/\\▐▌/\\/\\/\\/',
    '        ▀▀            ▀▀',
    ' -_    _▐▌   -_    _- ▐▌  _-',
    '     -    _     -    _-    -',
  ],
}
