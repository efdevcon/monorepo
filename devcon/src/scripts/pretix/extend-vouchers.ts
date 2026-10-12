/**
 * Extend the validity of Pretix vouchers that match a code prefix or a tag.
 *
 * Usage:
 *   pnpm pretix:extend-vouchers -- --match DEVCON_IBW --to 2026-10-25              # dry run
 *   pnpm pretix:extend-vouchers -- --match DEVCON_IBW --to 2026-10-25 --apply      # write
 *   add --from 2026-10-15 to only touch vouchers whose current expiry is on that date
 *
 * Matching is case-insensitive on the code prefix and on the tag. The new
 * valid_until keeps the time of day and the offset of the current value and only
 * swaps the date, so "23:59:59+05:30" stays "23:59:59+05:30". Vouchers without an
 * expiry are left alone.
 */
import 'dotenv/config'
import { TICKETING, getPretixApiToken } from '../../config/ticketing'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : url + '/'
  if (!normalized.includes('/api/')) normalized = normalized + 'api/v1/'
  return normalized
}

const args = process.argv.slice(2)
const opt = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const match = opt('--match')
const to = opt('--to')
const from = opt('--from')
const apply = args.includes('--apply')
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

if (!match || !isDate(to) || (from !== undefined && !isDate(from))) {
  console.error('Usage: pnpm pretix:extend-vouchers -- --match <code prefix or tag> --to YYYY-MM-DD [--from YYYY-MM-DD] [--apply]')
  process.exit(1)
}

const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
const org = TICKETING.pretix.organizer
const ev = TICKETING.pretix.event
const headers: Record<string, string> = { Authorization: 'Token ' + getPretixApiToken(), 'Content-Type': 'application/json' }
const eventUrl = (endpoint: string) => `${baseUrl}organizers/${org}/events/${ev}${endpoint}`

interface PretixVoucher {
  id: number
  code: string
  tag: string
  valid_until: string | null
  redeemed: number
  max_usages: number
  item: number | null
}

async function getAll<T>(url: string | null): Promise<T[]> {
  const out: T[] = []
  while (url) {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${await res.text()}`)
    const data = (await res.json()) as { results: T[]; next: string | null }
    out.push(...data.results)
    url = data.next
  }
  return out
}

async function main() {
  console.log(`Pretix ${baseUrl} · ${org}/${ev} · ${apply ? 'APPLY' : 'dry run'}`)
  const needle = match!.toLowerCase()
  const all = await getAll<PretixVoucher>(eventUrl('/vouchers/?page_size=100'))
  const matched = all.filter(v => v.code.toLowerCase().startsWith(needle) || (v.tag || '').toLowerCase() === needle)
  console.log(`${all.length} vouchers in the event, ${matched.length} match "${match}"`)

  const byExpiry = new Map<string, number>()
  for (const v of matched) byExpiry.set(v.valid_until ?? 'none', (byExpiry.get(v.valid_until ?? 'none') ?? 0) + 1)
  for (const [k, n] of [...byExpiry].sort()) console.log(`  valid_until ${k}: ${n}`)
  const tags = new Set(matched.map(v => v.tag || '(no tag)'))
  console.log(`  tags: ${[...tags].join(', ')} · redeemed ${matched.reduce((s, v) => s + v.redeemed, 0)} of ${matched.reduce((s, v) => s + v.max_usages, 0)} uses`)

  const targets = matched.filter(v => v.valid_until && (!from || v.valid_until.slice(0, 10) === from))
  const skipped = matched.length - targets.length
  if (skipped) console.log(`  skipping ${skipped} (no expiry${from ? ` or not expiring on ${from}` : ''})`)

  const plan = targets.map(v => ({ v, next: to! + v.valid_until!.slice(10) })).filter(p => p.next !== p.v.valid_until)
  console.log(`${plan.length} to update${plan[0] ? `, e.g. ${plan[0].v.code}: ${plan[0].v.valid_until} -> ${plan[0].next}` : ''}`)
  if (!apply || plan.length === 0) {
    if (!apply && plan.length) console.log('Dry run. Add --apply to write.')
    return
  }

  let ok = 0
  const failed: string[] = []
  for (const { v, next } of plan) {
    const res = await fetch(eventUrl(`/vouchers/${v.id}/`), { method: 'PATCH', headers, body: JSON.stringify({ valid_until: next }) })
    if (res.ok) ok++
    else failed.push(`${v.code}: ${res.status} ${(await res.text()).slice(0, 120)}`)
  }
  console.log(`Updated ${ok}, failed ${failed.length}`)
  for (const f of failed) console.log('  ' + f)
  if (failed.length) process.exit(1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
