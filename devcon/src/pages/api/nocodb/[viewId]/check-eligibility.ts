import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { classifyEligibility } from 'services/email-classifier'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
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

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user?.email) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' })
    }

    const result = await classifyEligibility(user.email)
    return res.status(200).json({ success: true, bucket: result.bucket })
  } catch (err) {
    console.error('[nocodb/check-eligibility]', err)
    return res.status(500).json({
      success: false,
      error: 'Eligibility check failed',
      details: (err as Error).message,
    })
  }
}
