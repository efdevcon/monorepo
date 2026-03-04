import type { NextApiRequest, NextApiResponse } from 'next'

const PARAGRAPH_API_KEY = process.env.PARAGRAPH_API_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  if (!PARAGRAPH_API_KEY) {
    return res.status(500).json({ success: false, error: 'PARAGRAPH_API_KEY not configured' })
  }

  const { email } = req.body ?? {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email is required' })
  }

  try {
    const response = await fetch('https://public.api.paragraph.com/api/v1/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PARAGRAPH_API_KEY}`,
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data.msg || 'Subscription failed' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[subscribe]', err)
    return res.status(500).json({ success: false, error: 'Subscription failed' })
  }
}
