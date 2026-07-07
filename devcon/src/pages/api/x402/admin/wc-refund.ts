/**
 * Thin proxy: forwards to Pretix plugin /plugin/admin/wc-refund.
 * Records an on-chain refund of a legacy WalletConnect (pre-x402) order
 * as a Pretix OrderRefund. Idempotency lives plugin-side (duplicate
 * refund_tx_hash → 409). All other business logic is the plugin.
 *
 * Auth: same admin-secret gate as the other admin proxies; the plugin
 * itself uses Pretix's API token auth.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { pluginFetch } from 'services/pretixPluginProxy'
import { checkAdminAuth } from 'utils/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!checkAdminAuth(req, res)) return
  const body = (req.body && typeof req.body === 'object') ? (req.body as Record<string, unknown>) : {}

  let proxyResult: { status: number; body: unknown }
  try {
    proxyResult = await pluginFetch('/plugin/admin/wc-refund/', {
      method: 'POST',
      body,
    })
  } catch (e) {
    console.error('[x402 proxy] wc-refund error:', e)
    return res.status(502).json({ success: false, error: 'Pretix plugin unreachable' })
  }
  return res.status(proxyResult.status).json(proxyResult.body)
}
