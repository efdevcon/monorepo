import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { getOrder } from 'services/pretix'

const BUCKET = 'og-tickets'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, secret, xUsername } = req.body
  if (!code || typeof code !== 'string' || !secret || typeof secret !== 'string') {
    return res.status(400).json({ error: 'Missing order code or secret' })
  }

  const cleanUsername = xUsername ? xUsername.replace(/^@/, '') : ''
  if (!cleanUsername) {
    return res.status(400).json({ error: 'Missing xUsername' })
  }

  // Validate order against Pretix
  try {
    const order = await getOrder(code)
    if (order.secret !== secret) {
      return res.status(403).json({ error: 'Invalid order secret' })
    }
  } catch {
    return res.status(404).json({ error: 'Order not found' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Storage not configured' })
  }

  const hash = createHash('sha256').update(code).digest('hex').slice(0, 16)

  try {
    // Fetch avatar from unavatar.io (server-side, 5s timeout)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const avatarRes = await fetch(`https://unavatar.io/x/${cleanUsername}`, { signal: controller.signal })
    clearTimeout(timeout)

    if (!avatarRes.ok) {
      return res.status(502).json({ error: 'Could not fetch avatar from X' })
    }

    const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer())

    // Upload avatar to Supabase
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${hash}_avatar.png`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: avatarBuffer,
    })

    if (!uploadRes.ok) {
      return res.status(502).json({ error: 'Failed to upload avatar' })
    }

    // Try to resolve X display name (best-effort, no auth needed)
    let displayName: string | null = null
    try {
      const metaRes = await fetch(`https://api.microlink.io/?url=https://x.com/${cleanUsername}`, {
        signal: AbortSignal.timeout(5000),
      })
      const meta = await metaRes.json()
      const title = meta?.data?.title || ''
      // Format: "Display Name (@username) on X"
      const match = title.match(/^(.+?)\s*\(@/)
      if (match) displayName = match[1].trim()
    } catch {
      // Not critical — fall back to username
    }

    return res.status(200).json({ success: true, hash, displayName })
  } catch (err) {
    console.error('[ticket/generate] error:', err)
    return res.status(500).json({ error: 'Generation failed' })
  }
}
