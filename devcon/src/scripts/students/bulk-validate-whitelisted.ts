/**
 * One-off: bulk-validate pending student applications from whitelisted domains
 *
 * Since 2026-07-28 the submit API auto-validates applications whose email
 * domain is an exact match on the curated university whitelists (top/other
 * Indian + international). This script applies the same rule retroactively to
 * rows that are still awaiting review, so the queue reflects the new policy.
 *
 * Rules (identical to the submit-time logic):
 *   - Only rows with Status "To review" or empty are touched — any reviewer
 *     decision (Reviewing, Validated, Reject, Approval Sent, …) is left alone.
 *   - Only exact whitelist domain matches qualify; ai-university rows whose
 *     domain is not whitelisted stay in the review queue.
 *
 * SAFE BY DEFAULT: dry run unless --apply is passed.
 *
 * Usage:
 *   pnpm students:bulk-validate            # dry run: prints what would change
 *   pnpm students:bulk-validate -- --apply # write Status=Validated to NocoDB
 */
import 'dotenv/config'
import {
  TOP_INDIAN_UNIVERSITY_DOMAINS,
  OTHER_INDIAN_UNIVERSITY_DOMAINS,
  INTERNATIONAL_UNIVERSITY_DOMAINS,
} from '../../services/whitelisted-domains'

const TABLE_ID = 'm500tv5ywq983co' // Student Application
const BASE_URL = process.env.NOCODB_BASE_URL
const API_TOKEN = process.env.NOCODB_API_TOKEN

const apply = process.argv.includes('--apply')

interface StudentRow {
  Id: number
  Email: string | null
  Status: string | null
  'Email Classification': string | null
}

function isWhitelisted(email: string | null): boolean {
  const domain = (email ?? '').trim().toLowerCase().split('@')[1]
  if (!domain) return false
  return (
    TOP_INDIAN_UNIVERSITY_DOMAINS.has(domain) ||
    OTHER_INDIAN_UNIVERSITY_DOMAINS.has(domain) ||
    INTERNATIONAL_UNIVERSITY_DOMAINS.has(domain)
  )
}

function isPending(status: string | null): boolean {
  const s = (status ?? '').trim().toLowerCase()
  return !s || s === 'to review'
}

async function fetchAllRows(): Promise<StudentRow[]> {
  const rows: StudentRow[] = []
  let offset = 0
  const limit = 200
  for (;;) {
    const url = `${BASE_URL}/api/v2/tables/${TABLE_ID}/records?limit=${limit}&offset=${offset}&fields=Id,Email,Status,Email Classification`
    const res = await fetch(url, { headers: { 'xc-token': API_TOKEN! } })
    if (!res.ok) throw new Error(`NocoDB list failed ${res.status}: ${await res.text()}`)
    const body = (await res.json()) as { list: StudentRow[]; pageInfo?: { isLastPage?: boolean } }
    rows.push(...body.list)
    if (body.pageInfo?.isLastPage || body.list.length < limit) break
    offset += limit
  }
  return rows
}

async function bulkValidate(ids: number[]): Promise<void> {
  // NocoDB v2 PATCH accepts an array of partial records keyed by Id.
  const batchSize = 50
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize).map(Id => ({ Id, Status: 'Validated' }))
    const res = await fetch(`${BASE_URL}/api/v2/tables/${TABLE_ID}/records`, {
      method: 'PATCH',
      headers: { 'xc-token': API_TOKEN!, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
    if (!res.ok) throw new Error(`NocoDB bulk update failed ${res.status}: ${await res.text()}`)
    console.log(`  updated ${Math.min(i + batchSize, ids.length)}/${ids.length}`)
  }
}

async function main() {
  if (!BASE_URL || !API_TOKEN) {
    console.error('Missing NOCODB_BASE_URL / NOCODB_API_TOKEN env vars')
    process.exit(1)
  }

  const rows = await fetchAllRows()
  const pending = rows.filter(r => isPending(r.Status))
  const toValidate = pending.filter(r => isWhitelisted(r.Email))

  console.log(`Total applications:            ${rows.length}`)
  console.log(`Pending (To review / empty):   ${pending.length}`)
  console.log(`  of which whitelisted domain: ${toValidate.length}`)
  console.log('')
  for (const r of toValidate) {
    console.log(`  #${r.Id}  ${r.Email}  [${r['Email Classification'] ?? '-'}]  (${r.Status ?? 'empty'})`)
  }
  console.log('')

  if (!apply) {
    console.log('*** DRY RUN: nothing written. Re-run with --apply to set Status=Validated. ***')
    return
  }

  if (toValidate.length === 0) {
    console.log('Nothing to update.')
    return
  }

  await bulkValidate(toValidate.map(r => r.Id))
  console.log(`Done: ${toValidate.length} applications set to Validated.`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
