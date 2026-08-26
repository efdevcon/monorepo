import { readFileSync } from 'fs'
import { join } from 'path'

function toArrayBuffer(b: Buffer): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

const FONT_DIR = join(process.cwd(), 'public', 'fonts')
let fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer }
try {
  fonts = {
    regular: toArrayBuffer(readFileSync(join(FONT_DIR, 'Inter-Regular.ttf'))),
    medium: toArrayBuffer(readFileSync(join(FONT_DIR, 'Inter-Medium.ttf'))),
    bold: toArrayBuffer(readFileSync(join(FONT_DIR, 'Inter-Bold.ttf'))),
  }
} catch (error) {
  throw new Error(`[social-cards] missing Inter fonts in public/fonts: ${(error as Error).message}`)
}
export function interFonts() {
  return fonts
}

// DC8 cards are set in Poppins (Figma: Dev Handoff 5060:6142) — Regular 400 +
// Bold 700, distinct from the Poppins-500/800 files the site uses elsewhere.
let poppins: { regular: ArrayBuffer; bold: ArrayBuffer }
try {
  poppins = {
    regular: toArrayBuffer(readFileSync(join(FONT_DIR, 'Poppins-Regular.ttf'))),
    bold: toArrayBuffer(readFileSync(join(FONT_DIR, 'Poppins-Bold.ttf'))),
  }
} catch (error) {
  throw new Error(`[social-cards] missing Poppins fonts in public/fonts: ${(error as Error).message}`)
}
export function poppinsFonts() {
  return poppins
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
const dataUrlCache = new Map<string, string>()
export function socialAssetDataUrl(relPath: string): string {
  // In dev, always re-read from disk so swapping an asset file shows up on
  // the next render without restarting the server. Prod keeps the cache.
  const cached = process.env.NODE_ENV === 'production' ? dataUrlCache.get(relPath) : undefined
  if (cached) return cached
  const ext = relPath.split('.').pop() || 'png'
  const bytes = readFileSync(join(process.cwd(), 'public', 'social', relPath))
  const url = `data:${MIME[ext] || 'image/png'};base64,${bytes.toString('base64')}`
  dataUrlCache.set(relPath, url)
  return url
}
