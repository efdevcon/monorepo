import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getFormConfigByViewId } from 'services/form-config'
import { getAllTableColumns, getTableFields } from 'services/nocodb'
import { resolveFormView } from 'services/nocodb-meta'
import { isEncryptedTitle } from 'config/encrypted-forms'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

const MAX_BYTES = 10 * 1024 * 1024

// Tight allowlist — anything outside this is rejected before reaching NocoDB.
// SVG is intentionally excluded (can carry script payloads).
const ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx'])
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

// For columns whose form-view (or table) title starts with "[encrypted]",
// the browser sends an opaque `.age` ciphertext (envelope + age payload). It's
// authenticated by age's MAC and has no executable interpretation — so the
// XSS concerns that gate the normal allowlist don't apply.
const ENCRYPTED_EXT = '.age'
const ENCRYPTED_MIME = 'application/octet-stream'

interface MultipartFileInfo {
  filename?: string
  contentType?: string
}

// Minimal multipart scanner: extracts each file part's declared filename and
// content-type so we can validate before relaying the raw body to NocoDB.
// We deliberately don't try to extract file contents — that's NocoDB's job.
function scanMultipartParts(body: Buffer, boundary: string): MultipartFileInfo[] {
  const delimiter = Buffer.from(`--${boundary}`)
  const parts: MultipartFileInfo[] = []
  let cursor = 0
  while (cursor < body.length) {
    const idx = body.indexOf(delimiter, cursor)
    if (idx === -1) break
    const after = idx + delimiter.length
    // Closing boundary is `--boundary--`.
    if (body[after] === 0x2d && body[after + 1] === 0x2d) break
    // Skip CRLF after the boundary, then read headers up to a blank line.
    const headerStart = after + 2
    const sep = body.indexOf('\r\n\r\n', headerStart)
    if (sep === -1) break
    const headerText = body.subarray(headerStart, sep).toString('utf8')
    const headers: Record<string, string> = {}
    for (const line of headerText.split('\r\n')) {
      const colon = line.indexOf(':')
      if (colon === -1) continue
      headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim()
    }
    const cd = headers['content-disposition'] || ''
    if (cd.toLowerCase().includes('filename')) {
      const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
      parts.push({
        filename: m?.[1],
        contentType: headers['content-type'],
      })
    }
    cursor = sep + 4
  }
  return parts
}

function fileExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { viewId, column } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }
  if (typeof column !== 'string' || !column) {
    return res.status(400).json({ success: false, error: 'Missing column' })
  }

  const nocodbBaseUrl = process.env.NOCODB_BASE_URL
  const nocodbToken = process.env.NOCODB_API_TOKEN
  if (!nocodbBaseUrl || !nocodbToken) {
    return res.status(500).json({ success: false, error: 'NocoDB not configured' })
  }

  try {
    const formConfig = await getFormConfigByViewId(viewId)

    if (formConfig?.requireOtp) {
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
    }

    const [columns, formFields] = await Promise.all([
      getAllTableColumns(viewId),
      getTableFields(viewId).catch(() => []),
    ])
    const target = columns.find(c => c.column_name === column)
    if (!target) {
      return res.status(400).json({ success: false, error: `Unknown column: ${column}` })
    }
    if (target.uidt !== 'Attachment') {
      return res.status(400).json({ success: false, error: `Column "${column}" is not an attachment field` })
    }
    // The "[encrypted]" prefix may live on the form-view label OR on the
    // underlying table column title — either flips us into encrypted mode.
    const formField = formFields.find(f => f.column_name === column)
    const isEncryptedColumn =
      isEncryptedTitle(formField?.title) || isEncryptedTitle(target.title)

    const contentType = req.headers['content-type']
    if (!contentType?.startsWith('multipart/form-data')) {
      return res.status(400).json({ success: false, error: 'Expected multipart/form-data' })
    }
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)
    const boundary = boundaryMatch?.[1] || boundaryMatch?.[2]
    if (!boundary) {
      return res.status(400).json({ success: false, error: 'Malformed multipart (missing boundary)' })
    }

    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of req) {
      total += (chunk as Buffer).length
      if (total > MAX_BYTES) {
        return res.status(413).json({ success: false, error: 'File too large (max 10MB)' })
      }
      chunks.push(chunk as Buffer)
    }
    const body = Buffer.concat(chunks)

    // Validate every file part before relaying to NocoDB. Reject if filename or
    // mimetype is missing or not on the allowlist — this is the only line of
    // defense against an HTML/SVG upload that would later get rendered inline
    // via the file proxy and execute as XSS in our origin.
    const parts = scanMultipartParts(body, boundary)
    if (parts.length === 0) {
      return res.status(400).json({ success: false, error: 'No file in request' })
    }
    for (const p of parts) {
      const ext = p.filename ? fileExt(p.filename) : ''
      if (!p.filename || !ext) {
        return res.status(400).json({ success: false, error: 'Missing filename' })
      }
      const partMime = p.contentType?.toLowerCase().split(';')[0].trim()
      if (isEncryptedColumn) {
        if (ext !== ENCRYPTED_EXT || partMime !== ENCRYPTED_MIME) {
          return res.status(415).json({
            success: false,
            error: `Encrypted columns only accept ${ENCRYPTED_EXT} files (got ext "${ext}", type "${partMime ?? 'unknown'}")`,
          })
        }
      } else {
        if (!ALLOWED_EXT.has(ext)) {
          return res.status(415).json({ success: false, error: `File type "${ext}" not allowed` })
        }
        if (!partMime || !ALLOWED_MIME.has(partMime)) {
          return res.status(415).json({ success: false, error: `Content-type "${p.contentType ?? 'unknown'}" not allowed` })
        }
      }
    }

    // Namespace uploads by tableId + column so files from different forms stay
    // organized and don't collide.
    const { tableId } = await resolveFormView(viewId)
    const storagePath = `forms/${tableId}/${column}`
    const url = `${nocodbBaseUrl}/api/v1/db/storage/upload?path=${encodeURIComponent(storagePath)}`

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
      console.error('[upload-attachment] NocoDB error', nocoRes.status, text.slice(0, 300))
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
    console.error('[upload-attachment]', err)
    return res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: (err as Error).message,
    })
  }
}
