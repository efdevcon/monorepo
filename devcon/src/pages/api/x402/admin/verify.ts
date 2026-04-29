/**
 * Thin proxy: forwards to Pretix plugin /plugin/x402/admin/verify.
 * Admin-operated manual verification — used when a buyer's auto-verify
 * flow didn't complete (browser crash, wallet disconnected, RPC blip).
 *
 * The plugin re-runs the full verification pipeline with the same
 * security controls (tx_hash uniqueness, payer match, ETH signature,
 * on-chain recipient+amount). This route just authz-gates at the edge.
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
  try {
    const { status, body } = await pluginFetch('/plugin/x402/admin/verify/', {
      method: 'POST',
      body: req.body,
    })
    return res.status(status).json(body)
  } catch (e) {
    console.error('[x402 proxy] admin verify error:', e)
    return res.status(502).json({ success: false, error: 'Pretix plugin unreachable' })
  }
}
