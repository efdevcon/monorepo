/**
 * Thin proxy: forwards to Pretix plugin /plugin/x402/relayer/execute-transfer.
 * DISABLED in production (2026-08-12): the plugin side has these x402 buyer
 * routes commented out of `_x402_routes()`, so this proxy returns the plugin's
 * 404. Before re-enabling, add OFAC screening of the payer — see the
 * compliance note in pretix-eth-payment-plugin/pretix_eth/urls.py.
 *
 * All business logic (gas-sponsored EIP-3009 transfer execution) lives in the plugin now.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { pluginFetch } from 'services/pretixPluginProxy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  const { status, body } = await pluginFetch('/plugin/x402/relayer/execute-transfer/', {
    method: 'POST',
    body: req.body,
  })
  return res.status(status).json(body)
}
