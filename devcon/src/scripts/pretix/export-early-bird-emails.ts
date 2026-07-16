/**
 * Export valid IndiaEarlyBird vouchers with their associated emails
 *
 * Lists all vouchers with the IndiaEarlyBird tag from Pretix, keeps the ones
 * that are still VALID (not fully redeemed, not expired), and joins each
 * against the devcon8_early_access_vouchers Supabase table to find the email
 * (the `email` column, set at assignment time; falls back to `assigned_to`
 * when that identity string looks like an email).
 *
 * Read-only: makes no changes in Pretix or Supabase.
 *
 * Usage:
 *   pnpm run pretix:export-early-bird-emails
 *   pnpm run pretix:export-early-bird-emails -- --tag SomeOtherTag
 *   pnpm run pretix:export-early-bird-emails -- --out /tmp/early-bird.csv
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { TICKETING, TICKETING_ENV, getPretixApiToken } from '../../config/ticketing'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : url + '/'
  if (!normalized.includes('/api/')) {
    normalized = normalized + 'api/v1/'
  }
  return normalized
}

const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
const org = TICKETING.pretix.organizer
const ev = TICKETING.pretix.event
const token = getPretixApiToken()

const headers: Record<string, string> = {
  Authorization: 'Token ' + token,
  'Content-Type': 'application/json',
}

function eventUrl(endpoint: string): string {
  return baseUrl + 'organizers/' + org + '/events/' + ev + endpoint
}

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const tag = argValue('--tag') ?? 'IndiaEarlyBird'
// Default next to the other voucher exports (early-access-codes-*.txt)
const outPath = argValue('--out') ?? `generated-codes/early-bird-emails-${new Date().toISOString().slice(0, 10)}.csv`

interface PretixVoucher {
  id: number
  code: string
  tag: string
  valid_until: string | null
  redeemed: number
  max_usages: number
}

interface SupabaseVoucherRow {
  code: string
  email: string | null
  assigned_to: string | null
  assigned_at: string | null
  collection: string
}

/** Fetch all vouchers with a given tag from Pretix (handles pagination) */
async function fetchPretixVouchers(voucherTag: string): Promise<PretixVoucher[]> {
  const vouchers: PretixVoucher[] = []
  let url: string | null = eventUrl('/vouchers/') + '?tag=' + encodeURIComponent(voucherTag)

  while (url) {
    const res: Response = await fetch(url, { headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Pretix API error ${res.status}: ${text}`)
    }
    const data = await res.json()
    for (const v of data.results) {
      vouchers.push({
        id: v.id,
        code: v.code,
        tag: v.tag,
        valid_until: v.valid_until,
        redeemed: v.redeemed,
        max_usages: v.max_usages,
      })
    }
    url = data.next
  }

  return vouchers
}

/** A voucher is still valid when it has redemptions left and hasn't expired. */
function isValid(v: PretixVoucher, now: Date): boolean {
  if (v.redeemed >= v.max_usages) return false
  if (v.valid_until && new Date(v.valid_until) < now) return false
  return true
}

/** Fetch voucher rows from Supabase for the given codes (chunked .in() queries) */
async function fetchSupabaseRows(codes: string[]): Promise<Map<string, SupabaseVoucherRow>> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  const byCode = new Map<string, SupabaseVoucherRow>()
  const CHUNK = 200
  for (let i = 0; i < codes.length; i += CHUNK) {
    const chunk = codes.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('devcon8_early_access_vouchers')
      .select('code, email, assigned_to, assigned_at, collection')
      .in('code', chunk)
    if (error) throw new Error(`Supabase query error: ${error.message}`)
    for (const row of data ?? []) byCode.set(row.code, row)
  }
  return byCode
}

const looksLikeEmail = (s: string | null): s is string => !!s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
}

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('Environment:', TICKETING_ENV)
  console.log(`Tag filter: ${tag}`)
  console.log('')

  console.log('Fetching vouchers from Pretix...')
  const all = await fetchPretixVouchers(tag)
  const now = new Date()
  const valid = all.filter(v => isValid(v, now))
  console.log(`  ${all.length} vouchers with tag "${tag}", ${valid.length} still valid`)

  console.log('Looking up emails in devcon8_early_access_vouchers...')
  const rows = await fetchSupabaseRows(valid.map(v => v.code))
  console.log(`  ${rows.size} of ${valid.length} voucher codes found in Supabase`)
  console.log('')

  const lines = ['code,email']
  let withEmail = 0
  let assignedNoEmail = 0
  let unassigned = 0
  let notInSupabase = 0

  for (const v of valid) {
    const row = rows.get(v.code)
    // Prefer the explicit email column; fall back to assigned_to when the
    // identity string itself is an email (wallet/GitHub identities are not).
    const email = row?.email || (looksLikeEmail(row?.assigned_to ?? null) ? row!.assigned_to! : '')
    if (!row) notInSupabase++
    else if (email) withEmail++
    else if (row.assigned_to) assignedNoEmail++
    else unassigned++

    lines.push([v.code, email].map(csvEscape).join(','))
  }

  const outDir = path.dirname(outPath)
  if (outDir && outDir !== '.') fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outPath, lines.join('\n') + '\n')

  console.log('=== Summary ===')
  console.log(`  Valid vouchers exported:   ${valid.length}`)
  console.log(`  With email:                ${withEmail}`)
  console.log(`  Assigned but no email:     ${assignedNoEmail}`)
  console.log(`  In Supabase, unassigned:   ${unassigned}`)
  console.log(`  Not in Supabase at all:    ${notInSupabase}`)
  console.log('')
  console.log(`CSV written to: ${outPath}`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
