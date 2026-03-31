import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isVoucherAdmin } from 'components/domain/student-applications/config'

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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user?.email) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  if (!isVoucherAdmin(user.email)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { codes } = req.body ?? {}
  if (!Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({ error: 'No voucher codes provided' })
  }

  // Filter to non-empty strings
  const cleanCodes = codes.map((c: unknown) => String(c).trim()).filter(Boolean)
  if (cleanCodes.length === 0) {
    return res.status(400).json({ error: 'No valid voucher codes found' })
  }

  const CHUNK_SIZE = 500
  let inserted = 0
  let duplicates = 0

  for (let i = 0; i < cleanCodes.length; i += CHUNK_SIZE) {
    const chunk = cleanCodes.slice(i, i + CHUNK_SIZE).map((code: string) => ({ code }))
    const { error, count } = await supabase.from('devcon8_student_vouchers').upsert(chunk, {
      onConflict: 'code',
      ignoreDuplicates: true,
      count: 'exact',
    })
    if (error) {
      return res.status(500).json({ error: `Import failed at offset ${i}: ${error.message}`, inserted })
    }
    inserted += count ?? chunk.length
  }

  duplicates = cleanCodes.length - inserted

  return res.status(200).json({ inserted, duplicates, total: cleanCodes.length })
}
