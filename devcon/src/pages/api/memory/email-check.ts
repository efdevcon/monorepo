import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { emailHash } from 'services/memory/codes'
import { MEMORY_CHAIN, MEMORY_CHAINS } from 'services/memory/memory'

/**
 * Proof of concept (pages/tickets/check, /en/tickets/check/): GET with the email-code session
 * (Bearer) -> how many checked-in Devcon 8 tickets were emailed to this
 * address, and how many of them minted their memory. Matches on the keyed
 * email hash stored with each code (services/memory/codes.ts emailHash), so
 * no email address is stored or compared in the clear. Answers only for the
 * signed-in address; 503 where MEMORY_EMAIL_SECRET isn't set.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').end()
  res.setHeader('Cache-Control', 'private, no-store')
  const fail = (status: number, error: string) => res.status(status).json({ success: false, error })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const emailSecret = process.env.MEMORY_EMAIL_SECRET
  if (!supabaseUrl || !serviceKey || !emailSecret) return fail(503, 'Ticket check is not available here')

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return fail(401, 'Authentication required')

  try {
    const db = createClient(supabaseUrl, serviceKey)
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(authHeader.slice(7))
    if (authError || !user?.email) return fail(401, 'Invalid or expired session')

    const { data: codes, error } = await db
      .from('devcon8_memory_codes')
      .select('ticket_key, claimed_at')
      .eq('email_hmac', emailHash(emailSecret, user.email))
    if (error) throw error
    const keys = (codes ?? []).map(c => c.ticket_key as string)

    let minted = 0
    if (keys.length) {
      const { count, error: mintError } = await db
        .from('devcon8_memory_mints')
        .select('ticket_key', { count: 'exact', head: true })
        .eq('chain_id', MEMORY_CHAINS[MEMORY_CHAIN].id)
        .eq('status', 'minted')
        .in('ticket_key', keys)
      if (mintError) throw mintError
      minted = count ?? 0
    }

    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        tickets: keys.length,
        claimed: (codes ?? []).filter(c => c.claimed_at).length,
        minted,
      },
    })
  } catch (err) {
    console.error('[api/memory/email-check]', err)
    return fail(500, 'Something went wrong, please try again')
  }
}
