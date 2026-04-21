/**
 * Thin proxy: forwards to Pretix plugin /plugin/x402/admin/orders.
 * All business logic (order listing, stats) lives in the plugin now.
 *
 * Keep the existing ADMIN_SECRET check — devcon-next still enforces admin auth
 * at the public edge; the plugin uses Pretix API token auth.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { pluginFetch } from 'services/pretixPluginProxy'
import { TICKETING, TICKETING_ENV } from 'config/ticketing'

const ADMIN_SECRET = process.env.X402_ADMIN_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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
    const { status, body } = await pluginFetch<{
      success: boolean
      stats?: { pending: number; completed: number; totalUsd: string }
      completed?: Array<Record<string, unknown>>
      pending?: Array<Record<string, unknown>>
      error?: string
    }>('/plugin/x402/admin/orders/', { method: 'GET' })

    // Stamp env + base URL so the admin UI can label rows by environment
    // when multiple Pretix instances are proxied through the same build.
    if (body && body.success) {
      const envLabel = TICKETING_ENV
      const baseUrl = TICKETING.pretix.baseUrl
      body.completed = (body.completed || []).map(o => ({ ...o, env: envLabel }))
      body.pending = (body.pending || []).map(o => ({ ...o, env: envLabel }))
      ;(body as Record<string, unknown>).env = envLabel
      ;(body as Record<string, unknown>).pretixBaseUrl = baseUrl
    }
    return res.status(status).json(body)
  } catch (e) {
    console.error('[x402 proxy] orders error:', e)
    return res.status(502).json({ success: false, error: 'Pretix plugin unreachable' })
  }
}
