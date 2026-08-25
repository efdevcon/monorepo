import crypto from 'crypto'
import sharp from 'sharp'

/**
 * Speaker avatars mirrored into our own Supabase Storage bucket.
 *
 * Why: avatar URLs in the data pointed at cfp.devcon.org (the live Pretalx
 * box) and served the ORIGINAL uploads — 625 MB across ~900 files, average
 * 687 KB, worst 19.5 MB — all rendered as ~48px circles by the clients.
 * That's both a bandwidth problem and a runtime Pretalx dependency during
 * the event, which the AV architecture forbids.
 *
 * Objects are keyed by a hash of the SOURCE url: mirroring is idempotent
 * (same source → same key, skip re-upload) and a re-uploaded avatar gets a
 * fresh key because pretalx renames the file — cache-busting for free.
 * Objects are public and immutable-cached for a year.
 */

const BUCKET = 'speaker-avatars'
const SIZE = 256 // clients render 48px circles (× DPR); 256 also covers detail headers
const WEBP_QUALITY = 80
const CACHE_SECONDS = 31536000

function requireEnv(name: 'SUPABASE_URL' | 'SUPABASE_KEY'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export function isMirroredAvatar(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${BUCKET}/`)
}

let warnedMissingEnv = false
function warnOnceAboutMissingEnv() {
  if (warnedMissingEnv) return
  warnedMissingEnv = true
  console.warn('[avatar-mirror] SUPABASE_URL/SUPABASE_KEY not set — skipping avatar mirroring, keeping source URLs')
}

/** Deterministic public URL for a source — a pure string derivation, no network. */
export function mirroredAvatarUrl(sourceUrl: string): string {
  const hash = crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16)
  return `${requireEnv('SUPABASE_URL')}/storage/v1/object/public/${BUCKET}/${hash}.webp`
}

/** Supabase reports a missing bucket as 400 + "Bucket not found", not 404 (see devcon og-cache). */
async function ensureBucketExists(): Promise<void> {
  const r = await fetch(`${requireEnv('SUPABASE_URL')}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('SUPABASE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  if (!r.ok) {
    console.error(`[avatar-mirror] bucket creation failed: ${r.status} ${await r.text().catch(() => '')}`)
  }
}

/** Download, resize to a 256px webp and upload; returns the public bucket URL. */
export async function mirrorAvatar(sourceUrl: string): Promise<string> {
  const publicUrl = mirroredAvatarUrl(sourceUrl)

  // Source-addressed key already in the bucket: nothing to do.
  const existing = await fetch(publicUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null)
  if (existing?.ok) return publicUrl

  const source = await fetch(sourceUrl, { signal: AbortSignal.timeout(60000) })
  if (!source.ok) throw new Error(`avatar fetch failed (${source.status}): ${sourceUrl}`)
  const original = Buffer.from(await source.arrayBuffer())

  // rotate() with no args auto-orients from EXIF before the square crop.
  const webp = await sharp(original).rotate().resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: WEBP_QUALITY }).toBuffer()

  const key = publicUrl.split('/').pop() as string
  const upload = () =>
    fetch(`${requireEnv('SUPABASE_URL')}/storage/v1/object/${BUCKET}/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireEnv('SUPABASE_KEY')}`,
        'Content-Type': 'image/webp',
        'cache-control': `max-age=${CACHE_SECONDS}`,
        'x-upsert': 'true',
      },
      body: new Uint8Array(webp),
    })

  let r = await upload()
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    if (!body.includes('Bucket not found')) throw new Error(`avatar upload failed (${r.status}): ${body}`)
    await ensureBucketExists()
    r = await upload()
    if (!r.ok) throw new Error(`avatar upload failed after bucket creation (${r.status}): ${await r.text().catch(() => '')}`)
  }
  return publicUrl
}

/**
 * Decide the stored avatar for a freshly mapped speaker, given what the data
 * already holds. Rules:
 * - never clobber a real avatar with a blockie (some speakers' photos only
 *   exist on older pretalx accounts — restored 2026-08-24);
 * - real URLs get mirrored into the bucket; an unchanged source is a pure
 *   string compare against the prior value, no network;
 * - mirroring failures fail open — an unmirrored avatar beats a missing one.
 */
export async function resolveSpeakerAvatar(mappedAvatar: string | undefined, priorAvatar?: string): Promise<string | undefined> {
  const mapped = mappedAvatar ?? ''
  const prior = priorAvatar ?? ''
  const priorIsReal = !!prior && !prior.startsWith('data:')

  if (!mapped.startsWith('http')) return priorIsReal ? prior : mappedAvatar
  if (isMirroredAvatar(mapped)) return mapped

  // No Supabase credentials in this environment (e.g. a sync workflow without
  // the secrets): mirroring is an optimization, never a reason to fail a sync.
  // Keep whatever real avatar we have (broke the test-devcon-8 sync workflow,
  // 2026-08-25).
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    warnOnceAboutMissingEnv()
    return priorIsReal ? prior : mappedAvatar
  }

  const expected = mirroredAvatarUrl(mapped)
  if (prior === expected) return prior

  try {
    return await mirrorAvatar(mapped)
  } catch (error) {
    console.warn(`[avatar-mirror] keeping unmirrored avatar for ${mapped}: ${(error as Error).message}`)
    return priorIsReal && isMirroredAvatar(prior) ? prior : mapped
  }
}
