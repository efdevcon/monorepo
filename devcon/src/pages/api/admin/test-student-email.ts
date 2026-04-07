import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_WEBHOOK_URL = process.env.N8N_STUDENT_WEBHOOK_URL || 'https://krux.co:8443/webhook/student-application-status'
const N8N_WEBHOOK_KEY = process.env.NOCODB_WEBHOOK_SECRET || ''
const ALLOWED_DOMAIN = '@ethereum.org'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  // Verify Supabase session from the access token in the Authorization header or cookie
  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies['sb-access-token'] ||
    // Supabase stores the session in a cookie like sb-<ref>-auth-token
    Object.entries(req.cookies).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'))?.[1]

  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user?.email) {
    return res.status(401).json({ success: false, error: 'Invalid session' })
  }

  if (!user.email.endsWith(ALLOWED_DOMAIN)) {
    return res.status(403).json({ success: false, error: `Only ${ALLOWED_DOMAIN} accounts are allowed` })
  }

  const { name, email, status } = req.body

  if (!email || !status) {
    return res.status(400).json({ success: false, error: 'Missing email or status' })
  }

  const payload = {
    type: 'records.after.update',
    id: 'test-' + Date.now(),
    base_id: 'p964xl4nowbllvq',
    version: 'v3',
    data: {
      table_id: 'm3bqjjne9mqgnue',
      table_name: 'Student Application',
      previous_rows: [
        {
          Id: 999,
          'Full Name': name || 'Test Applicant',
          'University / Organization': 'Test University',
          'Year of Study': '3rd Year',
          Country: 'Test',
          Status: 'To review',
          Email: email,
        },
      ],
      rows: [
        {
          Id: 999,
          'Full Name': name || 'Test Applicant',
          'University / Organization': 'Test University',
          'Year of Study': '3rd Year',
          Country: 'Test',
          Status: status,
          Email: email,
        },
      ],
    },
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (N8N_WEBHOOK_KEY) {
      headers['x-admin-key'] = N8N_WEBHOOK_KEY
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const data = await response.text()
    return res.status(response.status).json({ success: response.ok, n8nResponse: data })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
