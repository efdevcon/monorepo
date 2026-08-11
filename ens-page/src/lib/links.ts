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
  // ?preview on the page URL calls the uncached refresh/ endpoint: lets
  // editors see Notion changes immediately instead of within ~1h. It must be
  // a separate path (not a query param): Netlify's CDN excludes unknown query
  // params from the cache key, so ?refresh=1 would serve the cached copy.
  const preview = new URLSearchParams(window.location.search).has('preview')
  const res = await fetch(preview ? `${LINKS_API.replace(/\/$/, '')}/refresh/` : LINKS_API)
  if (!res.ok) throw new Error(`links api responded ${res.status}`)
  const data = (await res.json()) as { success?: unknown; links?: unknown }
  if (data?.success !== true || !Array.isArray(data.links)) throw new Error('links api returned unexpected shape')
  return data.links as CampaignLink[]
}
