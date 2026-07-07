/**
 * Thin proxy: forwards to Pretix plugin /plugin/admin/wc-verify.
 * Admin-operated manual verification for the legacy wc_inject flow —
 * counterpart of /admin/verify (x402). Used when a buyer's auto-verify
 * didn't complete (closed browser, RPC blip, slow wallet broadcast).
 *
 * The plugin re-runs the full on-chain verification pipeline (tx hash
 * uniqueness, payer match, recipient + amount + confirmations). The
 * buyer's create-quote signature is intentionally skipped (admin can't
 * recover it post-hoc); payer binding falls back to on-chain `tx.from`
 * which the plugin still enforces.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { pluginFetch } from 'services/pretixPluginProxy'
import { checkAdminAuth } from 'utils/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!checkAdminAuth(req, res)) return
  try {
    const { status, body } = await pluginFetch('/plugin/admin/wc-verify/', {
      method: 'POST',
      body: req.body,
    })
    return res.status(status).json(body)
  } catch (e) {
    console.error('[x402 proxy] admin wc-verify error:', e)
    return res.status(502).json({ success: false, error: 'Pretix plugin unreachable' })
  }
}
