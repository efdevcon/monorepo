import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getFormConfig } from 'config/nocodb-forms'
import { getTableFields, createRow, findRowByEmail, updateRow } from 'services/nocodb'
import { classifyEmailWithAI } from 'services/email-classifier'

const WHITELISTED_DOMAINS = new Set([
  'ethereum.org',
  // Add more pre-approved domains here
])

type EmailClassificationState = 'unverified' | 'verified' | 'whitelisted'


function getEmailClassificationState(email: string, aiOrgType: string): EmailClassificationState {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return 'unverified'

  // Pre-approved domains skip AI entirely
  if (WHITELISTED_DOMAINS.has(domain)) return 'whitelisted'

  // University/education domains are whitelisted
  if (aiOrgType === 'university') return 'whitelisted'

  // Government/organization domains are verified (real org, not personal/disposable)
  if (aiOrgType === 'government' || aiOrgType === 'organization') return 'verified'

  // Personal/disposable/unknown = just verified (they proved email ownership via OTP)
  return 'verified'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { slug } = req.query
  if (typeof slug !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid slug' })
  }

  const { data } = req.body ?? {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ success: false, error: 'Missing or invalid data' })
  }

  try {
    const config = getFormConfig(slug)

    // Auth check: if form requires OTP, validate Supabase session
    let verifiedEmail: string | null = null

    if (config.requireOtp) {
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

      if (authError || !user?.email) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session' })
      }

      verifiedEmail = user.email.toLowerCase()
    }

    // Validate fields against schema
    const fields = await getTableFields(slug)
    const validNames = new Set(fields.map(f => f.column_name))

    for (const key of Object.keys(data)) {
      if (!validNames.has(key)) {
        return res.status(400).json({ success: false, error: `Unknown field: ${key}` })
      }
    }

    // Email classification: run on verified email, add to row data
    if (verifiedEmail) {
      const domain = verifiedEmail.split('@')[1]?.toLowerCase() ?? ''
      let classificationState: EmailClassificationState = 'verified'

      if (WHITELISTED_DOMAINS.has(domain)) {
        // Skip AI for pre-approved domains
        classificationState = 'whitelisted'
      } else {
        // Run AI classification
        const classification = await classifyEmailWithAI(verifiedEmail)
        classificationState = getEmailClassificationState(verifiedEmail, classification.organizationType)
      }

      data['Email Classification'] = classificationState
    }

    data['Submission Date'] = new Date().toISOString()

    // Upsert: if user already submitted (matched by email), update their row
    if (verifiedEmail) {
      const emailColumn = fields.find(f => f.type === 'Email')?.column_name
      const existingRow = emailColumn ? await findRowByEmail(slug, emailColumn, verifiedEmail) : null
      if (existingRow) {
        await updateRow(slug, existingRow.Id, data)
        return res.status(200).json({ success: true, updated: true })
      }
    }

    await createRow(slug, data)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[nocodb/submit]', err)
    const msg = (err as Error).message
    if (msg.includes('Unknown form slug')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    return res.status(500).json({ success: false, error: 'Submission failed', details: msg })
  }
}
