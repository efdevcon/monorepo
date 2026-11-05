// Background 1: the dark gradient. All CSS (html's background, the --glow halo
// and the .warm layer in terminal.css); the page drives it through --glow and
// body[data-found], so there's nothing to do here.

import type { Background } from './types'

export const dark: Background = {
  name: 'Dark',
  el: null,
  mount() {},
  unmount() {},
  setGlow() {},
  onLisbon() {},
  reset() {},
}
