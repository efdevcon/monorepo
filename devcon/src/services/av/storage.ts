/**
 * Supabase Storage for the AV page's files: the render inputs read once from
 * Pretalx, every rendered card (PNG + JPEG), the intro animation masters and
 * the intro videos operators render in their browser. One public bucket, so a
 * link copied from the page opens anywhere, and the files are served by
 * Supabase's CDN: a devcon.org deploy does not touch them.
 *
 * Talks to the storage REST API with fetch and the service role key, like
 * services/og-cache.ts (no supabase-js client on this path). Server-only.
 */

export const AV_BUCKET = 'av-assets'

/** Cache lifetimes sent on upload (seconds). Hashed names never change, so they can live long. */
export const CACHE_IMMUTABLE_S = 365 * 24 * 60 * 60
/** Stable names that get overwritten (a re-rendered video): short, and the copied link carries ?v=. */
export const CACHE_SHORT_S = 300

function baseUrl(): string {
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL is not set')
  return url.replace(/\/$/, '')
}

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return key
}

/** Object keys keep their slashes; every other character is URL-encoded per segment. */
export function encodeKey(key: string): string {
  return key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

/** Public URL of an object in the bucket (the CDN URL the page shows and copies). */
export function avObjectUrl(key: string): string {
  return `${baseUrl()}/storage/v1/object/public/${AV_BUCKET}/${encodeKey(key)}`
}

/** Whether the object exists, by a HEAD on its public URL; false on any doubt. */
export async function avObjectExists(key: string): Promise<boolean> {
  try {
    const r = await fetch(avObjectUrl(key), { method: 'HEAD', signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch {
    return false
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const key = serviceKey()
  return { Authorization: `Bearer ${key}`, apikey: key }
}

/** Supabase reports a missing bucket as 400 + "Bucket not found". Create it public; errors are logged, the caller retries once. */
async function ensureBucket(): Promise<void> {
  const r = await fetch(`${baseUrl()}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: AV_BUCKET, name: AV_BUCKET, public: true }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!r.ok) console.error(`[av-storage] bucket creation failed: ${r.status} ${await r.text().catch(() => '')}`)
}

const isBucketMissing = (status: number, body: string) => status === 400 && /bucket not found/i.test(body)

/**
 * Upload (or overwrite) one object; returns its public URL. Throws with the
 * storage error so the caller can tell the operator what happened.
 */
export async function avPutObject(
  key: string,
  bytes: Uint8Array,
  contentType: string,
  cacheControlSeconds: number
): Promise<string> {
  const attempt = async () =>
    fetch(`${baseUrl()}/storage/v1/object/${AV_BUCKET}/${encodeKey(key)}`, {
      method: 'POST',
      headers: {
        ...(await authHeaders()),
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': `max-age=${cacheControlSeconds}`,
      },
      body: bytes as unknown as BodyInit,
      signal: AbortSignal.timeout(60_000),
    })
  let r = await attempt()
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    if (isBucketMissing(r.status, body)) {
      await ensureBucket()
      r = await attempt()
    }
    if (!r.ok) throw new Error(`storage upload failed (${r.status}): ${body || (await r.text().catch(() => ''))}`)
  }
  return avObjectUrl(key)
}

/** A small JSON object, read back through the public URL (`fresh` skips the CDN's copy); null when missing or unreadable. */
export async function avGetJson<T>(key: string, fresh = false): Promise<T | null> {
  try {
    const url = fresh ? `${avObjectUrl(key)}?v=${Date.now()}` : avObjectUrl(key)
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

/**
 * A one-time URL the operator's browser PUTs a file to (a 50 MB video never
 * passes through a function, whose request body is capped at 6 MB). The
 * token allows that one key, overwriting is allowed. Supabase's answer is a
 * relative `/object/upload/sign/...?token=` path; the browser needs it absolute.
 */
export async function avSignedUpload(key: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  const attempt = async () =>
    fetch(`${baseUrl()}/storage/v1/object/upload/sign/${AV_BUCKET}/${encodeKey(key)}`, {
      method: 'POST',
      headers: { ...(await authHeaders()), 'x-upsert': 'true', 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10_000),
    })
  let r = await attempt()
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    if (isBucketMissing(r.status, body)) {
      await ensureBucket()
      r = await attempt()
    }
    if (!r.ok) throw new Error(`could not sign the upload (${r.status}): ${body || (await r.text().catch(() => ''))}`)
  }
  const data = (await r.json()) as { url?: string }
  if (!data.url) throw new Error('could not sign the upload: no URL returned')
  return { uploadUrl: `${baseUrl()}/storage/v1${data.url}`, publicUrl: avObjectUrl(key) }
}
