/**
 * Make open (unredeemed) vouchers of quota-reserving discount types hold their
 * seat (Pretix `block_quota: true`).
 *
 * `createVoucher` now reserves quota for the types in
 * `discountReservesQuota` (builder approvals); vouchers issued before that
 * change were created non-reserving. This script brings them in line.
 *
 * For each tag it lists the vouchers in Pretix, keeps the ones still open
 * (never redeemed, not expired, not already reserving), checks the item's
 * quota has room for them, and PATCHes `block_quota: true`. Redeemed vouchers
 * are left alone: the flag has no effect on them.
 *
 * Dry run by default. Nothing is written unless `--apply` is passed.
 *
 * Usage:
 *   pnpm run pretix:reserve-open-vouchers                       # dry run, builder
 *   pnpm run pretix:reserve-open-vouchers -- --tags builder,x   # dry run, custom tags
 *   pnpm run pretix:reserve-open-vouchers -- --apply            # write
 *
 * The target instance follows NEXT_PUBLIC_PRETIX_ENV (development/production)
 * like the other pretix scripts.
 */
import 'dotenv/config'
import { TICKETING, TICKETING_ENV, discountCollection, getPretixApiToken } from '../../config/ticketing'

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

const apply = process.argv.includes('--apply')

// Mirrors RESERVED_DISCOUNT_TYPES in config/ticketing.ts. A voucher's tag is
// either the discount type or the env-prefixed collection, so cover both.
const RESERVED_TYPES = ['builder']
const defaultTags = [...new Set(RESERVED_TYPES.flatMap(t => [t, discountCollection(t)]))]
const tags = process.argv.includes('--tags')
  ? process.argv[process.argv.indexOf('--tags') + 1].split(',').map(s => s.trim()).filter(Boolean)
  : defaultTags

interface PretixVoucher {
  id: number
  code: string
  tag: string
  item: number | null
  valid_until: string | null
  redeemed: number
  max_usages: number
  block_quota: boolean
}

async function fetchAll<T>(firstUrl: string): Promise<T[]> {
  const out: T[] = []
  let url: string | null = firstUrl
  while (url) {
    const res: Response = await fetch(url, { headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Pretix API error ${res.status} for ${url}: ${text}`)
    }
    const data = await res.json()
    out.push(...(data.results as T[]))
    url = data.next
  }
  return out
}

interface PretixQuota {
  id: number
  name: string
  size: number | null
  items: number[]
}

async function quotaAvailability(quotaId: number): Promise<number | null> {
  const res = await fetch(eventUrl(`/quotas/${quotaId}/availability/`), { headers })
  if (!res.ok) throw new Error(`Pretix API error ${res.status} for quota ${quotaId} availability`)
  const data = await res.json()
  // `available_number` is null for unlimited quotas.
  return typeof data.available_number === 'number' ? data.available_number : null
}

async function fetchItemName(itemId: number): Promise<string> {
  const res = await fetch(eventUrl(`/items/${itemId}/`), { headers })
  if (!res.ok) return `item ${itemId}`
  const data = await res.json()
  const name = data.name
  return typeof name === 'object' ? (name.en ?? JSON.stringify(name)) : String(name)
}

async function reserveVoucher(v: PretixVoucher): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(eventUrl(`/vouchers/${v.id}/`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ block_quota: true }),
  })
  if (res.ok) return { ok: true }
  return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` }
}

function isOpen(v: PretixVoucher, now: number): boolean {
  if (v.redeemed > 0) return false
  if (v.block_quota) return false
  if (v.item === null) return false
  if (v.valid_until && new Date(v.valid_until).getTime() < now) return false
  return true
}

async function main() {
  console.log(`Pretix: ${eventUrl('/')} (env: ${TICKETING_ENV})`)
  console.log(`Tags: ${tags.join(', ')}`)
  console.log(apply ? '*** APPLY MODE: vouchers will be updated ***' : '*** DRY RUN: nothing will be written (pass --apply to write) ***')
  console.log('')

  const now = Date.now()
  const candidates: PretixVoucher[] = []
  for (const tag of tags) {
    const all = await fetchAll<PretixVoucher>(eventUrl('/vouchers/') + '?tag=' + encodeURIComponent(tag))
    const open = all.filter(v => isOpen(v, now))
    const redeemed = all.filter(v => v.redeemed > 0).length
    const reserving = all.filter(v => v.block_quota && v.redeemed === 0).length
    const expired = all.filter(v => v.redeemed === 0 && v.valid_until && new Date(v.valid_until).getTime() < now).length
    console.log(
      `tag ${JSON.stringify(tag)}: ${all.length} vouchers, ${redeemed} redeemed, ${reserving} already reserving, ${expired} expired unused, ${open.length} to update`
    )
    candidates.push(...open)
  }
  console.log('')

  if (candidates.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // Room check per item. Pretix rejects a reserving voucher the quota cannot
  // hold, so this is informational for the dry run and a guard in apply mode.
  const quotas = await fetchAll<PretixQuota>(eventUrl('/quotas/'))
  const byItem = new Map<number, PretixVoucher[]>()
  for (const v of candidates) {
    const list = byItem.get(v.item as number) ?? []
    list.push(v)
    byItem.set(v.item as number, list)
  }
  let shortfall = false
  for (const [itemId, list] of byItem) {
    const name = await fetchItemName(itemId)
    const itemQuotas = quotas.filter(q => q.items.includes(itemId))
    const avails = await Promise.all(itemQuotas.map(async q => ({ q, available: await quotaAvailability(q.id) })))
    const tightest = avails.reduce<number | null>((min, a) => {
      if (a.available === null) return min
      return min === null ? a.available : Math.min(min, a.available)
    }, null)
    const ok = tightest === null || tightest >= list.length
    if (!ok) shortfall = true
    console.log(
      `item ${itemId} (${name}): ${list.length} to update, quota available now: ${tightest === null ? 'unlimited' : tightest}${ok ? '' : '  <-- NOT ENOUGH ROOM'}`
    )
    for (const a of avails) {
      console.log(`    quota #${a.q.id} ${JSON.stringify(a.q.name)} size=${a.q.size ?? 'unlimited'} available=${a.available ?? 'unlimited'}`)
    }
  }
  console.log('')

  if (!apply) {
    console.log(`Would set block_quota=true on ${candidates.length} voucher(s).`)
    console.log('*** DRY RUN complete. Re-run with --apply to write. ***')
    return
  }
  if (shortfall) {
    console.log('Refusing to apply: at least one item lacks quota room for its open vouchers. Resolve that first.')
    process.exitCode = 1
    return
  }

  let ok = 0
  const failures: Array<{ code: string; error: string }> = []
  for (const v of candidates) {
    const result = await reserveVoucher(v)
    if (result.ok) ok++
    else failures.push({ code: v.code, error: result.error ?? 'unknown' })
  }
  console.log(`Updated ${ok}/${candidates.length} voucher(s).`)
  if (failures.length > 0) {
    console.log(`Failed (${failures.length}):`)
    for (const f of failures) console.log(`  ${f.code}: ${f.error}`)
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
