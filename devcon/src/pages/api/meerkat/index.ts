import type { NextApiRequest, NextApiResponse } from 'next'
import { appUrl, fetchMeerkatLive, fetchStageSessions, pickSession } from 'services/meerkat-redirect'

/**
 * Stage Q&A QR target: /api/meerkat/?mtm_placement=<room id> (as the /qr/meerkat/<room id>
 * redirect sends it; `?stage=<room id>` also works) → the event-app session on that
 * stage now: the one a Meerkat moderator put live there, else the schedule's.
 * See services/meerkat-redirect.ts for the rule.
 *
 * Never cached: the answer changes with the clock, and Netlify's CDN key ignores
 * the query string, so every stage would share one cached answer.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ''
  const roomId = (first(req.query.stage) || first(req.query.mtm_placement)).toLowerCase()
  const mtm = new URLSearchParams()
  for (const [k, v] of Object.entries(req.query)) if (k.startsWith('mtm_')) mtm.set(k, first(v))

  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Netlify-CDN-Cache-Control', 'no-store')
  try {
    const [sessions, meerkat] = roomId ? await Promise.all([fetchStageSessions(), fetchMeerkatLive(roomId)]) : [[], null]
    const pick = roomId ? pickSession(sessions, roomId, Date.now(), meerkat) : null
    if (pick) res.setHeader('X-Meerkat-Pick', `${pick.why} ${pick.session.id}`)
    res.redirect(302, appUrl(pick, mtm))
  } catch (e) {
    // The API being down must not strand someone holding a phone up to the screen.
    console.error('[api/meerkat]', (e as Error).message)
    res.redirect(302, appUrl(null, mtm))
  }
}
