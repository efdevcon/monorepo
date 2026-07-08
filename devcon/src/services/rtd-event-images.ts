/**
 * Mirrors NocoDB attachment images into a public Supabase Storage bucket so
 * public pages serve stable, CDN-cacheable URLs instead of proxying NocoDB's
 * short-lived signed `/dltemp/` URLs through `/api/nocodb/file` on every view.
 *
 * The bucket key is derived from the row + attachment identity, so the mapping
 * is stateless: nothing is written back to NocoDB, and replacing an attachment
 * in NocoDB (new attachment id) automatically mirrors the new file.
 *
 * Server-only: uses SUPABASE_SERVICE_ROLE_KEY. Call from getStaticProps or an
 * API route, never the browser.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'rtd-event-images'
const FOLDER = 'rtd-events'

// Card display size: ~430px wide at the 3-column breakpoint, 2x for retina.
// Generated once per attachment at mirror time so the page never depends on
// a per-request image optimizer (whose cache Netlify purges on every deploy).
const CARD_WIDTH = 860
const CARD_QUALITY = 80

/** The slice of a NocoDB attachment cell entry we rely on. */
export interface NocoAttachment {
  id?: string
  title?: string
  mimetype?: string
  size?: number
  signedUrl?: string
  signedPath?: string
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

let client: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for image mirroring')
    }
    client = createClient(url, key)
  }
  return client
}

function storageKeys(rowId: string | number, att: NocoAttachment): { original: string; card: string } | null {
  const ext = EXT_BY_MIME[String(att.mimetype ?? '').toLowerCase()]
  if (!ext) return null
  // Attachment ids are stable per uploaded file; fall back to title+size so a
  // pre-id NocoDB row still gets a deterministic (if weaker) identity.
  const attId = att.id ?? `${att.title ?? 'file'}-${att.size ?? 0}`
  const safe = String(attId).replace(/[^a-zA-Z0-9._-]/g, '_')
  const base = `${FOLDER}/${rowId}-${safe}`
  return { original: `${base}.${ext}`, card: `${base}-card.webp` }
}

function downloadUrl(att: NocoAttachment): string | null {
  if (att.signedUrl) return att.signedUrl
  if (att.signedPath && process.env.NOCODB_BASE_URL) {
    return new URL(att.signedPath, process.env.NOCODB_BASE_URL).toString()
  }
  return null
}

async function upload(supabase: SupabaseClient, key: string, body: Buffer, contentType?: string): Promise<void> {
  const doUpload = () =>
    supabase.storage.from(BUCKET).upload(key, body, {
      contentType,
      // Keys are immutable (new attachment → new key), so cache forever.
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

async function download(att: NocoAttachment): Promise<Buffer> {
  const src = downloadUrl(att)
  if (!src) throw new Error('attachment has no signed download URL')
  const res = await fetch(src)
  if (!res.ok) throw new Error(`NocoDB download failed (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

/** Resize/re-encode to the card-sized WebP variant served on the public page. */
async function toCardWebp(original: Buffer): Promise<Buffer> {
  // Dynamic import: sharp is a native module only needed at build/revalidate.
  const sharp = (await import('sharp')).default
  return sharp(original, { animated: true })
    .resize({ width: CARD_WIDTH, withoutEnlargement: true })
    .webp({ quality: CARD_QUALITY })
    .toBuffer()
}

/**
 * Ensure the attachment is mirrored into the public bucket and return the
 * stable public URL of its card-sized WebP variant (or the original if the
 * variant can't be generated). Downloads from NocoDB and resizes at most once
 * per attachment; on every later call the existence check short-circuits.
 * Returns null for attachments we can't mirror (unknown mime type); throws on
 * transport errors so callers can fall back.
 */
export async function ensurePublicEventImage(rowId: string | number, att: NocoAttachment): Promise<string | null> {
  const keys = storageKeys(rowId, att)
  if (!keys) return null

  const supabase = getSupabase()
  const publicUrl = (key: string) => supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl

  const { data: cardExists } = await supabase.storage.from(BUCKET).exists(keys.card)
  if (cardExists) return publicUrl(keys.card)

  const original = await download(att)
  // Keep the full-size original alongside the card variant (e.g. for future
  // OG images, or regenerating variants at a different size).
  const { data: originalExists } = await supabase.storage.from(BUCKET).exists(keys.original)
  if (!originalExists) await upload(supabase, keys.original, original, att.mimetype)

  try {
    await upload(supabase, keys.card, await toCardWebp(original), 'image/webp')
  } catch (e) {
    console.warn(`[rtd-event-images] card variant failed for ${keys.card}, serving original:`, (e as Error).message)
    return publicUrl(keys.original)
  }
  return publicUrl(keys.card)
}
