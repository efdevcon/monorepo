import { LINKS_API } from '../config'

// Campaign links managed by comms in Notion, served (cached) by devcon.org.
// Shape contract with devcon/src/pages/api/links/index.ts.
export interface CampaignLink {
  title: string
  url: string
  image: string | null
  order: number
}

export async function fetchLinks(): Promise<CampaignLink[]> {
  // ?preview on the page URL bypasses the API's CDN cache: lets editors see
  // Notion changes immediately (for themselves) instead of within ~1h. The
  // "push live for everyone" action is the refresh link in the Notion DB
  // description (purges the CDN cache server-side).
  const url = new URL(LINKS_API)
  if (new URLSearchParams(window.location.search).has('preview')) url.searchParams.set('refresh', '1')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`links api responded ${res.status}`)
  const data = (await res.json()) as { success?: unknown; links?: unknown }
  if (data?.success !== true || !Array.isArray(data.links)) throw new Error('links api returned unexpected shape')
  return data.links as CampaignLink[]
}
