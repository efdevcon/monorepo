// The monitor's skins: the graphite CRT, a 70s retro TV, and the graphite
// CRT's shape in white plastic (white) and in a pastel sky gradient (pastel,
// the default). Switching is a secret
// easter egg, pointed to nowhere (not the ? sheet, not `ls -a`): W/S or [ and ]
// (see main.ts) or the hidden `skin` command, with a quiet toast; ?skin=1|2|3|4 shares one and the last pick is
// remembered. A skin is CSS on html[data-skin]; index.html applies the
// remembered one before first paint.

import { showToast } from './backgrounds'

// Retro is a photo on landscape screens with room for it, at least
// 900×600 (the frames in public/skins/retro/, cut out where the glass is);
// elsewhere, phones in landscape included, they're CSS-drawn. The same media and srcsets are in index.html's preload.
// html[data-frame] is set once the current skin's photo has loaded (until then
// its CSS case shows).
const SKINS = [
  { id: 'graphite', name: 'Graphite', frame: null },
  { id: 'retro', name: 'Retro', frame: [1100, 1609] },
  { id: 'white', name: 'White', frame: null },
  { id: 'pastel', name: 'Pastel', frame: null },
] as const

type SkinId = (typeof SKINS)[number]['id']

// -v4 since graphite became the default again: picks saved under the older keys (made
// while retro, graphite, then pastel was the default) are dropped, so everyone starts on graphite.
const KEY = 'devcon-ix-skin-v4'
const OLD_KEYS = ['devcon-ix-skin', 'devcon-ix-skin-v2', 'devcon-ix-skin-v3']

export const FRAME_MEDIA = '(min-width: 900px) and (min-height: 600px) and (orientation: landscape)'
const FRAME_SIZES = 'min(100vw, 1400px)'
// A 1×1 transparent GIF: what the <img> shows where the photo doesn't apply.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const frames = new Map<SkinId, HTMLImageElement>()
// Graphite unless ?skin= or a remembered pick says otherwise.
const DEFAULT = SKINS.findIndex((s) => s.id === 'graphite')

let index = 0
let changed: (id: SkinId) => void = () => {}

export function initSkins(onChange: (id: SkinId) => void) {
  changed = onChange
  let saved = 0
  try {
    for (const old of OLD_KEYS) localStorage.removeItem(old)
    saved = Number(localStorage.getItem(KEY))
  } catch {}
  const asked = Number(new URLSearchParams(location.search).get('skin'))
  const pick = [asked, saved].find((n) => n >= 1 && n <= SKINS.length)
  index = pick ? pick - 1 : DEFAULT
  apply()
}

/** The skins, for the `skin` command. */
export const skinNames = () => SKINS.map((s) => s.name)
export const currentSkin = () => index
export const currentSkinId = (): SkinId => SKINS[index].id

/** Switch to skin n (1-based). */
export function setSkin(n: number) {
  if (n >= 1 && n <= SKINS.length && n - 1 !== index) switchSkin(n - 1 - index)
}

/** Step to the previous (-1) or next (+1) skin, with a quick crossfade where the browser can. */
export function switchSkin(step: number) {
  index = (index + step + SKINS.length) % SKINS.length
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !reduced) doc.startViewTransition(apply)
  else apply()
  const url = new URL(location.href)
  url.searchParams.set('skin', String(index + 1))
  history.replaceState(null, '', url)
  try {
    localStorage.setItem(KEY, String(index + 1))
  } catch {}
  showToast(`Skin ${index + 1}/${SKINS.length} · ${SKINS[index].name}`, true)
}

function apply() {
  const skin = SKINS[index]
  document.documentElement.dataset.skin = skin.id
  if (skin.frame) addFrame(skin.id, skin.frame)
  syncFrame()
  changed(skin.id)
}

/** html[data-frame]: whether the current skin's photo is showing (loaded, and its media applies). */
function syncFrame() {
  const img = frames.get(currentSkinId())
  document.documentElement.toggleAttribute('data-frame', !!img && img.complete && img.naturalWidth > 1)
}

/** A skin's photo frame, added the first time the skin is shown. */
function addFrame(id: SkinId, widths: readonly number[]) {
  if (frames.has(id)) return
  const picture = document.createElement('picture')
  picture.className = `frame frame--${id}`
  picture.setAttribute('aria-hidden', 'true')
  for (const [type, ext] of [['image/webp', 'webp'], ['image/png', 'png']]) {
    const source = document.createElement('source')
    source.media = FRAME_MEDIA
    source.type = type
    source.srcset = widths.map((w) => `${import.meta.env.BASE_URL}skins/${id}/frame-${w}.${ext} ${w}w`).join(', ')
    source.sizes = FRAME_SIZES
    picture.append(source)
  }
  const img = document.createElement('img')
  img.alt = ''
  img.decoding = 'async'
  img.src = BLANK
  // Ready when the photo itself has loaded (not the blank, on a phone or after rotating).
  img.addEventListener('load', syncFrame)
  img.addEventListener('error', syncFrame)
  picture.append(img)
  frames.set(id, img)
  document.querySelector('.monitor')!.prepend(picture)
}
