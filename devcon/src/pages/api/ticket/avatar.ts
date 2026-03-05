import type { NextApiRequest, NextApiResponse } from 'next'

const BUCKET = 'og-tickets'

export const config = {
  api: { bodyParser: { sizeLimit: '512kb' } },
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, xUsername, image } = req.body
  if (!xUsername || !image) {
    return res.status(400).json({ error: 'Missing xUsername or image' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Storage not configured' })
  }

  // Decode base64 image data
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
  const imageBuffer = Buffer.from(base64Data, 'base64')

  const avatarKey = `avatar--${sanitize(xUsername)}.png`

  // Upload avatar
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${avatarKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: imageBuffer,
  })

  if (!uploadRes.ok) {
    return res.status(502).json({ error: 'Failed to upload avatar' })
  }

  // Bust the cached OG image so it regenerates with the new avatar
  if (name) {
    const ogKey = `${sanitize(name)}--${sanitize(xUsername)}.png`
    await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${ogKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supabaseKey}` },
    })
  }

  return res.status(200).json({ ok: true })
}
