// A paddle game: you on the left, the machine on the right, first to 7.

import { Style } from '../screen'
import type { Grid } from './grid'
import { ACTION, DOWN, UP, type GameFactory } from './types'

const TO_WIN = 7

export const pong: GameFactory = (env) => {
  const W = env.cols
  const H = env.rows * 2
  const PH = Math.max(4, Math.round(H / 6)) // paddle height, px
  const LX = 2
  const RX = W - 3
  const base = Math.max(24, W * 0.45) // ball speed, px/s
  let you = 0
  let cpu = 0
  let py = (H - PH) / 2
  let cy = py
  let bx = 0
  let by = 0
  let vx = 0
  let vy = 0
  let wait = 0
  let up = false
  let down = false
  let aim: number | null = null
  // The machine: where on its paddle it means to meet the ball (it misses
  // when that's off the paddle), and how long before it reacts to a return.
  let err = 0
  let react = 0

  /** The machine picks its aim for the ball now heading its way. */
  function plan() {
    // Ahead, it gets sloppier; behind, it tightens up: close games either way.
    const spread = Math.max(0.6, Math.min(1.1, 0.76 + 0.08 * (cpu - you)))
    err = (Math.random() * 2 - 1) * PH * spread
    react = 0.12 + Math.random() * 0.12
  }

  /** Where the ball will cross the machine's column, bouncing off top and bottom. */
  function landing() {
    const span = H - 1
    let y = by + (vy * (RX - bx)) / vx
    y = ((y % (2 * span)) + 2 * span) % (2 * span)
    return y > span ? 2 * span - y : y
  }

  function serve(dir: number) {
    bx = W / 2
    by = H / 2
    const a = (Math.random() - 0.5) * 0.9
    vx = dir * base
    vy = base * a
    wait = 0.9
    if (dir > 0) plan()
  }
  serve(Math.random() < 0.5 ? -1 : 1)

  const over = () => you >= TO_WIN || cpu >= TO_WIN
  const clampY = (y: number) => Math.max(0, Math.min(H - PH, y))

  function hit(paddleY: number, dir: number) {
    const off = (by - (paddleY + PH / 2)) / (PH / 2) // -1 top … 1 bottom
    const speed = Math.min(base * 2.2, Math.hypot(vx, vy) * 1.05)
    vx = dir * speed * 0.9
    vy = speed * off * 0.8
    env.blip(dir > 0 ? 520 : 440)
    if (dir > 0) plan()
  }

  return {
    status: () => `you ${you} : ${cpu} cpu   first to ${TO_WIN}`,
    tick(dt) {
      if (over()) return
      const move = H * 1.3 * dt
      if (aim !== null) py = clampY(py + Math.max(-move, Math.min(move, aim - PH / 2 - py)))
      else py = clampY(py + ((down ? 1 : 0) - (up ? 1 : 0)) * move)
      // The machine heads for where the ball will land (give or take its aim)
      // once it has reacted, a bit slower than you can move; otherwise it
      // drifts back to the middle.
      react -= dt
      const coming = vx > 0 && react <= 0 && bx > W * 0.3
      const target = coming ? landing() + err - PH / 2 : (H - PH) / 2
      const cpuMove = H * (coming ? 0.62 : 0.3) * dt
      cy = clampY(cy + Math.max(-cpuMove, Math.min(cpuMove, target - cy)))
      if (wait > 0) {
        wait -= dt
        return
      }
      const px = bx
      bx += vx * dt
      by += vy * dt
      if (by < 0) (by = -by), (vy = -vy), env.blip(300, 0.02)
      if (by > H - 1) (by = 2 * (H - 1) - by), (vy = -vy), env.blip(300, 0.02)
      if (vx < 0 && px >= LX + 1 && bx < LX + 1 && by >= py - 1 && by <= py + PH) (bx = LX + 1), hit(py, 1)
      if (vx > 0 && px <= RX && bx > RX && by >= cy - 1 && by <= cy + PH) (bx = RX), hit(cy, -1)
      if (bx < 0) cpu++, env.blip(160, 0.2), serve(1)
      if (bx > W) you++, env.blip(880, 0.12), serve(-1)
      if (you >= TO_WIN) env.best(you - cpu)
    },
    draw(g: Grid) {
      for (let y = 0; y < H; y += 4) g.fill(Math.floor(W / 2), y, 1, 2, 4)
      g.fill(LX, Math.round(py), 1, PH)
      g.fill(RX, Math.round(cy), 1, PH)
      if (!over() && (wait <= 0 || Math.floor(wait * 6) % 2 === 0)) g.dot(bx, by)
      if (over()) {
        const mid = Math.floor(env.rows / 2)
        g.centre(mid - 1, you > cpu ? ' You win! ' : ' The machine wins. ', Style.Bright)
        g.centre(mid + 1, env.coarse ? ' tap to play again ' : ' space to play again ', Style.Dim)
      } else if (you + cpu === 0 && wait > 0) {
        g.centre(env.rows - 2, env.coarse ? ' drag to move ' : ' W/S or arrow keys, or the mouse ', Style.Dim)
      }
    },
    key(k, isDown) {
      if (UP.includes(k)) (up = isDown), (aim = null)
      if (DOWN.includes(k)) (down = isDown), (aim = null)
      if (isDown && ACTION.includes(k) && over()) (you = cpu = 0), serve(1)
    },
    pointer(_x, y, kind) {
      if (kind === 'down' && over()) return (you = cpu = 0), serve(1)
      if (kind !== 'up') aim = y
    },
  }
}
