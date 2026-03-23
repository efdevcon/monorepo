import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { classifyEmailWithAI } from 'services/email-classifier'
import { getSubmissionByEmail, createSubmission, updateSubmission, getVoucherByEmail } from 'components/domain/student-applications/store'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
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

  const { name, university, yearOfStudy, fieldOfStudy, country, essayProofOfWork } = req.body ?? {}
  if (!name || !university || !yearOfStudy || !fieldOfStudy || !country || !essayProofOfWork) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  const fields = { name, university, yearOfStudy, fieldOfStudy, country, essayProofOfWork }

  if (req.method === 'PUT') {
    // Update existing submission
    const existing = await getSubmissionByEmail(email)
    if (!existing) {
      return res.status(404).json({ error: 'No existing submission found' })
    }

    // Block edits if voucher already granted
    const voucher = await getVoucherByEmail(email)
    if (voucher) {
      return res.status(403).json({ error: 'Cannot edit — voucher already granted' })
    }

    await updateSubmission(email, fields)
    return res.status(200).json({ success: true })
  }

  // POST — create new submission
  const existing = await getSubmissionByEmail(email)
  if (existing) {
    return res.status(409).json({ error: 'You have already submitted an application' })
  }

  // Classify email for enrichment (admins see classification in review)
  const classification = await classifyEmailWithAI(email)

  await createSubmission({
    email,
    ...fields,
    classificationType: classification.organizationType,
    classificationDomain: classification.rootDomain ?? undefined,
    isUniversityEmail: classification.isUniversity,
    signals: classification.signals.join(', '),
  })

  return res.status(200).json({ success: true })
}
