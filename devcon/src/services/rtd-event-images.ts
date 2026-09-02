/**
 * Mirrors NocoDB attachment images (event cards, community logos) into a public Supabase Storage bucket so
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

// Variants are generated once per attachment at mirror time so the page never
// depends on a per-request image optimizer (whose cache Netlify purges on
// every deploy).
const WEBP_QUALITY = 80

/** Where in the bucket a mirrored image lives and which resized variant to serve. */
interface MirrorOptions {
  /** Bucket folder, e.g. 'rtd-events'. */
  folder: string
  /** Resized WebP variant to generate and serve. */
  variant: { suffix: string; resize: { width?: number; height?: number } }
  /**
   * Also accept SVG attachments. They are rasterized into the WebP variant and
   * never stored or served as SVG — an SVG opened directly (rather than via
   * <img>) can run script on the bucket's origin. Off by default.
   */
  acceptSvg?: boolean
}

// Event cards: ~430px wide at the 3-column breakpoint, 2x for retina.
const EVENT_CARD: MirrorOptions = { folder: 'rtd-events', variant: { suffix: '-card', resize: { width: 860 } } }
// Community logos: rendered at h-14 (56px), 2x for retina. Wordmarks are often
// uploaded as SVG, so accept (and rasterize) those too.
const COMMUNITY_LOGO: MirrorOptions = {
  folder: 'rtd-communities',
  variant: { suffix: '-logo', resize: { height: 112 } },
  acceptSvg: true,
}

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
const SVG_MIME = 'image/svg+xml'
// SVGs have no intrinsic pixel size; render at a high density so a nominally
// small logo still downsizes cleanly to the variant instead of being upscaled.
const SVG_RASTER_DENSITY = 300

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

/**
 * Bucket keys for an attachment: the served WebP variant, plus the full-size
 * original (kept for future variants; null for SVG, which is never stored).
 * Returns null for mime types we don't mirror.
 */
function storageKeys(
  rowId: string | number,
  att: NocoAttachment,
  opts: MirrorOptions
): { original: string | null; variant: string; isSvg: boolean } | null {
  const mime = String(att.mimetype ?? '').toLowerCase()
  const isSvg = mime === SVG_MIME
  const ext = isSvg ? (opts.acceptSvg ? 'svg' : undefined) : EXT_BY_MIME[mime]
  if (!ext) return null
  // Attachment ids are stable per uploaded file; fall back to title+size so a
  // pre-id NocoDB row still gets a deterministic (if weaker) identity.
  const attId = att.id ?? `${att.title ?? 'file'}-${att.size ?? 0}`
  const safe = String(attId).replace(/[^a-zA-Z0-9._-]/g, '_')
  const base = `${opts.folder}/${rowId}-${safe}`
  return { original: isSvg ? null : `${base}.${ext}`, variant: `${base}${opts.variant.suffix}.webp`, isSvg }
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

/** Resize/re-encode to the WebP variant served on the public page. */
async function toWebpVariant(
  original: Buffer,
  resize: { width?: number; height?: number },
  isSvg: boolean
): Promise<Buffer> {
  // Dynamic import: sharp is a native module only needed at build/revalidate.
  const sharp = (await import('sharp')).default
  return (
    sharp(original, isSvg ? { density: SVG_RASTER_DENSITY } : { animated: true })
      // Never upscale rasters; an SVG has no intrinsic pixel size so it may scale to the target.
      .resize({ ...resize, withoutEnlargement: !isSvg })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
  )
}

/**
 * Ensure the attachment is mirrored into the public bucket and return the
 * stable public URL of its resized WebP variant (or the original if the
 * variant can't be generated). Downloads from NocoDB and resizes at most once
 * per attachment; on every later call the existence check short-circuits.
 * Returns null for attachments we can't mirror (unknown mime type); throws on
 * transport errors so callers can fall back.
 */
async function ensurePublicImage(
  rowId: string | number,
  att: NocoAttachment,
  opts: MirrorOptions
): Promise<string | null> {
  const keys = storageKeys(rowId, att, opts)
  if (!keys) return null

  const supabase = getSupabase()
  const publicUrl = (key: string) => supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl

  const { data: variantExists } = await supabase.storage.from(BUCKET).exists(keys.variant)
  if (variantExists) return publicUrl(keys.variant)

  const original = await download(att)
  // Keep the full-size original alongside the variant (e.g. for future OG
  // images, or regenerating variants at a different size).
  if (keys.original) {
    const { data: originalExists } = await supabase.storage.from(BUCKET).exists(keys.original)
    if (!originalExists) await upload(supabase, keys.original, original, att.mimetype)
  }

  try {
    await upload(supabase, keys.variant, await toWebpVariant(original, opts.variant.resize, keys.isSvg), 'image/webp')
  } catch (e) {
    // No stored original to fall back to for SVG — rethrow so the caller uses its own fallback.
    if (!keys.original) throw e
    console.warn(`[rtd-event-images] variant failed for ${keys.variant}, serving original:`, (e as Error).message)
    return publicUrl(keys.original)
  }
  return publicUrl(keys.variant)
}

/** Event card image: 860px-wide WebP under `rtd-events/`. */
export function ensurePublicEventImage(rowId: string | number, att: NocoAttachment): Promise<string | null> {
  return ensurePublicImage(rowId, att, EVENT_CARD)
}

/** Community logo: 112px-tall WebP under `rtd-communities/` (SVG input rasterized). */
export function ensurePublicCommunityLogo(rowId: string | number, att: NocoAttachment): Promise<string | null> {
  return ensurePublicImage(rowId, att, COMMUNITY_LOGO)
}
