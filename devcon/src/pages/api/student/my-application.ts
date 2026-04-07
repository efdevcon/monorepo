import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getSubmissionByEmail, getVoucherByEmail } from 'components/domain/student-applications/store'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const token = authHeader.slice(7)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user?.email) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const email = user.email.toLowerCase()

  const submission = await getSubmissionByEmail(email)
  const voucher = await getVoucherByEmail(email)

  return res.status(200).json({
    submission,
    voucherCode: voucher?.code ?? null,
  })
}
