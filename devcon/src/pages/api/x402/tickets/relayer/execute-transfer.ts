/**
 * Thin proxy: forwards to Pretix plugin /plugin/x402/relayer/execute-transfer.
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
