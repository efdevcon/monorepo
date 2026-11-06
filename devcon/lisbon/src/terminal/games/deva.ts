// An endless runner: Deva, Devcon's unicorn, runs through Lisbon. Jump the
// pastéis de nata, azulejo stacks and grilled sardines, duck the gulls, and
// grab the odd Ethereum diamond. Original pixel art, drawn in half-blocks.

import { Style } from '../screen'
import type { Grid, Level } from './grid'
import { ACTION, DOWN, UP, type GameFactory } from './types'

const BODY = [
  '          # ',
  '         #  ',
  '       #### ',
  '      ## ###',
  '  :  ####   ',
  ' :#######   ',
  '  #######   ',
]
const LEGS = [
  ['  #    #    ', ' #      #   '],
  ['   #  #     ', '   #  #     '],
]
const LEGS_AIR = ['  ##   ##   ', '            ']
const DUCK = [
  '         ##  #',
  '  :  ####### #',
  ' :#########   ',
  '  #######     ',
]

interface Kind {
  art: readonly string[][] // animation frames
  fly?: number // px above the ground; ground things sit on it
  level?: Level
  prize?: boolean
}
const NATA: Kind = { art: [['.##.', '#::#', '####']] }
const TILE = ['####', '#:+#', '#+:#', '####']
const AZULEJO: Kind = { art: [TILE] }
const AZULEJOS: Kind = { art: [[...TILE, ...TILE]] }
const SARDINE: Kind = { art: [[' .####. #', '########+', ' .####. #']] }
const GULL_ART = [
  ['##   ##', '  #+#  ', '   #   '],
  ['       ', '###+###', '   #   '],
]
const GULL_LOW: Kind = { art: GULL_ART, fly: 2 }
const GULL_HIGH: Kind = { art: GULL_ART, fly: 7 }
const DIAMOND: Kind = { art: [['  #  ', ' ### ', '#####', ' ### ', '  #  ']], fly: 9, level: 2, prize: true }

// The far skyline's landmarks (outlines, drawn faint). Original drawings.
const BRIDGE = [
  '    #                                  #    ',
  '   ###                                ###   ',
  '   # #.                              .# #   ',
  '   # # ..                          .. # #   ',
  '   ###   ..                      ..   ###   ',
  '   # #     ...                ...     # #   ',
  '  .# #        ...          ...        # #.  ',
  ' . # #           ..........           # # . ',
  '############################################',
  '   # #                                # #   ',
  '   # #                                # #   ',
  '   ###                                ###   ',
]
const CRISTO_REI = [
  '   #   ',
  '#######',
  '   #   ',
  '  ###  ',
  '  ###  ',
  '   #   ',
  '  ###  ',
  ' ##### ',
  ' #   # ',
  ' #   # ',
  ' #   # ',
  ' #   # ',
  '#######',
]
const CASTLE = [
  '     # # #          # # #      ',
  '     #####  # # #   #####      ',
  '     #   #  #####   #   #      ',
  '     #   ####   #####   #      ',
  '   ###                  ###    ',
  '  #                        #   ',
  ' #                          #  ',
  '#                            # ',
]
const BELEM = [
  '  # # #  ',
  '  #####  ',
  '  # # #  ',
  ' ####### ',
  ' #     # ',
  ' # # # # ',
  ' #     # ',
  '#########',
  '# #   # #',
  '#       #',
  '#########',
]
const SIGNS = ['CCL ->', 'Alfama', 'Belem', 'DEVCON IX', 'Rossio', 'Lisboa']

interface Thing {
  kind: Kind
  x: number
  w: number
  h: number
  gone?: boolean
}

