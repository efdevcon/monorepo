import type { Grid } from './grid'

/** What the terminal hands a game: its field size and a few services. */
export interface Env {
  /** Field size in cells (the header row is the host's). Pixels are cols × rows*2. */
  cols: number
  rows: number
  coarse: boolean
  reduced: boolean
  /** A short square-wave blip (scores, bounces). */
  blip(freq: number, dur?: number): void
  /** Record a score; returns the best so far for this game. */
  best(score?: number): number
  /** Past Devcon cities, oldest first (for bricks and the like). */
  cities: readonly string[]
  /** Text-art pictures to seed things with (the DEVCON wordmark, the diamond, Lisbon). */
  pictures: ReadonlyArray<{ name: string; rows: readonly string[]; facets?: boolean }>
}

export interface Game {
  /** Header text after the title: score, lives, generation... */
  status(): string
  /** Advance by dt seconds. */
  tick(dt: number): void
  draw(g: Grid): void
  /** Key down / up (no auto-repeat). */
  key?(key: string, down: boolean): void
  /** Pointer in field pixels (x in cells, y in half-cells). */
  pointer?(x: number, y: number, kind: 'down' | 'move' | 'up'): void
  /** Set when the game ends itself (the tram has passed). */
  done?: boolean
  /** The mouse cursor over the screen while it runs (CSS), e.g. crosshair for drawing. */
  cursor?: string
  /** Ignore quit keys while running (sl famously can't be interrupted). */
  stubborn?: boolean
}

export type GameFactory = (env: Env) => Game

export const UP = ['ArrowUp', 'w', 'W']
export const DOWN = ['ArrowDown', 's', 'S']
export const LEFT = ['ArrowLeft', 'a', 'A']
export const RIGHT = ['ArrowRight', 'd', 'D']
export const ACTION = [' ', 'Enter']
