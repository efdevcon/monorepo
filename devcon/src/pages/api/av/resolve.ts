import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { AV_EVENT_ID, isSessionCode } from 'services/av/av-assets'
import { devconApiUrl } from 'services/social-cards/data'

/**
 * A session's Pretalx code from the id in an app link (app.devcon.org/schedule/<slug>):
 * devcon-api knows both and answers the same session for either.
 *
 * GET ?id=<slug or code> -> { code }
 */
const ID = /^[a-z0-9][a-z0-9-]{0,140}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  const id = String(req.query.id || '').trim()
  if (!ID.test(id)) return res.status(400).json({ success: false, error: 'not a session id' })
  try {
    const r = await fetch(`${devconApiUrl()}/sessions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(8000) })
    const body = r.ok ? await r.json() : null
    const data = body?.data
    if (!data) return res.status(404).json({ success: false, error: `no session "${id}" on devcon.org` })
    if (data.eventId !== AV_EVENT_ID)
      return res.status(404).json({ success: false, error: `"${id}" is a ${data.eventId} session, not Devcon 8` })
    if (!isSessionCode(data.sourceId))
      return res.status(404).json({ success: false, error: `"${id}" has no Pretalx code` })
    return res.status(200).json({ success: true, data: { code: String(data.sourceId).toUpperCase() } })
  } catch (error) {
    console.error(`[av] resolve ${id} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: 'could not look the link up on devcon.org' })
  }
}
