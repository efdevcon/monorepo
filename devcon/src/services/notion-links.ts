/**
 * Campaign links for the ens-page (devcon.eth.limo), managed by comms in a
 * Notion database and served by /api/links/.
 *
 * Notion file-attachment URLs expire after ~1 hour, so attachments are
 * mirrored into a public Supabase Storage bucket and the stable public URL is
 * returned instead (same pattern as rtd-event-images.ts for NocoDB). The
 * bucket key is derived from page id + the attachment's S3 pathname, so
 * replacing an image in Notion automatically mirrors the new file under a new
 * key, and an existence check short-circuits already-mirrored files.
 *
 * Server-only: uses NOTION_SECRET and SUPABASE_SERVICE_ROLE_KEY.
 */
import { createHash } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const NOTION_VERSION = '2022-06-28'
// Not a secret: a DB id grants no access without the integration token, and
// it's visible in the Notion URL. Env override kept for a future DB swap.
const NOTION_LINKS_DB_ID = process.env.NOTION_LINKS_DB_ID ?? '3b8638cdc415800abc4af8ba6c2af023'
const BUCKET = 'ens-page-links'
const FOLDER = 'links'
const THUMB_WIDTH = 192 // rendered at 40px, 192 covers retina + hover scale
const THUMB_QUALITY = 80

export interface CampaignLink {
  /** Notion page id; the ens-page click beacon reports it to /api/links/click/. */
  id: string
  title: string
  url: string
  image: string | null
  order: number
}

interface NotionFileCell {
  type: 'file' | 'external'
  file?: { url: string }
  external?: { url: string }
}

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
      // Keys are immutable (new attachment -> new key), so cache forever.
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
 * Mirror a Notion image (uploaded attachment or external URL) into the public
 * bucket and return its stable public URL (thumbnail webp, original as
 * fallback). Everything is mirrored so the page never depends on third-party
 * image hosts (hotlink blocks, slow hosts, link rot) or on Notion's expiring
 * attachment URLs. On mirror failure, external URLs degrade to being served
 * directly; attachments return null (their URL would expire anyway).
 */
async function resolveImage(pageId: string, cell: NotionFileCell | null): Promise<string | null> {
  if (!cell) return null
  const sourceUrl = (cell.type === 'external' ? cell.external?.url : cell.file?.url) ?? null
  if (!sourceUrl) return null

  try {
    const supabase = getSupabase()
    const publicUrl = (key: string) => supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl
    // Identity for the immutable bucket key: for Notion attachments the S3
    // pathname (the query string holds the expiring signature; re-uploads get
    // a new path); for external images the whole URL, so pasting a different
    // URL mirrors the new image.
    const identity = cell.type === 'external' ? sourceUrl : new URL(sourceUrl).pathname
    const id = createHash('sha1').update(identity).digest('hex').slice(0, 16)
    const base = `${FOLDER}/${pageId}-${id}`
    const keys = { original: `${base}-orig`, thumb: `${base}.webp` }

    const { data: thumbExists } = await supabase.storage.from(BUCKET).exists(keys.thumb)
    if (thumbExists) return publicUrl(keys.thumb)

    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`image download failed (${res.status})`)
    const original = Buffer.from(await res.arrayBuffer())

    const { data: originalExists } = await supabase.storage.from(BUCKET).exists(keys.original)
    if (!originalExists) await upload(supabase, keys.original, original, res.headers.get('content-type') ?? undefined)

    try {
      // Dynamic import: sharp is a native module only needed server-side.
      const sharp = (await import('sharp')).default
      const thumb = await sharp(original, { animated: true })
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer()
      await upload(supabase, keys.thumb, thumb, 'image/webp')
      return publicUrl(keys.thumb)
    } catch (e) {
      console.warn(`[notion-links] thumb failed for ${keys.thumb}, serving original:`, (e as Error).message)
      return publicUrl(keys.original)
    }
  } catch (e) {
    console.error(`[notion-links] image mirror failed for page ${pageId}:`, (e as Error).message)
    // A live external URL beats no image; expired attachment URLs do not.
    return cell.type === 'external' ? sourceUrl : null
  }
}

/**
 * Increment the Clicks counter on one link's Notion page (best-effort stats
 * shown to comms directly in the table). Returns false for ids that are not
 * pages of our links DB. Read-then-write, so a concurrent click can rarely
 * lose an increment: acceptable for rough marketing stats.
 */
export async function recordLinkClick(pageId: string): Promise<boolean> {
  const secret = process.env.NOTION_SECRET
  if (!secret) throw new Error('NOTION_SECRET is required')
  if (!/^[0-9a-f]{32}$|^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(pageId)) return false

  const headers = { Authorization: `Bearer ${secret}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' }
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers })
  if (!pageRes.ok) return false
  const page = await pageRes.json()

  // Only count pages that actually belong to the links DB.
  const parent = String(page?.parent?.database_id ?? '').replace(/-/g, '')
  if (parent !== NOTION_LINKS_DB_ID.replace(/-/g, '')) return false

  const clicks = (page?.properties?.Clicks?.number as number | null) ?? 0
  const patch = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ properties: { Clicks: { number: clicks + 1 } } }),
  })
  return patch.ok
}

export async function fetchNotionLinks(): Promise<CampaignLink[]> {
  const secret = process.env.NOTION_SECRET
  const dbId = NOTION_LINKS_DB_ID
  if (!secret) throw new Error('NOTION_SECRET is required')

  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filter: { property: 'Visible', checkbox: { equals: true } },
      sorts: [{ property: 'Order', direction: 'ascending' }],
      page_size: 100,
    }),
  })
  if (!res.ok) throw new Error(`Notion query failed (${res.status}): ${await res.text()}`)
  const data = await res.json()

  const links: CampaignLink[] = []
  for (const page of data.results as any[]) {
    const p = page.properties
    const title = ((p.Title?.title ?? []) as { plain_text: string }[])
      .map(t => t.plain_text)
      .join('')
      .trim()
    const url: string | null = p.URL?.url ?? null
    if (!title || !url) continue // incomplete rows are simply skipped
    links.push({
      id: page.id,
      title,
      url,
      image: await resolveImage(page.id, (p.Image?.files?.[0] as NotionFileCell | undefined) ?? null),
      order: p.Order?.number ?? 0,
    })
  }
  return links
}
