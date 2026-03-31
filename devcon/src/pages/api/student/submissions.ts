import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isReviewerAdmin } from 'components/domain/student-applications/config'
import { listSubmissions, updateSubmissionStatus, getVoucherStats, getSubmissionById } from 'components/domain/student-applications/store'
import { sendRejectionEmail } from 'services/student-emails'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getAuthEmail(req: NextApiRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user?.email) return null
  return user.email.toLowerCase()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = await getAuthEmail(req)
  if (!email) return res.status(401).json({ error: 'Unauthorized' })
  if (!isReviewerAdmin(email)) return res.status(403).json({ error: 'Forbidden' })

  if (req.method === 'GET') {
    const [submissions, voucherStats] = await Promise.all([listSubmissions(), getVoucherStats()])
    return res.status(200).json({ submissions, voucherStats })
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body ?? {}
    if (!id || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid id or status' })
    }
    await updateSubmissionStatus(id, status)

    // Send rejection email when status changes to rejected
    if (status === 'rejected') {
      const submission = await getSubmissionById(id)
      if (submission) {
        try {
          await sendRejectionEmail(submission.email, submission.name)
        } catch (err) {
          console.error('Failed to send rejection email:', err)
        }
      }
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
