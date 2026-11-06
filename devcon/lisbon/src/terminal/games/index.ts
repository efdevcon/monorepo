// The games (an easter egg). `ls` shows a games directory; each runs as a
// shell command and takes over the screen until q or Esc.

import { breakout } from './breakout'
import { deva } from './deva'
import { life } from './life'
import { pong } from './pong'
import { snake } from './snake'
import { tram } from './tram'
import type { GameFactory } from './types'

export { Grid, type Row } from './grid'
export type { Env, Game, GameFactory } from './types'

/** Command → game. The first five are listed in games/; `sl` is the typo for `ls`. */
export const GAMES: Record<string, { title: string; make: GameFactory }> = {
  pong: { title: 'PONG', make: pong },
  deva: { title: 'DEVA RUNS', make: deva },
  breakout: { title: 'BREAKOUT', make: breakout },
  snake: { title: 'SNAKE', make: snake },
  life: { title: 'LIFE', make: life },
  sl: { title: 'SL', make: tram },
}

export const LISTED = ['breakout', 'deva', 'life', 'pong', 'snake']
