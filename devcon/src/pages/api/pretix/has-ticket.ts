import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getPaidOrdersByEmail } from 'services/pretix'
import { isApprovedSpeaker } from 'services/pretalx'

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

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user?.email) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' })
    }

    const email = user.email.toLowerCase()
    // Eligibility for the visa form is a paid ticket OR approved-speaker status.
    // `hasTicket` is the field the frontend gate reads; it means "eligible".
    // `eligibility` tells the UI the basis (drives the "Valid speaker" tag).
    const orders = await getPaidOrdersByEmail(email)
    let eligibility: 'ticket' | 'speaker' | null = null
    if (orders.length > 0) eligibility = 'ticket'
    else if (await isApprovedSpeaker(email)) eligibility = 'speaker'
    return res.status(200).json({ success: true, hasTicket: eligibility !== null, eligibility, email })
  } catch (err) {
    console.error('[pretix/has-ticket]', err)
    return res.status(500).json({
      success: false,
      error: 'Ticket lookup failed',
      details: (err as Error).message,
    })
  }
}
