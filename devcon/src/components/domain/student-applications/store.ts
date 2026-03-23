import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  return createClient(url, key)
}

export interface StudentVoucher {
  id: number
  code: string
  email: string | null
  assignedAt: string | null
}

function rowToVoucher(row: Record<string, unknown>): StudentVoucher {
  return {
    id: row.id as number,
    code: row.code as string,
    email: row.email as string | null,
    assignedAt: row.assigned_at as string | null,
  }
}

/**
 * Look up a voucher already assigned to this email (for return visits + dedup).
 */
export async function getVoucherByEmail(email: string): Promise<StudentVoucher | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devcon8_student_vouchers')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`getVoucherByEmail: ${error.message}`)
  if (!data) return null
  return rowToVoucher(data)
}

/**
 * Assign an available voucher to an email. Idempotent — returns existing if already assigned.
 * Uses WHERE email IS NULL for race-condition safety.
 */
export async function assignVoucher(email: string): Promise<StudentVoucher | null> {
  const normalizedEmail = email.toLowerCase()

  // Check if already assigned
  const existing = await getVoucherByEmail(normalizedEmail)
  if (existing) return existing

  const supabase = getSupabase()

  // Find an unassigned voucher
  const { data: available, error: findError } = await supabase
    .from('devcon8_student_vouchers')
    .select('id')
    .is('email', null)
    .limit(1)
    .maybeSingle()
  if (findError) throw new Error(`assignVoucher find: ${findError.message}`)
  if (!available) return null // pool exhausted

  // Atomically assign (WHERE email IS NULL guards against races)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('devcon8_student_vouchers')
    .update({ email: normalizedEmail, assigned_at: now, updated_at: now })
    .eq('id', available.id)
    .is('email', null)
    .select('*')

  // Unique constraint on email — another request already assigned a voucher to this email
  if (error && error.code === '23505') {
    const retry = await getVoucherByEmail(normalizedEmail)
    if (retry) return retry
  }
  if (error) throw new Error(`assignVoucher update: ${error.message}`)

  // Another request grabbed THIS voucher — retry
  if (!data || data.length === 0) {
    const retryExisting = await getVoucherByEmail(normalizedEmail)
    if (retryExisting) return retryExisting
    return assignVoucher(normalizedEmail)
  }

  return rowToVoucher(data[0])
}

/**
 * Check if any unassigned vouchers remain.
 */
export async function hasAvailableVouchers(): Promise<boolean> {
  const supabase = getSupabase()
  const { count, error } = await supabase
    .from('devcon8_student_vouchers')
    .select('id', { count: 'exact', head: true })
    .is('email', null)
  if (error) throw new Error(`hasAvailableVouchers: ${error.message}`)
  return (count ?? 0) > 0
}

export async function getVoucherStats(): Promise<{ total: number; assigned: number; available: number }> {
  const supabase = getSupabase()
  const { count: total, error: e1 } = await supabase
    .from('devcon8_student_vouchers')
    .select('id', { count: 'exact', head: true })
  if (e1) throw new Error(`getVoucherStats total: ${e1.message}`)

  const { count: assigned, error: e2 } = await supabase
    .from('devcon8_student_vouchers')
    .select('id', { count: 'exact', head: true })
    .not('email', 'is', null)
  if (e2) throw new Error(`getVoucherStats assigned: ${e2.message}`)

  return { total: total ?? 0, assigned: assigned ?? 0, available: (total ?? 0) - (assigned ?? 0) }
}

/**
 * Bulk insert voucher codes (for CSV import script).
 */
export async function insertVoucherCodes(codes: string[]): Promise<number> {
  const supabase = getSupabase()
  const rows = codes.map(code => ({ code }))
  const CHUNK_SIZE = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase.from('devcon8_student_vouchers').insert(chunk)
    if (error) throw new Error(`insertVoucherCodes chunk ${i}: ${error.message}`)
    inserted += chunk.length
  }
  return inserted
}

// ── Submissions ───────────────────────────────────────────────────────

