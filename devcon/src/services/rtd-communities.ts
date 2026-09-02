/**
 * Road to Devcon community co-creators, sourced from the NocoDB
 * "RTD Communities Logos" table in the Road to Devcon base.
 *
 * Server-only: relies on NOCODB_BASE_URL + NOCODB_API_TOKEN (and Supabase
 * credentials for logo mirroring). Call from getStaticProps, never the browser.
 */
import { listTableRows } from './nocodb'
import { ensurePublicCommunityLogo, type NocoAttachment } from './rtd-event-images'
import { firstImageAttachment, isChecked, pick, proxyImageUrl, safeHttpUrl } from './rtd-events'
import type { RoadCommunity } from 'components/domain/road-to-devcon/communities'

const RTD_COMMUNITIES_LOGOS_TABLE_ID = 'mmxfm3qbk5sqb8u'

// NocoDB column titles → our fields. The first matching, non-empty column
// wins; extra fallbacks tolerate renames.
const FIELDS = {
  name: ['Name', 'Title', 'Community'],
  logo: ['Logo', 'Image'],
  url: ['Link', 'URL', 'Website'],
  featured: ['Featured', 'Published', 'Visible'],
} as const

/** A Featured row with the fields we need, before its logo has been mirrored. */
interface Candidate extends Omit<RoadCommunity, 'logo'> {
  rowId: string | number
  att: NocoAttachment
}

/**
 * Mirror the logo into Supabase Storage (no-op after the first time) so it
 * gets a stable public URL. A failed mirror falls back to the uncacheable
 * proxy URL rather than dropping the logo; null means nothing servable.
 */
async function resolveLogoUrl({ rowId, att }: Candidate): Promise<string | null> {
  try {
    return (await ensurePublicCommunityLogo(rowId, att)) ?? proxyImageUrl(att) ?? null
  } catch (e) {
    console.warn(`[rtd-communities] logo mirror failed for row ${rowId}, using proxy:`, (e as Error).message)
    return proxyImageUrl(att) ?? null
  }
}

export async function getRoadToDevconCommunities(): Promise<RoadCommunity[]> {
  const rows = await listTableRows(RTD_COMMUNITIES_LOGOS_TABLE_ID)

  const candidates: Candidate[] = []
  for (const row of rows) {
    // Fail-closed: only rows explicitly flagged Featured make it onto the page.
    if (!isChecked(pick(row, FIELDS.featured))) continue

    const name = pick(row, FIELDS.name)
    const att = firstImageAttachment(pick(row, FIELDS.logo))
    // A logo wall entry needs both a name (alt text) and an image.
    if (!name || !att) continue

    const rowId = row.Id ?? row.id ?? String(name)
    candidates.push({
      id: `nocodb-${rowId}`,
      name: String(name),
      // null, not undefined — getStaticProps serializes null but throws on undefined.
      url: safeHttpUrl(pick(row, FIELDS.url)),
      rowId,
      att,
    })
  }

  const resolved = await Promise.all(
    candidates.map(async (c): Promise<RoadCommunity | null> => {
      const logo = await resolveLogoUrl(c)
      return logo ? { id: c.id, name: c.name, logo, url: c.url } : null
    })
  )
  return resolved.filter((c): c is RoadCommunity => c !== null)
}
