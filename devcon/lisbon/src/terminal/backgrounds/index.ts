// The backgrounds behind the monitor. Switching is an easter egg: A/D or ←/→
// (see main.ts) or the hidden `bg` command step through them, and a quiet
// toast names the scene. Every visit starts on the sticker wall at night
// (scene 6, stamp stickers by clicking): a pick isn't remembered; only a
// ?bg=1…7 link opens another.

import { dark } from './dark'
import { NightRoom } from './nightRoom'
import { LisbonSunset } from './lisbonSunset'
import { Y2K } from './y2k'
import { StickerWall } from './stickerWall'
import type { Background, Context, Tint } from './types'

let list: Background[] = []
let index = 0
let cx: Context
let glow: { tint: Tint; level: number } = { tint: [0.26, 1, 0.45], level: 0 }
let found = false
let toastTimer = 0
let toast: HTMLElement | null = null

const FADE_MS = 400
// The sticker wall (scene 5).
const DEFAULT = 4

// Where the last pick used to be remembered: cleared, so old visitors start on the default too.
const OLD_KEY = 'devcon-ix-bg'

export function initBackgrounds(context: Context) {
  cx = context
  list = [dark, new NightRoom(cx), new LisbonSunset(cx), new Y2K(cx), new StickerWall(cx), new StickerWall(cx, 'night'), new StickerWall(cx, 'studio')]
  // Dark, unless a link asks for a scene.
  try {
    localStorage.removeItem(OLD_KEY)
  } catch {}
  const asked = Number(new URLSearchParams(location.search).get('bg'))
  index = asked >= 1 && asked <= list.length ? asked - 1 : DEFAULT
  current().mount()
  markKind()
  toast = document.createElement('div')
  toast.className = 'bg-toast'
  // Decorative, like the switching itself: nothing is announced.
  toast.setAttribute('aria-hidden', 'true')
  document.body.append(toast)
}

/** The scenes, for the `bg` command. */
export const backgroundNames = () => list.map((b) => b.name)
export const currentBackground = () => index

/** Switch to scene n (1-based). */
export function setBackground(n: number) {
  if (n >= 1 && n <= list.length && n - 1 !== index) switchBackground(n - 1 - index)
}

const current = () => list[index]

/** CSS-only backdrop pieces (the dark gradient's halo and warm-up) step aside for a scene. */
function markKind() {
  document.documentElement.toggleAttribute('data-bg-scene', current().el !== null)
}

export function backgroundsSetGlow(tint: Tint, level: number) {
  glow = { tint, level }
  current().setGlow(tint, level)
}

export function backgroundsOnLisbon() {
  found = true
  current().onLisbon(false)
}

export function backgroundsReset() {
  found = false
  for (const b of list) b.reset()
}

export function backgroundsFrame(now: number) {
  current().frame?.(now)
}

/** Step to the previous (-1) or next (+1) background, with a quick crossfade. */
export function switchBackground(step: number) {
  const from = current()
  index = (index + step + list.length) % list.length
  const to = current()
  to.mount()
  to.setGlow(glow.tint, glow.level)
  if (found) to.onLisbon(true)
  const ms = cx.reduced ? 0 : FADE_MS
  // A scene fades in over whatever is there; going back to the CSS backdrop,
  // the old scene fades out instead.
  const fading = to.el ?? from.el
  if (fading && ms) {
    fading.style.opacity = to.el ? '0' : '1'
    fading.style.transition = `opacity ${ms}ms ease-out`
    void fading.offsetWidth
    fading.style.opacity = to.el ? '1' : '0'
  }
  markKind()
  window.setTimeout(() => {
    if (from !== current()) from.unmount()
    if (to.el) to.el.style.transition = ''
  }, ms)
  // A ?bg= link is spent once you switch: a reload starts on the default again.
  const url = new URL(location.href)
  if (url.searchParams.has('bg')) {
    url.searchParams.delete('bg')
    history.replaceState(null, '', url)
  }
  showToast(`${index + 1}/${list.length} · ${to.name}`)
}

/** The quiet toast; `always` keeps it on small screens, where the scenes (and their toast) are hidden. */
export function showToast(text: string, always = false) {
  if (!toast) return
  toast.textContent = text
  toast.classList.toggle('is-always', always)
  toast.classList.add('is-on')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast?.classList.remove('is-on'), 1200)
}
