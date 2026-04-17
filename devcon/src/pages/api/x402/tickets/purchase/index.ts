/**
 * Thin proxy: forwards to Pretix plugin /plugin/x402/purchase.
 * All business logic (pending order creation, rate limiting, totals) lives
 * in the plugin now. This file exists to keep the public URL stable.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { pluginFetch } from 'services/pretixPluginProxy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  const { status, body } = await pluginFetch('/plugin/x402/purchase/', {
    method: 'POST',
    body: req.body,
  })
  return res.status(status).json(body)
}

/**
 * Legacy export consumed by `[email].ts` (agent endpoint).
 * The agent endpoint is NOT in scope for the x402 consolidation plan
 * (see Appendix A). This stub returns 501 until the agent route is
 * migrated to its own plugin endpoint.
 *
 * TODO: Migrate the agent endpoint to the Pretix plugin and remove this stub.
 */
export async function purchaseHandler(
  _req: NextApiRequest,
  res: NextApiResponse,
  _opts?: Record<string, unknown>,
): Promise<void> {
  res.status(501).json({
    success: false,
    error: 'purchaseHandler is deprecated — agent endpoint not yet migrated to Pretix plugin',
  })
}
