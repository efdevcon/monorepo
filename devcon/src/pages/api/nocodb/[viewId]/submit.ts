import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getFormConfigByViewId, isFormOpen } from 'services/form-config'
import { getTableFields, createRow, findRowByEmail, updateRow } from 'services/nocodb'
import { classifyEligibility } from 'services/email-classifier'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }

  const { data } = req.body ?? {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ success: false, error: 'Missing or invalid data' })
  }

  try {
    const config = await getFormConfigByViewId(viewId)

    if (config && !isFormOpen(config)) {
      return res.status(403).json({
        success: false,
        error: 'This form is no longer accepting submissions.',
      })
    }

    // Auth check: if form requires OTP, validate Supabase session
    let verifiedEmail: string | null = null

    if (config?.requireOtp) {
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
    } else {
      // For non-OTP forms, still extract email from token if provided
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey)
          const token = authHeader.slice(7)
          const { data: { user } } = await supabase.auth.getUser(token)
          if (user?.email) verifiedEmail = user.email.toLowerCase()
        }
      }
    }

    // Validate fields against schema. enrollment_proof is an Attachment column not
    // exposed via the form schema (Attachment uidt is filtered out), so allow it through.
    const fields = await getTableFields(viewId)
    const validNames = new Set(fields.map(f => f.column_name))
    validNames.add('enrollment_proof')

    for (const key of Object.keys(data)) {
      if (!validNames.has(key)) {
        return res.status(400).json({ success: false, error: `Unknown field: ${key}` })
      }
    }

    // Email classification & eligibility gate. Non-institutional ("blocked") emails
    // are now permitted as long as they attach proof of enrollment.
    if (verifiedEmail) {
      const { bucket } = await classifyEligibility(verifiedEmail)

      if (bucket === 'blocked') {
        const proof = data.enrollment_proof
        const hasProof = Array.isArray(proof) ? proof.length > 0 : !!proof
        if (!hasProof) {
          return res.status(400).json({
            success: false,
            error: 'Proof of enrollment is required for non-institutional emails.',
          })
        }
      } else {
        // Whitelisted/AI-university buckets shouldn't carry an enrollment_proof.
        delete data.enrollment_proof
      }

      // Map our cached "blocked" bucket to the NocoDB option label "proof-required".
      // (Cache keeps "blocked" — only the value written to NocoDB is renamed.)
      data['Email Classification'] = bucket === 'blocked' ? 'proof-required' : bucket
    }

    data['Submission Date'] = new Date().toISOString()

    // Upsert: if user already submitted, update their row
    if (verifiedEmail) {
      const emailColumn = fields.find(f => f.uidt === 'Email')?.column_name
      const existingRow = emailColumn ? await findRowByEmail(viewId, emailColumn, verifiedEmail) : null
      if (existingRow) {
        await updateRow(viewId, existingRow.Id, data)
        return res.status(200).json({ success: true, updated: true })
      }
    }

    await createRow(viewId, data)
    return res.status(200).json({ success: true })
  } catch (err) {
    const axiosBody = (err as any)?.response?.data
    console.error('[nocodb/submit]', err, axiosBody ? { axiosBody } : '')
    const msg = (err as Error).message
    if (msg.includes('Form view not found')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    const details = axiosBody ? `${msg} — ${typeof axiosBody === 'string' ? axiosBody : JSON.stringify(axiosBody)}` : msg
    return res.status(500).json({ success: false, error: 'Submission failed', details })
  }
}
