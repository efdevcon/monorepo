// Snake, on the half-cell pixel grid inside a wall. Eat the diamonds; it
// grows and speeds up.

import { Style } from '../screen'
import type { Grid } from './grid'
import { ACTION, DOWN, LEFT, RIGHT, UP, type GameFactory } from './types'

type P = [number, number]

export const snake: GameFactory = (env) => {
  const W = env.cols
  const H = env.rows * 2
  let body: P[] = []
  let dir: P = [1, 0]
  const queue: P[] = []
  let food: P = [0, 0]
  let state: 'ready' | 'run' | 'dead' = 'ready'
  let acc = 0
  let step = 0.11
  let eaten = 0
  let t = 0
  let deadAt = 0

  const same = (a: P, b: P) => a[0] === b[0] && a[1] === b[1]
  const onSnake = (p: P) => body.some((b) => same(b, p))

  function place() {
    do food = [1 + Math.floor(Math.random() * (W - 2)), 1 + Math.floor(Math.random() * (H - 2))]
    while (onSnake(food))
  }

  function reset() {
    const y = Math.floor(H / 2)
    const x = Math.floor(W / 3)
    body = [[x, y], [x - 1, y], [x - 2, y], [x - 3, y]]
    dir = [1, 0]
    queue.length = 0
    step = 0.11
    eaten = 0
    acc = 0
    state = 'run'
    place()
  }

  function turn(d: P) {
    if (state !== 'run') {
      if (state === 'ready' || t - deadAt > 0.5) reset()
      else return
    }
    const last = queue[queue.length - 1] ?? dir
    if (d[0] === -last[0] && d[1] === -last[1]) return
    if (same(d, last)) return
    if (queue.length < 3) queue.push(d)
  }

  return {
    status: () => `length ${body.length || 4}   eaten ${eaten}   best ${env.best()}`,
    tick(dt) {
      t += dt
      if (state !== 'run') return
      acc += dt
      while (acc >= step && state === 'run') {
        acc -= step
        dir = queue.shift() ?? dir
        const head: P = [body[0][0] + dir[0], body[0][1] + dir[1]]
        const wall = head[0] <= 0 || head[1] <= 0 || head[0] >= W - 1 || head[1] >= H - 1
        if (wall || onSnake(head)) {
          state = 'dead'
          deadAt = t
          env.best(eaten)
          env.blip(120, 0.3)
          return
        }
        body.unshift(head)
        if (same(head, food)) {
          eaten++
          step = Math.max(0.045, step * 0.96)
          env.blip(990, 0.05)
          place()
        } else body.pop()
      }
    },
    draw(g: Grid) {
      g.fill(0, 0, W, 1, 3)
      g.fill(0, H - 1, W, 1, 3)
      g.fill(0, 0, 1, H, 3)
      g.fill(W - 1, 0, 1, H, 3)
      if (state !== 'ready') {
        body.forEach(([x, y], i) => g.dot(x, y, i === 0 ? 1 : 2))
        g.dot(food[0], food[1], Math.floor(t * 4) % 2 ? 1 : 3)
      }
      const mid = Math.floor(env.rows / 2)
      if (state === 'ready') {
        g.centre(mid - 1, ' snake ', Style.Bright)
        g.centre(mid + 1, env.coarse ? ' tap beside the head to turn; tap to start ' : ' arrows or WASD to start ', Style.Dim)
      } else if (state === 'dead') {
        g.centre(mid - 1, ` Game over: ${eaten} eaten. `, Style.Bright)
        g.centre(mid + 1, env.coarse ? ' tap to play again ' : ' an arrow to play again ', Style.Dim)
      }
    },
    key(k, down) {
      if (!down) return
      if (UP.includes(k)) turn([0, -1])
      else if (DOWN.includes(k)) turn([0, 1])
      else if (LEFT.includes(k)) turn([-1, 0])
      else if (RIGHT.includes(k)) turn([1, 0])
      else if (ACTION.includes(k) && state !== 'run') turn(dir)
    },
    pointer(x, y, kind) {
      if (kind !== 'down') return
      if (state !== 'run') return turn([1, 0])
      // Turn towards the tap, across the current direction.
      const [hx, hy] = body[0]
      if (dir[0] !== 0) turn([0, y < hy ? -1 : 1])
      else turn([x < hx ? -1 : 1, 0])
    },
  }
}
