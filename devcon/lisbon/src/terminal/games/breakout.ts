// Brick breaking through a wall of past Devcon cities. Clear it and Lisbon
// opens up; the next wall comes faster.

import { Style } from '../screen'
import type { Grid } from './grid'
import { ACTION, LEFT, RIGHT, type GameFactory } from './types'

interface Brick {
  row: number
  x0: number
  x1: number
  label: string
  style: Style
  alive: boolean
}

const TOP = 2 // first brick row (cells)
const ROWS = 5

export const breakout: GameFactory = (env) => {
  const W = env.cols
  const H = env.rows * 2
  const PW = Math.max(6, Math.round(W / 9))
  const PY = H - 2
  const longest = Math.max(...env.cities.map((c) => c.length))
  let bw = longest + 2
  if (Math.floor((W + 1) / (bw + 1)) < 4) bw = 7
  const perRow = Math.max(2, Math.floor((W + 1) / (bw + 1)))
  const left = Math.floor((W - (perRow * (bw + 1) - 1)) / 2)

  let bricks: Brick[] = []
  let px = (W - PW) / 2
  let bx = 0
  let by = 0
  let vx = 0
  let vy = 0
  let stuck = true
  let lives = 3
  let score = 0
  let level = 1
  let banner = 0
  let moveL = false
  let moveR = false
  let aim: number | null = null
  const speed = () => Math.max(26, W * 0.4) * (1 + (level - 1) * 0.12)

  function wall() {
    bricks = []
    let k = 0
    for (let r = 0; r < ROWS; r++)
      for (let i = 0; i < perRow; i++) {
        const name = env.cities[k++ % env.cities.length].slice(0, bw - 2)
        const pad = bw - name.length
        const label = ' '.repeat(pad >> 1) + name + ' '.repeat(pad - (pad >> 1))
        const x0 = left + i * (bw + 1)
        bricks.push({ row: TOP + r, x0, x1: x0 + bw, label, style: r % 2 ? Style.Bright : Style.Inverse, alive: true })
      }
  }
  wall()

  const brickAt = (x: number, y: number) => {
    const row = Math.floor(y / 2)
    const c = Math.floor(x)
    return bricks.find((b) => b.alive && b.row === row && c >= b.x0 && c < b.x1)
  }

  function launch() {
    if (!stuck) return
    if (lives <= 0) {
      lives = 3
      score = 0
      level = 1
      wall()
    }
    stuck = false
    const a = (Math.random() - 0.5) * 0.8
    vx = speed() * Math.sin(a)
    vy = -speed() * Math.cos(a)
  }

  function knock(b: Brick) {
    b.alive = false
    score += 10 * (ROWS - (b.row - TOP)) * level
    env.blip(400 + (ROWS - (b.row - TOP)) * 120, 0.04)
    if (!bricks.some((x) => x.alive)) {
      level++
      banner = 2
      stuck = true
      wall()
    }
  }

  return {
    status: () => `score ${score}   lives ${Math.max(0, lives)}   wall ${level}   best ${env.best()}`,
    tick(dt) {
      banner = Math.max(0, banner - dt)
      const move = W * 1.4 * dt
      if (aim !== null) px += Math.max(-move, Math.min(move, aim - PW / 2 - px))
      else px += ((moveR ? 1 : 0) - (moveL ? 1 : 0)) * move
      px = Math.max(0, Math.min(W - PW, px))
      if (stuck) {
        bx = px + PW / 2
        by = PY - 1
        return
      }
      // Small steps so the ball can't tunnel through a brick or the paddle.
      const steps = Math.ceil((Math.hypot(vx, vy) * dt) / 0.5)
      for (let i = 0; i < steps; i++) {
        const sx = (vx * dt) / steps
        const sy = (vy * dt) / steps
        bx += sx
        let b = brickAt(bx, by)
        if (bx < 0 || bx >= W || b) {
          bx -= sx
          vx = -vx
          if (b) knock(b)
          else env.blip(300, 0.02)
        }
        const before = by
        by += sy
        b = brickAt(bx, by)
        if (by < 0 || b) {
          by -= sy
          vy = -vy
          if (b) knock(b)
          else env.blip(300, 0.02)
        }
        if (stuck) return
        if (vy > 0 && before < PY && by >= PY && bx >= px - 0.5 && bx <= px + PW + 0.5) {
          const off = (bx - (px + PW / 2)) / (PW / 2)
          const s = speed()
          vx = s * Math.max(-0.85, Math.min(0.85, off * 0.85))
          vy = -Math.sqrt(s * s - vx * vx)
          by = PY - 0.01
          env.blip(520, 0.03)
        }
        if (by > H) {
          lives--
          stuck = true
          env.blip(140, 0.25)
          if (lives <= 0) env.best(score)
          return
        }
      }
    },
    draw(g: Grid) {
      for (const b of bricks) if (b.alive) g.write(b.x0, b.row, b.style === Style.Inverse ? b.label : `[${b.label.slice(1, -1)}]`, b.style)
      g.fill(Math.round(px), PY, PW, 1)
      if (lives > 0) g.dot(bx, by)
      const mid = TOP + ROWS + 3
      const go = env.coarse ? 'tap' : 'space'
      if (banner > 0) g.centre(mid, ' Wall down. Lisbon is open. ', Style.Bright)
      else if (lives <= 0) {
        g.centre(mid, ' Game over. ', Style.Bright)
        g.centre(mid + 2, ` ${go} to play again `, Style.Dim)
      } else if (stuck) g.centre(mid, env.coarse ? ' drag to move, tap to launch ' : ` ←/→ or mouse to move, ${go} to launch `, Style.Dim)
    },
    key(k, down) {
      if (LEFT.includes(k)) (moveL = down), (aim = null)
      if (RIGHT.includes(k)) (moveR = down), (aim = null)
      if (down && ACTION.includes(k)) launch()
    },
    pointer(x, _y, kind) {
      if (kind !== 'up') aim = x
      if (kind === 'down') launch()
    },
  }
}
