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
    // Fetch avatar and display name in parallel
    const avatarPromise = fetch(`https://unavatar.io/x/${cleanUsername}`, {
      signal: AbortSignal.timeout(5000),
    })
    const displayNamePromise = fetch(`https://api.microlink.io/?url=https://x.com/${cleanUsername}`, {
      signal: AbortSignal.timeout(5000),
    }).then(async r => {
      const meta = await r.json()
      const title = meta?.data?.title || ''
      const match = title.match(/^(.+?)\s*\(@/)
      return match ? match[1].trim() : null
    }).catch(() => null)

    const [avatarRes, displayName] = await Promise.all([avatarPromise, displayNamePromise])

    if (!avatarRes.ok) {
      return res.status(200).json({ success: true, hash, displayName, version: '' })
    }

    let avatarBuffer: Buffer
    try {
      avatarBuffer = Buffer.from(await avatarRes.arrayBuffer())
    } catch {
      // Body already consumed (redirect chain / connection reset) — continue without avatar
      return res.status(200).json({ success: true, hash, displayName, version: '' })
    }

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
      // Avatar upload failed but we still have the hash and display name
      return res.status(200).json({ success: true, hash, displayName, version: '' })
    }

    return res.status(200).json({ success: true, hash, displayName, version: Math.floor(Date.now() / 1000).toString() })
  } catch (err) {
    console.error('[ticket/generate] error:', err)
    return res.status(500).json({ error: 'Generation failed' })
  }
}
