/**
 * Road to Devcon community co-creators, sourced from the NocoDB
 * "RTD Communities Logos" table in the Road to Devcon base.
 *
 * Server-only: relies on NOCODB_BASE_URL + NOCODB_API_TOKEN (and Supabase
 * credentials for logo mirroring). Call from getStaticProps, never the browser.
 */
import { listTableRows } from './nocodb'
import { ensurePublicCommunityLogo, type NocoAttachment } from './rtd-event-images'
import { firstImageAttachment, isChecked, pick, proxyImageUrl } from './rtd-events'
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

export async function getRoadToDevconCommunities(): Promise<RoadCommunity[]> {
  const rows = await listTableRows(RTD_COMMUNITIES_LOGOS_TABLE_ID)

  const communities: RoadCommunity[] = []
  const logos: Array<{ community: RoadCommunity; rowId: string | number; att: NocoAttachment }> = []
  for (const row of rows) {
    // Fail-closed: only rows explicitly flagged Featured make it onto the page.
    if (!isChecked(pick(row, FIELDS.featured))) continue

    const name = pick(row, FIELDS.name)
    const att = firstImageAttachment(pick(row, FIELDS.logo))
    // A logo wall entry needs both a name (alt text) and an image.
    if (!name || !att) continue

    const rowId = row.Id ?? row.id ?? String(name)
    const rawUrl = pick(row, FIELDS.url)
    const community: RoadCommunity = {
      id: `nocodb-${rowId}`,
      name: String(name),
      logo: '',
      // null, not undefined — getStaticProps serializes null but throws on undefined.
      url: rawUrl ? String(rawUrl) : null,
    }
    communities.push(community)
    logos.push({ community, rowId, att })
  }

  // Mirror attachments into Supabase Storage (no-op after the first time) so
  // logos get stable public URLs. A failed mirror falls back to the uncacheable
  // proxy URL rather than dropping the logo.
  await Promise.all(
    logos.map(async ({ community, rowId, att }) => {
      try {
        community.logo = (await ensurePublicCommunityLogo(rowId, att)) ?? proxyImageUrl(att) ?? ''
      } catch (e) {
        console.warn(`[rtd-communities] logo mirror failed for row ${rowId}, using proxy:`, (e as Error).message)
        community.logo = proxyImageUrl(att) ?? ''
      }
    })
  )

  // Drop anything that ended up with no servable logo URL at all.
  return communities.filter(c => c.logo)
}
