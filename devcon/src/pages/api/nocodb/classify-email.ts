import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { classifyEmail, classifyEmailWithAI } from 'services/email-classifier'

const ADMIN_EMAILS = new Set(['lasse.jacobsen@ethereum.org'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: 'Auth service not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user?.email || !ADMIN_EMAILS.has(user.email.toLowerCase())) {
    return res.status(403).json({ success: false, error: 'Not authorized' })
  }

  const { email } = req.body
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
