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
  const res = await fetch(LINKS_API)
  if (!res.ok) throw new Error(`links api responded ${res.status}`)
  const data = (await res.json()) as { success?: unknown; links?: unknown }
  if (data?.success !== true || !Array.isArray(data.links)) throw new Error('links api returned unexpected shape')
  return data.links as CampaignLink[]
}
