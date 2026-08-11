import type { NextApiRequest, NextApiResponse } from 'next'
import { recordLinkClick } from 'services/notion-links'

/**
 * Click counter for the ens-page campaign links: increments the Clicks
 * number on the link's Notion row, so comms sees per-button stats directly
 * in the table they edit. Called via navigator.sendBeacon from the page
 * (POST, id in the query string so the beacon needs no body). Best-effort
 * raw counts: no dedup, no auth; recordLinkClick rejects ids outside the
 * links DB.
 */
type ResponseBody = { success: true } | { success: false; error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method not allowed' })

  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!id) return res.status(400).json({ success: false, error: 'id is required' })

  try {
    const counted = await recordLinkClick(id)
    if (!counted) return res.status(404).json({ success: false, error: 'unknown link' })
    return res.status(200).json({ success: true })
  } catch (e) {
    console.error('[api/links/click]', (e as Error).message)
    return res.status(502).json({ success: false, error: 'failed to record click' })
  }
}
