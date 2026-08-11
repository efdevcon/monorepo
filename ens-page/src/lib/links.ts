import { LINKS_API } from '../config'

// Campaign links managed by comms in Notion, served (cached) by devcon.org.
// Shape contract with devcon/src/pages/api/links/index.ts.
export interface CampaignLink {
  id?: string
  title: string
  url: string
  image: string | null
  order: number
}

// Best-effort click counter: bumps the link's Clicks number in Notion (via
// devcon.org) so comms sees per-button stats in the table they edit.
// POST to the same path the data comes from + a plain fetch with keepalive
// (survives the navigation), NOT sendBeacon to a /click/ URL: ad blockers
// match tracking-ish URLs and the beacon request type.
export function reportClick(link: CampaignLink): void {
  if (!link.id) return
  try {
    fetch(`${LINKS_API}?id=${encodeURIComponent(link.id)}`, { method: 'POST', keepalive: true }).catch(() => {})
  } catch {
    // stats must never break a click
  }
}

export async function fetchLinks(): Promise<CampaignLink[]> {
  // ?preview on the page URL calls the uncached read-only preview/ endpoint:
  // lets editors see Notion changes immediately without publishing them
  // (publishing = the "push live" link in Notion, which purges the CDN
  // cache). Separate path rather than a query param: Netlify's CDN excludes
  // unknown query params from the cache key.
  const preview = new URLSearchParams(window.location.search).has('preview')
  const res = await fetch(preview ? `${LINKS_API.replace(/\/$/, '')}/preview/` : LINKS_API)
  if (!res.ok) throw new Error(`links api responded ${res.status}`)
  const data = (await res.json()) as { success?: unknown; links?: unknown }
  if (data?.success !== true || !Array.isArray(data.links)) throw new Error('links api returned unexpected shape')
  return data.links as CampaignLink[]
}
