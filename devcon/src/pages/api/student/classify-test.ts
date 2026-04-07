import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from 'components/domain/student-applications/config'
import { classifyEmailWithAI } from 'services/email-classifier'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  if (!isAdmin(user.email)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { email } = req.body ?? {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  const classification = await classifyEmailWithAI(email)
  return res.status(200).json({ classification })
}
