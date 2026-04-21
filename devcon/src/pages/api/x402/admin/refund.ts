/**
 * Thin proxy: forwards to Pretix plugin /plugin/x402/admin/refund.
 * All business logic (refund initiation, confirmation, failure) lives in the plugin now.
 *
 * Keep the existing ADMIN_SECRET check — devcon-next still enforces admin auth
 * at the public edge; the plugin uses a separate s2s secret.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { pluginFetch } from 'services/pretixPluginProxy'

const ADMIN_SECRET = process.env.X402_ADMIN_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!ADMIN_SECRET) {
    return res.status(500).json({ success: false, error: 'X402_ADMIN_SECRET not configured' })
  }
  const provided = (req.headers['x-admin-key'] as string | undefined) || (req.query.secret as string | undefined) || ''
  if (provided !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'unauthorized' })
  }
  // Frontend sends `action` in the JSON body (initiate/confirm/fail); the
  // plugin reads it from the URL query. Pull it from whichever side we got it.
  const body = (req.body && typeof req.body === 'object') ? (req.body as Record<string, unknown>) : {}
  const queryAction = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action
  const action = String(queryAction || body.action || '')
  if (!action) {
    return res.status(400).json({ success: false, error: 'action is required (initiate|confirm|fail)' })
  }

  let proxyResult: { status: number; body: unknown }
  try {
    proxyResult = await pluginFetch(
      `/plugin/x402/admin/refund/?action=${encodeURIComponent(action)}`,
      {
        method: 'POST',
        body,
      },
    )
  } catch (e) {
    console.error('[x402 proxy] refund error:', e)
    return res.status(502).json({ success: false, error: 'Pretix plugin unreachable' })
  }
  return res.status(proxyResult.status).json(proxyResult.body)
}
