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

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
const dataUrlCache = new Map<string, string>()
export function socialAssetDataUrl(relPath: string): string {
  const cached = dataUrlCache.get(relPath)
  if (cached) return cached
  const ext = relPath.split('.').pop() || 'png'
  const bytes = readFileSync(join(process.cwd(), 'public', 'social', relPath))
  const url = `data:${MIME[ext] || 'image/png'};base64,${bytes.toString('base64')}`
  dataUrlCache.set(relPath, url)
  return url
}
