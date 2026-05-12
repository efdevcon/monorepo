import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { classifyEligibility } from 'services/email-classifier'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

const MAX_BYTES = 5 * 1024 * 1024

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const nocodbBaseUrl = process.env.NOCODB_BASE_URL
  const nocodbToken = process.env.NOCODB_API_TOKEN
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: 'Auth service not configured' })
  }
  if (!nocodbBaseUrl || !nocodbToken) {
    return res.status(500).json({ success: false, error: 'NocoDB not configured' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user?.email) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' })
    }

    // Only the blocked bucket needs to upload proof — guard against misuse.
    const { bucket } = await classifyEligibility(user.email)
    if (bucket !== 'blocked') {
      return res.status(400).json({
        success: false,
        error: 'Proof upload is only required for non-institutional emails.',
      })
    }

    const contentType = req.headers['content-type']
    if (!contentType?.startsWith('multipart/form-data')) {
      return res.status(400).json({ success: false, error: 'Expected multipart/form-data' })
    }

    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of req) {
      total += (chunk as Buffer).length
      if (total > MAX_BYTES) {
        return res.status(413).json({ success: false, error: 'File too large (max 5MB)' })
      }
      chunks.push(chunk as Buffer)
    }
    const body = Buffer.concat(chunks)

    // Relay the multipart body to NocoDB storage; let NocoDB do the multipart parsing.
    const url = `${nocodbBaseUrl}/api/v1/db/storage/upload?path=${encodeURIComponent('enrollment_proofs')}`
    const nocoRes = await fetch(url, {
      method: 'POST',
      headers: {
        'xc-token': nocodbToken,
        'content-type': contentType,
      },
      body,
    })

    const text = await nocoRes.text()
    if (!nocoRes.ok) {
      console.error('[upload-proof] NocoDB error', nocoRes.status, text.slice(0, 300))
      return res.status(502).json({ success: false, error: 'Upload failed' })
    }

    let attachments: unknown
    try {
      attachments = JSON.parse(text)
    } catch {
      return res.status(502).json({ success: false, error: 'Invalid response from storage' })
    }

    return res.status(200).json({ success: true, attachments })
  } catch (err) {
    console.error('[upload-proof]', err)
    return res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: (err as Error).message,
    })
  }
}
