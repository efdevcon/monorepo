import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getTableFields, findRowByEmail, getAllTableColumns } from 'services/nocodb'
import { getFormConfigByViewId } from 'services/form-config'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }

  try {
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
      console.error('[nocodb/submission] auth failed', {
        viewId,
        authError: authError?.message,
        authStatus: (authError as any)?.status,
        hasUser: !!user,
        tokenLength: token.length,
      })
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
        details: authError?.message ?? 'No user returned from getUser',
      })
    }

    const email = user.email.toLowerCase()
    const fields = await getTableFields(viewId)
    // The Email column is often hidden from the form view — look it up against
    // the full underlying table so we can still match the user's existing row.
    const allColumns = await getAllTableColumns(viewId)
    const emailColumn = allColumns.find(f => f.uidt === 'Email')?.column_name

    // "Listed Emails Only" forms: tell the page up front whether this email is on the list (has a row),
    // so someone who isn't sees why right away instead of when they submit.
    // A config hiccup must not break loading answers on other forms; submit enforces the list regardless.
    const listedOnly = !!(await getFormConfigByViewId(viewId).catch(() => undefined))?.listedOnly

    if (!emailColumn) {
      return res.status(200).json({ success: true, data: null, ...(listedOnly ? { listed: false } : {}) })
    }

    const row = await findRowByEmail(viewId, emailColumn, email)

    if (!row) {
      return res.status(200).json({ success: true, data: null, ...(listedOnly ? { listed: false } : {}) })
    }

    const filtered: Record<string, any> = {}
    for (const field of fields) {
      if (row[field.column_name] !== undefined) {
        filtered[field.column_name] = row[field.column_name]
      }
    }
    // Pass through every Attachment column on the underlying table, even those
    // hidden from the form view (e.g. the student-application enrollment_proof),
    // so returning users see their previously uploaded files.
    for (const col of allColumns) {
      if (col.uidt === 'Attachment' && row[col.column_name] !== undefined) {
        filtered[col.column_name] = row[col.column_name]
      }
    }

    // Whether this submission has already been approved (read from the admin
    // "Status" column, which isn't part of the form view). Lets the client warn
    // the user that editing an approved submission triggers re-review.
    const approved = String(row['Status'] ?? '').toLowerCase().includes('approved')

    // On a listed-only form every invitee already has a row, so "answered before" is the
    // submission date the submit route writes, not the row itself.
    const listing = listedOnly ? { listed: true, submitted: !!row['Submission Date'] } : {}

    return res.status(200).json({ success: true, data: filtered, approved, ...listing })
  } catch (err) {
    console.error('[nocodb/submission]', err)
    const msg = (err as Error).message
    if (msg.includes('Form view not found')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch submission' })
  }
}
