// Admin: each Community Hub's sheet link, for the monitor page (/admin/community-hubs).
// The links are edit links (anyone holding one can change that hub's programme), so
// they stay server-side in COMMUNITY_HUB_SHEETS (JSON object, hub id -> link, same
// value as the GitHub secret of that name) and only the full admin password gets them.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
  if (!checkAdminAuth(req, res)) return
  const raw = process.env.COMMUNITY_HUB_SHEETS
  if (!raw) return res.status(500).json({ success: false, error: 'COMMUNITY_HUB_SHEETS not configured' })
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not a JSON object')
    const links = Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    )
    return res.status(200).json({ success: true, links })
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: 'COMMUNITY_HUB_SHEETS is not valid JSON',
      details: e instanceof Error ? e.message : String(e),
    })
  }
}
