import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getFormConfig } from 'config/nocodb-forms'
import { getTableFields, findRowByEmail } from 'services/nocodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  const { slug } = req.query
  if (typeof slug !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid slug' })
  }

  try {
    const config = getFormConfig(slug)

    if (!config.requireOtp) {
      return res.status(400).json({ success: false, error: 'This form does not support submission lookup' })
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

    const supabase = createClient(supabaseUrl, supabaseKey)
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user?.email) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' })
    }

    const email = user.email.toLowerCase()
    const fields = await getTableFields(slug)
    const emailColumn = fields.find(f => f.type === 'Email')?.column_name

    if (!emailColumn) {
      return res.status(200).json({ success: true, data: null })
    }

    const row = await findRowByEmail(slug, emailColumn, email)

    if (!row) {
      return res.status(200).json({ success: true, data: null })
    }

    // Only return form-visible fields
    const visibleNames = new Set(fields.map(f => f.column_name))
    const filtered: Record<string, any> = {}
    for (const field of fields) {
      if (row[field.column_name] !== undefined) {
        filtered[field.column_name] = row[field.column_name]
      }
    }

    return res.status(200).json({ success: true, data: filtered })
  } catch (err) {
    console.error('[nocodb/submission]', err)
    const msg = (err as Error).message
    if (msg.includes('Unknown form slug')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch submission', details: msg })
  }
}
