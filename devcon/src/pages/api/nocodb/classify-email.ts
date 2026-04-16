import type { NextApiRequest, NextApiResponse } from 'next'
import { classifyEmail, classifyEmailWithAI } from 'services/email-classifier'

const ADMIN_EMAILS = new Set(['lasse.jacobsen@ethereum.org'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { email, callerEmail } = req.body

  if (!callerEmail || !ADMIN_EMAILS.has(callerEmail)) {
    return res.status(403).json({ success: false, error: 'Not authorized' })
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email is required' })
  }

  try {
    const heuristic = classifyEmail(email)

    let ai = null
    try {
      ai = await classifyEmailWithAI(email)
    } catch {
      // AI enrichment is best-effort
    }

    return res.status(200).json({
      success: true,
      heuristic,
      ai,
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
}
