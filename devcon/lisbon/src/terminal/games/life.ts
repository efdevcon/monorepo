// Conway's Game of Life on a wrapping half-cell grid, with Devcon, Ethereum
// and Lisbon starting patterns. New cells burn brightest; old ones settle dimmer.

import { Style } from '../screen'
import type { Grid, Level } from './grid'
import { ACTION, type GameFactory } from './types'

// Classic patterns, 'O' alive. The glider is the hacker emblem; the gun makes them forever.
const GLIDER = ['.O.', '..O', 'OOO']
const GUN = [
  '........................O...........',
  '......................O.O...........',
  '............OO......OO............OO',
  '...........O...O....OO............OO',
  'OO........O.....O...OO..............',
  'OO........O...O.OO....O.O...........',
  '..........O.....O.......O...........',
  '...........O...O....................',
  '............OO......................',
]

const HALF0 = 0xe100

/**
 * One text cell as its two pixels (top, bottom). Solid and half blocks map
 * exactly; the logo's half-cell glyphs decode; shading (░) is left out so
 * fills don't turn to mush; any other mark (lines, slashes) is a thin top pixel.
 */
function cellPixels(ch: string): [boolean, boolean] {
  const code = ch.charCodeAt(0)
  if (code >= HALF0 && code <= HALF0 + 24) return [Math.floor((code - HALF0) / 5) > 0, (code - HALF0) % 5 > 0]
  if (ch === '█' || ch === '▌' || ch === '▐' || ch === '▓' || ch === '▒') return [true, true]
  if (ch === '▀') return [true, false]
  if (ch === '▄') return [false, true]
  if (ch === ' ' || ch === '░') return [false, false]
  return [true, false]
}

