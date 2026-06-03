import type { NextApiRequest, NextApiResponse } from 'next'
import sharp from 'sharp'
import { fetchEnsAvatarBytes, isEnsName } from 'services/ens-avatar'

/**
 * Same-origin ENS avatar proxy for the on-page ticket avatar.
 *
 * The browser <img> on /ticket/{name} points here instead of at a raw upstream
 * URL (ensdata CDN / metadata.ens.domains). Fetching + normalizing the bytes
 * server-side eliminates the client-side failure modes (CORS, hotlink blocks,
 * IPFS gateway flakiness, HEAD-OK/GET-fails) that previously left a placeholder
 * square on the card.
 *
 * Responses:
 *   200 image/png  — normalized 200x200 avatar (also cached in Supabase)
 *   404            — name has no avatar record; client collapses the slot
 *   502            — transient upstream failure; client collapses, retries next load
 */

const BUCKET = 'og-tickets'
const AVATAR_SIZE = 200
const STALE_AFTER_MS = 12 * 60 * 60 * 1000

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

function cacheKey(name: string): string {
  return `avatar-${sanitize(name)}.png`
}

function publicUrl(key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`
}

function objectUrl(key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`
}

async function readFromCache(key: string): Promise<{ bytes: Buffer; ageMs: number } | null> {
  try {
    const r = await fetch(publicUrl(key), { signal: AbortSignal.timeout(2000) })
    if (!r.ok) return null
    const lastModified = r.headers.get('last-modified')
    const lastModifiedMs = lastModified ? new Date(lastModified).getTime() : 0
    const ageMs = lastModifiedMs > 0 ? Date.now() - lastModifiedMs : Infinity
    return { bytes: Buffer.from(await r.arrayBuffer()), ageMs }
  } catch {
    return null
  }
}

async function writeToCache(key: string, bytes: Buffer): Promise<void> {
  try {
    await fetch(objectUrl(key), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: new Uint8Array(bytes),
    })
  } catch {
    // Cache write failure shouldn't break the response
  }
}

// Normalize to a square PNG (preserves transparency; the on-card slot has a
// rounded border + background so alpha matters). Returns null on a decode
// failure (e.g. unsupported/animated source) so the caller can 404.
async function normalize(bytes: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(bytes).resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' }).png({ quality: 90 }).toBuffer()
  } catch {
    return null
  }
}

function sendImage(res: NextApiResponse, bytes: Buffer, cache: 'HIT' | 'STALE' | 'MISS') {
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400')
  res.setHeader('X-Cache', cache)
  res.send(bytes)
}

async function regenerate(name: string, key: string, canCache: boolean): Promise<Buffer | null> {
  const { bytes, transient } = await fetchEnsAvatarBytes(name)
  if (!bytes) return null
  const normalized = await normalize(bytes)
  if (!normalized) return null
  // Skip cache write on a transient upstream blip so the next request retries
  // rather than persisting a stale/partial result.
  if (canCache && !transient) await writeToCache(key, normalized)
  return normalized
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const raw = req.query.name
  const nameParam = Array.isArray(raw) ? raw[0] : raw || ''
  // Path may carry a `.png` suffix (so the URL reads like an image) and `+`
  // for spaces — strip both before resolving.
  const name = decodeURIComponent(nameParam.replace(/\.png$/i, '').replace(/\+/g, ' ')).trim()

  if (!name || !isEnsName(name)) {
    return res.status(404).end()
  }

  const canCache = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const key = cacheKey(name.toLowerCase())

  if (canCache) {
    const cached = await readFromCache(key)
    if (cached) {
      const isStale = cached.ageMs > STALE_AFTER_MS
      sendImage(res, cached.bytes, isStale ? 'STALE' : 'HIT')
      if (isStale) regenerate(name, key, canCache).catch(() => {})
      return
    }
  }

  let normalized: Buffer | null = null
  try {
    normalized = await regenerate(name, key, canCache)
  } catch {
    return res.status(502).end()
  }

  if (!normalized) {
    // No avatar record (or undecodable). 404 → client onError → collapse slot.
    return res.status(404).end()
  }

  return sendImage(res, normalized, 'MISS')
}
