import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'

const BUCKET = 'og-tickets'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, xUsername } = req.body
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing order code' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Storage not configured' })
  }

  const hash = createHash('sha256').update(code).digest('hex').slice(0, 16)

  // Fetch avatar from unavatar.io (server-side, 5s timeout)
  const cleanUsername = xUsername ? xUsername.replace(/^@/, '') : ''
  if (!cleanUsername) {
    return res.status(400).json({ error: 'Missing xUsername' })
  }

  try {
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

    return res.status(200).json({ success: true, hash })
  } catch (err) {
    console.error('[ticket/generate] error:', err)
    return res.status(500).json({ error: 'Generation failed' })
  }
}
