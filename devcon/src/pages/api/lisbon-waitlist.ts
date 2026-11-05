import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Devcon IX waitlist: the announcement page at /lisbon/ (lisbon/, see
 * lisbon/src/terminal/waitlist.ts) POSTs { email, source, ts } here and the
 * address goes into the "DC-IX Waitlist" table of the Ticketing NocoDB base,
 * one Email column. Only the email is stored: the page's `source` and `ts`
 * are accepted and dropped, NocoDB stamps its own CreatedAt.
 *
 * An address already in the table is a success too (nothing is written), so
 * a repeat signup never shows an error or doubles a row.
 *
 * Server-only: NOCODB_BASE_URL and NOCODB_API_TOKEN (the same ones the QR
 * redirects use); NOCODB_WAITLIST_TABLE_ID overrides the table.
 */

const DEFAULT_TABLE_ID = 'mvmqfwpjoiw8fr2'
const EMAIL_COLUMN = 'Email'
// Same shape as services/email-classifier.ts: one @, no whitespace, a dot
// after it. Not a full RFC check; NocoDB's Email field validates too.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX = 254

type Reply = { success: true } | { success: false; error: string }

function nocodb() {
  const base = process.env.NOCODB_BASE_URL?.replace(/\/$/, '')
  const token = process.env.NOCODB_API_TOKEN
  const table = process.env.NOCODB_WAITLIST_TABLE_ID || DEFAULT_TABLE_ID
  if (!base || !token) throw new Error('NOCODB_BASE_URL and NOCODB_API_TOKEN are required')
  return { records: `${base}/api/v2/tables/${table}/records`, headers: { 'xc-token': token } }
}

async function alreadyListed(email: string): Promise<boolean> {
  const { records, headers } = nocodb()
  const where = encodeURIComponent(`(${EMAIL_COLUMN},eq,${email})`)
  const res = await fetch(`${records}?where=${where}&limit=1&fields=Id`, { headers })
  if (!res.ok) throw new Error(`NocoDB read failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { list: unknown[] }
  return data.list.length > 0
}

async function addToList(email: string): Promise<void> {
  const { records, headers } = nocodb()
  const res = await fetch(records, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ [EMAIL_COLUMN]: email }),
  })
  if (!res.ok) throw new Error(`NocoDB write failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Reply>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const raw = (req.body as { email?: unknown } | undefined)?.email
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, error: 'A valid email is required' })
  }

  try {
    if (!(await alreadyListed(email))) await addToList(email)
    return res.status(200).json({ success: true })
  } catch (e) {
    // Node's fetch says only "fetch failed"; the cause has the DNS/TLS detail.
    const err = e as Error & { cause?: Error }
    console.error('[lisbon-waitlist]', err.message, err.cause?.message ?? '')
    return res.status(502).json({ success: false, error: 'Could not save the signup' })
  }
}