export const life: GameFactory = (env) => {
  const W = env.cols
  const H = env.rows * 2
  let cells = new Uint16Array(W * H) // age in generations; 0 = dead
  let gen = 0
  let acc = 0
  let paused = false
  let painting = 0 // 1 draws, -1 erases, while the pointer is down
  const every = env.reduced ? 0.25 : 0.09

  const wrap = (x: number, y: number) => ((y + H) % H) * W + ((x + W) % W)
  const set = (x: number, y: number) => (cells[wrap(x, y)] = 1)

  /** Text art, centred: each cell becomes two pixels. */
  function stampText(rows: readonly string[]) {
    const w = Math.max(...rows.map((l) => [...l].length))
    const x0 = Math.floor((W - w) / 2)
    const y0 = Math.floor((H - rows.length * 2) / 2)
    rows.forEach((line, r) =>
      [...line].forEach((ch, c) => {
        const [top, bottom] = cellPixels(ch)
        if (top) set(x0 + c, y0 + r * 2)
        if (bottom) set(x0 + c, y0 + r * 2 + 1)
      }),
    )
  }

  /**
   * The diamond as a wireframe: only pixels on the edge of a facet (where a
   * neighbour is another facet or empty). A solid diamond dies in a few
   * generations; its edges, with gliders flying in from the corners, run for
   * a couple of minutes.
   */
  function stampFacets(rows: readonly string[]) {
    const shade: number[][] = []
    for (const line of rows) {
      const top: number[] = []
      const bottom: number[] = []
      for (const ch of line) {
        const code = ch.charCodeAt(0) - HALF0
        const ok = code >= 0 && code <= 24
        top.push(ok ? Math.floor(code / 5) : 0)
        bottom.push(ok ? code % 5 : 0)
      }
      shade.push(top, bottom)
    }
    const at = (x: number, y: number) => shade[y]?.[x] ?? 0
    const w = Math.max(...shade.map((r) => r.length))
    const x0 = Math.floor((W - w) / 2)
    const y0 = Math.floor((H - shade.length) / 2)
    for (let y = 0; y < shade.length; y++)
      for (let x = 0; x < w; x++) {
        const f = at(x, y)
        if (f && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => at(x + dx, y + dy) !== f)) set(x0 + x, y0 + y)
      }
    // Gliders from each corner, heading in.
    stamp(['.O.', '..O', 'OOO'], 4, 3)
    stamp(['.O.', 'O..', 'OOO'], W - 8, 3)
    stamp(['OOO', 'O..', '.O.'], W - 8, H - 7)
    stamp(['OOO', '..O', '.O.'], 4, H - 7)
  }

  /** A pixel pattern ('O' alive) at (x, y). */
  function stamp(art: readonly string[], x: number, y: number) {
    art.forEach((line, j) => [...line].forEach((ch, i) => ch === 'O' && set(x + i, y + j)))
  }

  const presets: Array<{ name: string; seed: () => void }> = [
    ...env.pictures.map((p) => ({ name: p.name, seed: () => (p.facets ? stampFacets(p.rows) : stampText(p.rows)) })),
    {
      name: 'gliders',
      seed: () => {
        // A fleet crossing diagonally, like transactions heading for the next block.
        for (let k = 0; k < 14; k++) stamp(GLIDER, Math.floor(Math.random() * W), Math.floor(Math.random() * H))
      },
    },
    {
      name: 'glider gun',
      seed: () => stamp(GUN, Math.max(1, Math.floor((W - GUN[0].length) / 2)), Math.max(1, Math.floor(H / 2) - 8)),
    },
    {
      name: 'random',
      seed: () => {
        for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < 0.22 ? 1 : 0
      },
    },
  ]
  let preset = 0

  function load(i: number) {
    preset = (i + presets.length) % presets.length
    cells.fill(0)
    gen = 0
    acc = 0
    presets[preset].seed()
  }

  function next() {
    const out = new Uint16Array(W * H)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let n = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && cells[wrap(x + dx, y + dy)]) n++
        const age = cells[y * W + x]
        if (age ? n === 2 || n === 3 : n === 3) out[y * W + x] = Math.min(age + 1, 999)
      }
    cells = out
    gen++
  }

  load(0)

  const list = presets.map((p, i) => `${i + 1} ${p.name}`).join('  ')

  return {
    cursor: 'crosshair',
    status: () => {
      let alive = 0
      for (const c of cells) if (c) alive++
      return `${presets[preset].name}   generation ${gen}   alive ${alive}${paused ? '   paused' : ''}`
    },
    tick(dt) {
      if (paused) return
      acc += dt
      while (acc >= every) {
        acc -= every
        next()
      }
    },
    draw(g: Grid) {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const age = cells[y * W + x]
          if (age) g.dot(x, y, (age < 3 ? 1 : age < 12 ? 2 : 3) as Level)
        }
      const last = env.rows - 1
      if (env.coarse) g.centre(last, ' tap here: next pattern ', Style.Dim)
      else if (gen < 25 || paused) {
        const keys = ' space pause   n next   c clear   click to draw '
        if (list.length + 2 <= W) g.centre(last - 1, ` ${list} `, Style.Dim)
        g.centre(last, keys, Style.Dim)
      }
    },
    key(k, down) {
      if (!down) return
      const n = Number(k)
      if (n >= 1 && n <= presets.length) load(n - 1)
      else if (k === 'Tab' || k === 'n' || k === 'ArrowRight') load(preset + 1)
      else if (k === 'ArrowLeft' || k === 'p') load(preset - 1)
      else if (ACTION.includes(k)) paused = !paused
      else if (k === 'r') load(presets.length - 1)
      else if (k === 'c') (cells.fill(0), (gen = 0))
      else if (k === '.' && paused) next()
    },
    pointer(x, y, kind) {
      if (kind === 'up') return void (painting = 0)
      // On touch the bottom row is a button: the next pattern.
      if (kind === 'down' && env.coarse && y >= H - 2) return load(preset + 1)
      if (kind === 'down') painting = cells[wrap(Math.floor(x), Math.floor(y))] ? -1 : 1
      if (painting) {
        const i = wrap(Math.floor(x), Math.floor(y))
        cells[i] = painting > 0 ? 1 : 0
      }
    },
  }
}
