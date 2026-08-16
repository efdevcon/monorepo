import type { NextApiRequest, NextApiResponse } from 'next'
import { startVerification, DigigoVerifyError } from '@digigo/verify/server'
import { TICKETING } from 'config/ticketing'

/**
 * Opens a DigiGo verification session for the browser.
 *
 * This is the ONLY place the DigiGo API key is used, and it is server-side: the
 * browser receives just a short-lived session token, which can drive this one
 * verification and nothing else. The key selects the event on its own (DigiGo
 * issues one key per event), so there is nothing else to configure.
 *
 * `@digigo/verify/server` ships a ready-made `createSessionRoute`, but it
 * returns a Web-standard `Request -> Response` handler — devcon is on the Pages
 * Router, so this calls `startVerification` directly instead.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  if (!TICKETING.digigo.enabled) {
    return res.status(503).json({ error: 'DigiGo verification is not enabled' })
  }

  const apiKey = process.env.DIGIGO_API_KEY
  if (!apiKey) {
    console.error('[digigo-session] DIGIGO_API_KEY is not set')
    return res.status(503).json({ error: 'could not start verification' })
  }

  try {
    const { sessionToken } = await startVerification({ apiKey, ref: req.body?.ref })
    return res.status(200).json({ sessionToken })
  } catch (err) {
    // Never echo the upstream error: key-related detail stays in our logs.
    // The status still matters to the component — 503 renders "unavailable",
    // 410 renders "expired".
    console.error('[digigo-session] startVerification failed:', err)
    const status = err instanceof DigigoVerifyError ? err.status : 500
    return res.status(status).json({ error: 'could not start verification' })
  }
}
