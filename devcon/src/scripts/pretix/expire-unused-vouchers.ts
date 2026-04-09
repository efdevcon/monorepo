/**
 * Expire unused IndiaEarlyBird vouchers
 *
 * Lists all vouchers with the IndiaEarlyBird tag from Pretix, cross-references
 * against the devcon8_early_access_vouchers Supabase table, and expires any
 * that were not distributed (i.e. not present in Supabase).
 *
 * Usage:
 *   pnpm run pretix:expire-unused-vouchers -- --dry-run
 *   pnpm run pretix:expire-unused-vouchers
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { TICKETING, getPretixApiToken } from '../../config/ticketing'

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

const dryRun = process.argv.includes('--dry-run')
const tag = process.argv.includes('--tag')
  ? process.argv[process.argv.indexOf('--tag') + 1]
  : 'IndiaEarlyBird'

interface PretixVoucher {
  id: number
  code: string
  tag: string
  valid_until: string | null
  redeemed: number
  max_usages: number
}

/**
 * Fetch all vouchers with a given tag from Pretix (handles pagination)
 */
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

/**
 * Fetch all voucher codes from the devcon8_early_access_vouchers Supabase table
 */
async function fetchDistributedVoucherCodes(): Promise<Set<string>> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  const codes = new Set<string>()
  const PAGE_SIZE = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('devcon8_early_access_vouchers')
      .select('code')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Supabase query error: ${error.message}`)
    if (!data || data.length === 0) break
    for (const row of data) codes.add(row.code)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return codes
}

/**
 * Expire a voucher by setting valid_until to a past date
 */
async function expireVoucher(voucherId: number): Promise<boolean> {
  const url = eventUrl('/vouchers/' + voucherId + '/')
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      valid_until: '2020-01-01T00:00:00Z',
      comment: 'Expired — undistributed IndiaEarlyBird voucher',
    }),
  })
  return res.ok
}

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log(`Tag filter: ${tag}`)
  if (dryRun) console.log('*** DRY RUN — no changes will be made ***')
  console.log('')

  // Step 1: Fetch all IndiaEarlyBird vouchers from Pretix
  console.log('Fetching vouchers from Pretix...')
  const pretixVouchers = await fetchPretixVouchers(tag)
  console.log(`  Found ${pretixVouchers.length} vouchers with tag "${tag}" in Pretix`)

  // Step 2: Fetch distributed voucher codes from Supabase
  console.log('Fetching distributed voucher codes from Supabase...')
  const distributedCodes = await fetchDistributedVoucherCodes()
  console.log(`  Found ${distributedCodes.size} vouchers in devcon8_early_access_vouchers`)

  // Step 3: Identify vouchers to expire
  const toExpire = pretixVouchers.filter(v => !distributedCodes.has(v.code))
  const alreadyExpired = toExpire.filter(v => v.valid_until && new Date(v.valid_until) < new Date())
  const needsExpiring = toExpire.filter(v => !v.valid_until || new Date(v.valid_until) >= new Date())
  const kept = pretixVouchers.filter(v => distributedCodes.has(v.code))

  console.log('')
  console.log('=== Analysis ===')
  console.log(`  Total in Pretix:        ${pretixVouchers.length}`)
  console.log(`  Distributed (keep):     ${kept.length}`)
  console.log(`  Not distributed:        ${toExpire.length}`)
  console.log(`    Already expired:      ${alreadyExpired.length}`)
  console.log(`    Needs expiring:       ${needsExpiring.length}`)
  console.log('')

  if (needsExpiring.length === 0) {
    console.log('Nothing to do — all undistributed vouchers are already expired.')
    return
  }

  if (dryRun) {
    console.log('Vouchers that would be expired:')
    for (const v of needsExpiring) {
      console.log(`  ${v.code} (Pretix ID: ${v.id}, redeemed: ${v.redeemed}/${v.max_usages})`)
    }
    console.log('')
    console.log(`*** DRY RUN complete — ${needsExpiring.length} vouchers would be expired ***`)
    console.log('Re-run without --dry-run to apply.')
    return
  }

  // Step 4: Expire them
  console.log(`Expiring ${needsExpiring.length} vouchers...`)
  let success = 0
  let failed = 0

  for (let i = 0; i < needsExpiring.length; i++) {
    const v = needsExpiring[i]
    const ok = await expireVoucher(v.id)
    if (ok) {
      success++
      console.log(`  [${i + 1}/${needsExpiring.length}] Expired ${v.code} (Pretix ID: ${v.id})`)
    } else {
      failed++
      console.error(`  [${i + 1}/${needsExpiring.length}] FAILED to expire ${v.code} (Pretix ID: ${v.id})`)
    }
  }

  console.log('')
  console.log('=== Summary ===')
  console.log(`  Expired: ${success}`)
  console.log(`  Failed:  ${failed}`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
