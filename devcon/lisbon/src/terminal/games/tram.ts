// `sl`: you meant `ls`, but a Lisbon tram 28 rattles across instead. Like the
// Unix original it can't be interrupted; it just has to pass.

import { Style } from '../screen'
import type { Grid } from './grid'
import type { GameFactory } from './types'

const TRAM = [
  '                  /',
  '     ____________/___________________',
  '    /  __   __   __   __   __   __   \\',
  '   |  |  | |  | |  | |  | |  | |  |  |',
  '   |  |__| |__| |__| |__| |__| |__|  |',
  '   | 28                     ESTRELA  |',
  '   |_________________________________|',
  '     (@)(@)                  (@)(@)',
].map((l, _, all) => l.padEnd(Math.max(...all.map((x) => x.length))))

export const tram: GameFactory = (env) => {
  const W = env.cols
  const w = TRAM[0].length
  const speed = Math.max(18, W / 3.2) // cells/s: ~4 s to cross
  let x = W
  let rang = 0
  const top = Math.max(1, Math.floor((env.rows - TRAM.length) / 2))
  const g0 = {
    stubborn: true,
    done: false,
    status: () => 'tram 28 has right of way',
    tick(dt: number) {
      x -= speed * dt
      // Ding-ding as it comes in, and again on the way out.
      if (rang === 0 && x < W - 4) (rang = 1), env.blip(1568, 0.08), setTimeout(() => env.blip(1568, 0.08), 160)
      if (rang === 1 && x < -w / 2) (rang = 2), env.blip(1568, 0.08)
      if (x < -w - 1) g0.done = true
    },
    draw(g: Grid) {
      // The overhead wire (the pole reaches up to it) and the rails.
      g.write(0, top, '─'.repeat(W), Style.Dim)
      g.write(0, top + TRAM.length, '═'.repeat(W), Style.Dim)
      const cx = Math.floor(x)
      TRAM.forEach((line, r) => {
        for (let i = 0; i < line.length; i++) {
          // Spaces are see-through, so the wire shows round the pole.
          if (line[i] !== ' ') g.write(cx + i, top + r, line[i], r === 5 ? Style.Bright : Style.Normal)
        }
      })
    },
  }
  return g0
}