export const deva: GameFactory = (env) => {
  const W = env.cols
  const H = env.rows * 2
  const G = H - 3 // the ground's pixel row
  const X = 5 // Deva's left edge
  const GRAVITY = 150
  const JUMP = 64 // apex ≈ 13 px: clears a two-tile stack
  let state: 'ready' | 'run' | 'dead' = 'ready'
  let alt = 0 // feet above the ground, px
  let vy = 0
  let ducking = false
  let speed = 0
  let dist = 0
  let bonus = 0
  let gap = 0
  let t = 0
  let deadAt = 0
  let things: Thing[] = []
  // The far skyline, built once as a wrapping strip of faint outlines:
  // rooftops, with the landmarks rising out of them.
  // It sits across the river, above the band Deva runs and jumps in, so the
  // obstacles always have clear air behind them. Too short a screen: no skyline.
  const BASE = G - 16 // the far shore, px
  const SH = Math.max(0, Math.min(14, BASE - 2)) // strip height, px
  const pieces = [BRIDGE, CRISTO_REI, CASTLE, BELEM]
  const roofs: number[] = []
  const marks: Array<{ at: number; art: string[] }> = []
  for (let seed = 7, k = 0; k < pieces.length * 2; k++) {
    // A run of rooftops, then a landmark.
    for (let run = 0; run < 18 + (k % 3) * 6; ) {
      seed = (seed * 9301 + 49297) % 233280
      const w = 4 + (seed % 5)
      const h = 2 + (seed % 5)
      for (let i = 0; i < w; i++, run++) roofs.push(h)
    }
    const art = pieces[k % pieces.length]
    marks.push({ at: roofs.length, art })
    for (let i = 0; i < art[0].length + 2; i++) roofs.push(1)
  }
  const SW = roofs.length
  const strip = new Uint8Array(SW * SH)
  const on = (x: number, y: number) => y >= 0 && y < SH && (strip[y * SW + ((x + SW) % SW)] = 1)
  roofs.forEach((h, x) => {
    const prev = roofs[(x + SW - 1) % SW]
    on(x, SH - h)
    for (let y = SH - Math.max(h, prev); y < SH - Math.min(h, prev); y++) on(x, y)
  })
  for (const { at, art } of marks)
    art.forEach((line, j) => [...line].forEach((ch, i) => ch !== ' ' && on(at + i, SH - art.length + j)))

  const score = () => Math.floor(dist / 4) + bonus

  function reset() {
    state = 'run'
    alt = vy = 0
    speed = Math.max(16, W * 0.24)
    dist = bonus = 0
    gap = W * 0.6
    things = []
    t = 0
  }

  function spawn() {
    const s = score()
    const pool: Kind[] = [NATA, NATA, AZULEJO, SARDINE, AZULEJO]
    if (s > 150) pool.push(AZULEJOS)
    if (s > 250) pool.push(GULL_HIGH, GULL_HIGH)
    if (s > 350) pool.push(GULL_LOW)
    const kind = Math.random() < 0.15 ? DIAMOND : pool[Math.floor(Math.random() * pool.length)]
    const art = kind.art[0]
    things.push({ kind, x: W + 1, w: art[0].length, h: art.length })
    gap = Math.max(30, speed * 0.95) + Math.random() * speed
  }

  // A jump pressed just before landing still happens on landing.
  let buffered = -1
  const jump = () => {
    if (state === 'ready' || (state === 'dead' && t - deadAt > 0.5)) return reset()
    if (state !== 'run') return
    if (alt === 0 && !ducking) (vy = JUMP), env.blip(660, 0.04)
    else buffered = t
  }

  function devaBox() {
    const h = ducking && alt === 0 ? DUCK.length + 2 : BODY.length + 2
    const w = ducking && alt === 0 ? DUCK[0].length : BODY[0].length
    // A little forgiving: the mane, tail and horn tip don't count.
    return { x: X + 2, y: G - h - alt + 2, w: w - 4, h: h - 2 }
  }

  return {
    status: () => `score ${String(score()).padStart(5, '0')}   best ${String(env.best()).padStart(5, '0')}`,
    tick(dt) {
      t += dt
      if (state !== 'run') return
      speed = Math.min(W * 0.9, speed + dt * 0.6)
      const step = speed * dt
      dist += step
      if (alt > 0 || vy > 0) {
        vy -= GRAVITY * dt * (ducking ? 2.5 : 1)
        alt = Math.max(0, alt + vy * dt)
        if (alt === 0) vy = 0
        if (alt === 0 && t - buffered < 0.15 && !ducking) (vy = JUMP), (buffered = -1)
      }
      gap -= step
      if (gap <= 0) spawn()
      const d = devaBox()
      for (const th of things) {
        th.x -= step
        if (th.gone) continue
        const y = G - th.h - (th.kind.fly ?? 0)
        const hitX = th.x < d.x + d.w && th.x + th.w > d.x
        const hitY = y < d.y + d.h && y + th.h > d.y
        if (!hitX || !hitY) continue
        if (th.kind.prize) {
          th.gone = true
          bonus += 50
          env.blip(1320, 0.06)
        } else {
          state = 'dead'
          deadAt = t
          env.best(score())
          env.blip(120, 0.3)
        }
      }
      things = things.filter((th) => th.x + th.w > -2)
    },
    draw(g: Grid) {
      // Far skyline across the Tagus, slowest, and the river's glints below it.
      if (SH >= 6) {
        const far = Math.floor(dist / 6)
        for (let x = 0; x < W; x++) {
          for (let y = 0; y < SH; y++) if (strip[y * SW + ((x + far) % SW)]) g.dot(x, BASE - SH + y, 4)
          if ((x + Math.floor(dist / 3)) % 7 < 2) g.dot(x, BASE + 2, 4)
        }
      }
      // Street lamps with Santo António bunting between them, and the odd sign.
      const LAMP = 30
      const near = Math.floor(dist / 2)
      const lampTop = G - 11
      for (let x = 0; x < W; x++) {
        const lx = (x + near) % LAMP
        if (lx === 0) {
          g.fill(x, lampTop + 2, 1, G - lampTop - 2, 4)
          g.fill(x - 1, lampTop, 3, 2, 3)
          const n = Math.floor((x + near) / LAMP)
          if (n % 3 === 0) {
            const sign = SIGNS[(n / 3) % SIGNS.length]
            // Up above Deva's highest jump, so text never covers her.
            g.write(x - Math.floor(sign.length / 2), Math.max(1, Math.floor((G - 28) / 2)), sign, Style.Dim)
          }
        } else {
          const y = lampTop + 1 + Math.round(3 * Math.sin((Math.PI * lx) / LAMP))
          g.dot(x, y, 4)
          if (lx % 3 === 0) g.dot(x, y + 1, 3)
        }
      }
      // The ground, and calçada portuguesa waves in the pavement.
      g.fill(0, G, W, 1, 3)
      for (let x = 0; x < W; x++) g.dot(x, G + 1.5 + Math.sin((x + dist) / 3) * 0.6, 4)
      for (const th of things) {
        if (th.gone) continue
        const frame = th.kind.art[Math.floor(t * 6) % th.kind.art.length]
        g.sprite(Math.round(th.x), G - th.h - (th.kind.fly ?? 0), frame, th.kind.level ?? 1)
      }
      const running = state === 'run'
      if (ducking && alt === 0 && running) {
        g.sprite(X, G - DUCK.length - 2, DUCK)
        g.sprite(X, G - 2, LEGS[Math.floor(t * 10) % 2])
      } else {
        const top = G - BODY.length - 2 - Math.round(alt)
        g.sprite(X, top, BODY)
        g.sprite(X, top + BODY.length, alt > 0 || !running ? LEGS_AIR : LEGS[Math.floor(t * 10) % 2])
      }
      const mid = Math.max(1, Math.floor(env.rows / 2) - 3)
      const go = env.coarse ? 'tap' : 'space'
      if (state === 'ready') {
        g.centre(mid, ' Deva runs to Lisbon ', Style.Bright)
        g.centre(mid + 2, env.coarse ? ' tap to jump, tap low to duck ' : ' space/up to jump, down to duck ', Style.Dim)
        g.centre(mid + 3, ` ${go} to start `, Style.Dim)
      } else if (state === 'dead') {
        g.centre(mid, ' Ouch. ', Style.Bright)
        g.centre(mid + 2, ` ${go} to run again `, Style.Dim)
      }
    },
    key(k, down) {
      if (down && (UP.includes(k) || ACTION.includes(k))) jump()
      if (DOWN.includes(k)) ducking = down
    },
    pointer(_x, y, kind) {
      if (kind === 'down') {
        if (state === 'run' && y > H * 0.66) ducking = true
        else jump()
      }
      if (kind === 'up') ducking = false
    },
  }
}
