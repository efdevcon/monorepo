/** The phosphor colour, 0..1 per channel (the CRT's tint). */
export type Tint = [number, number, number]

/** What every background shares with the page. */
export interface Context {
  monitor: HTMLElement
  reduced: boolean
}

export interface Background {
  readonly name: string
  /** The element to crossfade (null for a CSS-only background). */
  el: HTMLElement | null
  mount(): void
  unmount(): void
  /** The screen's light: its tint and level (0 off, 1 on). */
  setGlow(tint: Tint, level: number): void
  /** Lisbon's [  OK  ] has landed; `instant` when switching to a scene after it. */
  onLisbon(instant: boolean): void
  /** Power-off or reboot: back to before the reveal. */
  reset(): void
  /** Called from the page's frame loop (already throttled when idle). */
  frame?(now: number): void
}
