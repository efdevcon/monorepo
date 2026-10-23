/**
 * Shared Supabase-backed cache for server-rendered OG/share images.
 *
 * Extracted from the ticket route's proven pattern: render with @vercel/og,
 * convert to jpeg via sharp, upsert into a public Supabase Storage bucket,
 * and treat the object's Last-Modified age as the cache TTL. Callers own
 * their own bucket name and cache key; this module only knows how to
 * read/write objects in "some bucket" and wrap that into a serve-with-
 * stale-fallback response helper.
 */
import type { NextApiResponse } from 'next'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

export const OG_STALE_AFTER_MS = 12 * 60 * 60 * 1000

/**
 * Short, stable digest of whatever a card is rendered from. Used in cache
 * keys so a card is re-rendered when its inputs change and only then; the
 * caller includes a version number for changes to the card design itself.
 */
export function ogInputHash(input: unknown): string {
  return createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 12)
}

export function ogPublicUrl(bucket: string, key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`
}

function ogObjectUrl(bucket: string, key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${key}`
}

export async function readOgCache(bucket: string, key: string): Promise<{ bytes: Buffer; ageMs: number } | null> {
  try {
    const r = await fetch(ogPublicUrl(bucket, key), { signal: AbortSignal.timeout(2000) })
    if (!r.ok) return null
    const lastModified = r.headers.get('last-modified')
    const lastModifiedMs = lastModified ? new Date(lastModified).getTime() : 0
    const ageMs = lastModifiedMs > 0 ? Date.now() - lastModifiedMs : Infinity
    return { bytes: Buffer.from(await r.arrayBuffer()), ageMs }
  } catch {
    return null
  }
}

/**
 * Newest cached object whose name starts with `namePrefix` inside `folder`
 * (for input-hashed keys: the last card rendered for an id, whatever its
 * inputs were). Null when there is none or Storage can't be listed.
 */
export async function readLatestOgCache(
  bucket: string,
  folder: string,
  namePrefix: string
): Promise<{ bytes: Buffer; ageMs: number } | null> {
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: folder,
        search: namePrefix,
        limit: 20,
        sortBy: { column: 'updated_at', order: 'desc' },
      }),
      signal: AbortSignal.timeout(2000),
    })
    if (!r.ok) return null
    const objects = (await r.json()) as { name: string }[]
    const latest = objects.find(o => o.name.startsWith(namePrefix))
    return latest ? readOgCache(bucket, `${folder}/${latest.name}`) : null
  } catch {
    return null
  }
}

/**
 * Create the bucket if it doesn't exist yet. Mirrors rtd-event-images.ts's
 * upload() bucket-auto-creation, using the storage REST API directly (this
 * module talks to Supabase via fetch, not the supabase-js client).
 */
async function ensureBucketExists(bucket: string): Promise<void> {
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    })
    if (!r.ok) {
      console.error(`[og-cache] bucket creation failed for "${bucket}": ${r.status} ${await r.text().catch(() => '')}`)
    }
  } catch (error) {
    console.error(`[og-cache] bucket creation threw for "${bucket}":`, (error as Error).message)
  }
}

export async function writeOgCache(
  bucket: string,
  key: string,
  bytes: Buffer,
  contentType = 'image/jpeg'
): Promise<void> {
  const attempt = () =>
    fetch(ogObjectUrl(bucket, key), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(bytes),
    })

  try {
    let r = await attempt()
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      if (/bucket not found/i.test(body)) {
        await ensureBucketExists(bucket)
        r = await attempt()
      }
    }
    if (!r.ok) {
      // Cache writes are best-effort and must never break the response, but a
      // silently-broken cache means every request re-renders forever - log loudly.
      const body = await r.text().catch(() => '')
      console.error(`[og-cache] writeOgCache failed for ${bucket}/${key}: ${r.status} ${body}`)
    }
  } catch (error) {
    console.error(`[og-cache] writeOgCache threw for ${bucket}/${key}:`, (error as Error).message)
  }
}

export async function pngToJpeg(png: ArrayBuffer, quality = 80): Promise<Buffer> {
  return sharp(Buffer.from(png))
    .jpeg({
      quality,
      progressive: true,
      optimiseCoding: true,
      mozjpeg: true,
    })
    .toBuffer()
}

export function sendOgImage(
  res: NextApiResponse,
  bytes: Buffer,
  cacheState: 'hit' | 'render' | 'stale',
  cdnMaxAgeSeconds = 43200
): void {
  res.setHeader('Content-Type', 'image/jpeg')
  res.setHeader('Cache-Control', `public, s-maxage=${cdnMaxAgeSeconds}, stale-while-revalidate=86400`)
  res.setHeader('x-og-cache', cacheState)
  res.status(200).send(bytes)
}

export async function serveCachedImage(opts: {
  res: NextApiResponse
  bucket: string
  key: string
  render: () => Promise<Buffer>
  staleAfterMs?: number
  /** CDN lifetime of the response; the default suits id-keyed cards, input-hashed keys can go shorter. */
  cdnMaxAgeSeconds?: number
}): Promise<void> {
  const { res, bucket, key, render } = opts
  const staleAfter = opts.staleAfterMs ?? OG_STALE_AFTER_MS
  const cached = await readOgCache(bucket, key)

  const send = (bytes: Buffer, cacheState: 'hit' | 'render' | 'stale') =>
    sendOgImage(res, bytes, cacheState, opts.cdnMaxAgeSeconds)

  if (cached && cached.ageMs < staleAfter) return send(cached.bytes, 'hit')

  try {
    const fresh = await render()
    await writeOgCache(bucket, key, fresh)
    return send(fresh, 'render')
  } catch (error) {
    console.error(`[og-cache] render failed for ${bucket}/${key}:`, (error as Error).message)
    // Robustness contract: once a card has rendered, upstream failures serve
    // the stale copy instead of breaking crawlers/thumbnails.
    if (cached) return send(cached.bytes, 'stale')
    res.status(503).send({ success: false, error: 'image render failed' })
  }
}