export interface StudentSubmission {
  id: number
  email: string
  name: string
  university: string
  yearOfStudy: string
  fieldOfStudy: string
  country: string
  essayProofOfWork: string
  classificationType: string | null
  classificationDomain: string | null
  isUniversityEmail: boolean
  signals: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

function rowToSubmission(row: Record<string, unknown>): StudentSubmission {
  return {
    id: row.id as number,
    email: row.email as string,
    name: row.name as string,
    university: row.university as string,
    yearOfStudy: row.year_of_study as string,
    fieldOfStudy: row.field_of_study as string,
    country: row.country as string,
    essayProofOfWork: row.essay_proof_of_work as string,
    classificationType: row.classification_type as string | null,
    classificationDomain: row.classification_domain as string | null,
    isUniversityEmail: row.is_university_email as boolean,
    signals: row.signals as string | null,
    status: row.status as 'pending' | 'approved' | 'rejected',
    createdAt: row.created_at as string,
  }
}

export async function getSubmissionByEmail(email: string): Promise<StudentSubmission | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devcon8_student_applications')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(`getSubmissionByEmail: ${error.message}`)
  if (!data) return null
  return rowToSubmission(data)
}

export async function createSubmission(params: {
  email: string
  name: string
  university: string
  yearOfStudy: string
  fieldOfStudy: string
  country: string
  essayProofOfWork: string
  classificationType?: string
  classificationDomain?: string
  isUniversityEmail?: boolean
  signals?: string
}): Promise<StudentSubmission> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devcon8_student_applications')
    .insert({
      email: params.email.toLowerCase(),
      name: params.name,
      university: params.university,
      year_of_study: params.yearOfStudy,
      field_of_study: params.fieldOfStudy,
      country: params.country,
      essay_proof_of_work: params.essayProofOfWork,
      classification_type: params.classificationType ?? null,
      classification_domain: params.classificationDomain ?? null,
      is_university_email: params.isUniversityEmail ?? false,
      signals: params.signals ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(`createSubmission: ${error.message}`)
  return rowToSubmission(data)
}

export async function updateSubmission(
  email: string,
  fields: {
    name: string
    university: string
    yearOfStudy: string
    fieldOfStudy: string
    country: string
    essayProofOfWork: string
  },
): Promise<StudentSubmission> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devcon8_student_applications')
    .update({
      name: fields.name,
      university: fields.university,
      year_of_study: fields.yearOfStudy,
      field_of_study: fields.fieldOfStudy,
      country: fields.country,
      essay_proof_of_work: fields.essayProofOfWork,
      updated_at: new Date().toISOString(),
    })
    .eq('email', email.toLowerCase())
    .select('*')
    .single()
  if (error) throw new Error(`updateSubmission: ${error.message}`)
  return rowToSubmission(data)
}

export interface SubmissionWithVoucher extends StudentSubmission {
  voucherCode: string | null
}

export async function listSubmissions(): Promise<SubmissionWithVoucher[]> {
  const supabase = getSupabase()
  const { data: submissions, error } = await supabase
    .from('devcon8_student_applications')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listSubmissions: ${error.message}`)

  // Fetch all assigned vouchers in one query
  const emails = (submissions ?? []).map((s: Record<string, unknown>) => (s.email as string).toLowerCase())
  let voucherMap: Record<string, string> = {}
  if (emails.length > 0) {
    const { data: vouchers } = await supabase
      .from('devcon8_student_vouchers')
      .select('email, code')
      .in('email', emails)
    if (vouchers) {
      voucherMap = Object.fromEntries(vouchers.map((v: Record<string, unknown>) => [v.email as string, v.code as string]))
    }
  }

  return (submissions ?? []).map((row: Record<string, unknown>) => ({
    ...rowToSubmission(row),
    voucherCode: voucherMap[(row.email as string).toLowerCase()] ?? null,
  }))
}

export async function updateSubmissionStatus(id: number, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('devcon8_student_applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`updateSubmissionStatus: ${error.message}`)
}
