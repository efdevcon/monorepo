import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { findRowByEmail, getAllTableColumns } from 'services/nocodb'
import { getFormConfigByViewId } from 'services/form-config'
import { formCertificate } from 'config/certificates'
import { renderVolunteerCertificate } from 'services/certificates/volunteer-certificate'

/**
 * GET (Bearer: the form's OTP session) -> the signed-in person's certificate
 * as a PNG, for forms listed in config/certificates.ts. Drawn on each request
 * from their own row (chosen name + the role the team set), never stored, so a
 * corrected name shows on the next download.
 */

// The renderer has no shaping for scripts that join letters (Devanagari and
// the like), so names print correctly in Latin letters only.
const PRINTABLE_NAME = /^[\p{Script=Latin}\p{M}0-9 '’.,()-]+$/u
const MAX_NAME_LENGTH = 60

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').end()
  res.setHeader('Cache-Control', 'private, no-store')
  const fail = (status: number, error: string) => res.status(status).json({ success: false, error })

  const { viewId } = req.query
  if (typeof viewId !== 'string') return fail(400, 'Invalid viewId')

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return fail(401, 'Authentication required')
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return fail(500, 'Auth service not configured')

  try {
    const {
      data: { user },
      error: authError,
    } = await createClient(supabaseUrl, supabaseKey).auth.getUser(authHeader.slice(7))
    if (authError || !user?.email) return fail(401, 'Invalid or expired session')

    const certificate = formCertificate((await getFormConfigByViewId(viewId))?.formSlug)
    if (!certificate) return fail(404, 'This form has no certificate')

    const emailColumn = (await getAllTableColumns(viewId)).find(c => c.uidt === 'Email')?.column_name
    const row = emailColumn ? await findRowByEmail(viewId, emailColumn, user.email.toLowerCase()) : null
    if (!row || !row['Submission Date']) return fail(404, 'Submit the form first to get your certificate.')

    const chosen = String(row[certificate.nameField] ?? '').trim()
    const name = chosen || String(row[certificate.listNameField ?? ''] ?? '').trim()
    if (!name) return fail(409, 'Add your preferred name to the form to get your certificate.')
    if (name.length > MAX_NAME_LENGTH || !PRINTABLE_NAME.test(name)) {
      return fail(
        422,
        `Your certificate can't print "${name}" yet: please write your preferred name in English letters (up to ${MAX_NAME_LENGTH} characters) and update the form.`
      )
    }
    const role = String(row[certificate.roleField] ?? '').trim() || certificate.defaultRole

    const png = Buffer.from(await renderVolunteerCertificate({ name, role }).arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', `inline; filename="${certificate.fileName}"`)
    return res.status(200).send(png)
  } catch (err) {
    console.error('[nocodb/certificate]', err)
    return fail(500, 'Could not create your certificate, please try again')
  }
}
