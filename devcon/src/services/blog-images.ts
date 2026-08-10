/**
 * Mirrors blog card images (ethereum.org RSS enclosures, currently hosted on
 * the ethereum-hackmd GCS bucket) into a public Supabase Storage bucket so
 * blog pages serve stable, right-sized images we control instead of 2-3MB
 * originals on a third-party bucket (same pattern as rtd-event-images.ts).
 *
 * The bucket key is a hash of the source URL, so a changed enclosure URL
 * automatically mirrors the new file and an existence check short-circuits
 * already-mirrored images. Mirroring is best-effort: on any failure the
 * source URL is returned unchanged (next.config.js allows the GCS bucket as
 * a fallback).
 *
 * Server-only: uses SUPABASE_SERVICE_ROLE_KEY. Call from getStaticProps.
 */
import { createHash } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'blog-images'
const FOLDER = 'blogs'
// Featured blog card renders ~600px wide; 1200 covers retina.
const CARD_WIDTH = 1200
const CARD_QUALITY = 80

let client: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for image mirroring')
    client = createClient(url, key)
  }
  return client
}

async function upload(supabase: SupabaseClient, key: string, body: Buffer, contentType?: string): Promise<void> {
  const doUpload = () =>
    supabase.storage.from(BUCKET).upload(key, body, {
      contentType,
      // Keys are immutable (new source URL -> new key), so cache forever.
      cacheControl: '31536000',
      upsert: true,
    })

  let { error } = await doUpload()
  if (error && /bucket not found/i.test(error.message)) {
    await supabase.storage.createBucket(BUCKET, { public: true })
    ;({ error } = await doUpload())
  }
  if (error) throw new Error(`Supabase upload failed: ${error.message}`)
}

/**
 * Ensure the image behind `sourceUrl` is mirrored and return the stable
 * public URL of its card-sized WebP variant (original as fallback if the
 * variant fails, `sourceUrl` unchanged if mirroring fails entirely).
 */
export async function ensurePublicBlogImage(sourceUrl: string): Promise<string> {
  // Local assets (e.g. /assets/images/manual.webp) need no mirroring.
  if (!/^https?:\/\//i.test(sourceUrl)) return sourceUrl

  try {
    const supabase = getSupabase()
    const publicUrl = (key: string) => supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl
    const id = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 20)
    const keys = { original: `${FOLDER}/${id}-orig`, card: `${FOLDER}/${id}.webp` }

    const { data: cardExists } = await supabase.storage.from(BUCKET).exists(keys.card)
    if (cardExists) return publicUrl(keys.card)

    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`image download failed (${res.status})`)
    const original = Buffer.from(await res.arrayBuffer())

    const { data: originalExists } = await supabase.storage.from(BUCKET).exists(keys.original)
    if (!originalExists) await upload(supabase, keys.original, original, res.headers.get('content-type') ?? undefined)

    try {
      // Dynamic import: sharp is a native module only needed at build time.
      const sharp = (await import('sharp')).default
      const card = await sharp(original)
        .resize({ width: CARD_WIDTH, withoutEnlargement: true })
        .webp({ quality: CARD_QUALITY })
        .toBuffer()
      await upload(supabase, keys.card, card, 'image/webp')
      return publicUrl(keys.card)
    } catch (e) {
      console.warn(`[blog-images] card variant failed for ${keys.card}, serving original:`, (e as Error).message)
      return publicUrl(keys.original)
    }
  } catch (e) {
    console.warn(`[blog-images] mirror failed for ${sourceUrl}, serving source directly:`, (e as Error).message)
    return sourceUrl
  }
}
