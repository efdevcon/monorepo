/**
 * Admin sales statistics — tickets sold by type, payment lane (ETH vs fiat),
 * and per-day, aggregated directly from Pretix (the source of truth that
 * includes fiat/Stripe orders, which the crypto-only dashboard data misses).
 *
 * GET /api/x402/admin/sales-stats/   (x-admin-key auth)
 *
 * Aggregation rules:
 *   - Only PAID (status 'p'), non-testmode orders count as sales.
 *   - Lane comes from the order's confirmed payment provider:
 *       stripe*        → fiat
 *       walletconnect  → eth
 *       anything else (manual, free, …) or a $0 total → other
 *   - Every order position (admission tickets AND add-ons) counts as one
 *     unit of its item; the by-type table therefore covers all products.
 *   - Days are UTC dates of the order creation time.
 *   - ETH/fiat percentages exclude the "other" lane (comps, manual).
 *
 * Performance — this runs inside a single function invocation and has to
 * finish well within the platform timeout, so the Pretix work is shaped
 * around what the API actually allows (a sequential full-payload sweep was
 * an order of magnitude slower and hit the timeout, 2026-09-14):
 *   - Pretix clamps page_size to 50 whatever is requested, so the order
 *     sweep is many round trips. Page 1 is fetched alone for `count`, then
 *     the remaining pages run through a small worker pool.
 *   - Orders are filtered server-side (status=p, testmode=false) and trimmed
 *     with Pretix's `include` parameter to the few fields read below, which
 *     cuts the per-page payload by more than 10x and the latency by ~3x.
 *   - Catalog (items, quotas), Supabase and NocoDB are independent of the
 *     order sweep until the final join, so they all load in parallel.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from 'utils/adminAuth'
import { TICKETING, getPretixApiToken } from 'config/ticketing'

/** NocoDB application tables surfaced on the dashboard. Table ids come from
 *  the form.devcon.org URLs (…/<baseId>/<tableId>/<viewId>/…); statusField is
 *  each table's review column, and rows with an empty status count under
 *  emptyLabel. Fetched via the NocoDB v2 records API (paginated). */
const APPLICATION_SOURCES = [
  // src/pages/api/builder/review/[id].ts drives this table's Decision field
  {
    label: 'Builder',
    tableId: 'mj5drwikc8fxslp',
    statusField: 'Decision',
    emptyLabel: 'pending',
    url: 'https://form.devcon.org/wx5thjwz/pzerie4iw55aae0/mj5drwikc8fxslp/vwtb958w9fgbjy40/builder-application-builder-application',
  },
  {
    label: 'Students',
    tableId: 'm500tv5ywq983co',
    statusField: 'Status',
    emptyLabel: 'to process',
    url: 'https://form.devcon.org/wx5thjwz/pzerie4iw55aae0/m500tv5ywq983co/vwcph6o6x0yp78zj/student-application-grid',
  },
  {
    label: 'Youth',
    tableId: 'mnniomolz1z8634',
    statusField: 'Request Status',
    emptyLabel: 'to process',
    url: 'https://form.devcon.org/wx5thjwz/pzerie4iw55aae0/mnniomolz1z8634/vw2o8speg56br66p/youth-ticket-application-youth-ticket',
  },
] as const

/** Pretix silently clamps list pages to 50 results; asking for more changes
 *  nothing, so the sweep is sized on the real page length. */
const PRETIX_PAGE_SIZE = 50
/** Concurrent Pretix page fetches. Pretix publishes no rate limit, but a
 *  small pool keeps the burst polite. */
const PRETIX_CONCURRENCY = 6
/** Exactly the order fields the aggregation reads (see PretixOrderLite).
 *  Passed as Pretix `include` params so the API strips everything else
 *  (attendee data, answers, invoice address, fees, payment details, …). */
const ORDER_FIELDS = [
  'code',
  'status',
  'testmode',
  'datetime',
  'total',
  'payments.provider',
  'payments.state',
  'positions.item',
  'positions.voucher',
]

interface LaneCounts {
  total: number
  eth: number
  fiat: number
  other: number
}

interface ItemStats extends LaneCounts {
  itemId: number
  name: string
  /** 'ticket' = Pretix admission item; 'swag' = everything else (scarf,
   *  shirt, chess set, … incl. their discounted variants). Driven by the
   *  item's `admission` flag so new swag needs no code change. */
  kind: 'ticket' | 'swag'
  /** Size of the most binding Pretix quota covering this item (smallest
   *  size among its quotas); null = no quota / unlimited. */
  quotaSize: number | null
  /** Live units left on that quota per Pretix availability — accounts for
   *  pending orders, cart reservations, and blocking vouchers, so it can be
   *  lower than quotaSize - sold. Null when unlimited/unknown. */
  quotaLeft: number | null
  /** True when that quota also covers other items (shared pool), so the
   *  sold/size bar is indicative rather than exact. */
  quotaShared: boolean
  /** True when the quota is closed for sale (e.g. close_when_sold_out fired).
   *  Pretix reports 0 available for closed quotas even when cancellations
   *  released units back — "closed" is the honest label, not "0 left". */
  quotaClosed: boolean
}

interface DailyStats extends LaneCounts {
  date: string
  orders: number
  /** Swag units sold that day (not counted in the ticket lane fields). */
  swag: number
  revenueUsd: number
  ethRevenueUsd: number
  fiatRevenueUsd: number
}

export interface SalesStatsResponse {
  success: boolean
  error?: string
  generatedAt?: string
  totals?: LaneCounts & {
    orders: number
    /** Swag units across all lanes (not part of the ticket LaneCounts). */
    swag: number
    revenueUsd: number
    ethRevenueUsd: number
    fiatRevenueUsd: number
    /** Share of eth vs fiat among tickets sold through those two lanes. */
    ethPctTickets: number | null
    fiatPctTickets: number | null
    ethPctRevenue: number | null
    fiatPctRevenue: number | null
  }
  items?: ItemStats[]
  daily?: DailyStats[]
  /** Early-access voucher pipeline from devcon8_early_access_vouchers, per
   *  collection: generated (rows) → assigned (claimed by an identity) →
   *  emailed (voucher email sent) → redeemed (the Pretix voucher has been
   *  used on an order; joined by code against Pretix's voucher list).
   *  Null on Supabase failure (see errors). */
  vouchers?:
    | { collection: string; generated: number; assigned: number; emailed: number; redeemed: number }[]
    | null
  /** Form applications from NocoDB (builder / students / youth), each with
   *  its review-status distribution. Sources that failed are simply absent
   *  (named in sourceErrors); null when every source failed. */
  applications?: { label: string; url: string; total: number; byStatus: Record<string, number> }[] | null
  /** Non-fatal source failures (Pretix stats still returned). */
  sourceErrors?: string[]
}

type ApplicationStats = NonNullable<SalesStatsResponse['applications']>[number]

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : `${url}/`
  if (!normalized.includes('/api/')) {
    normalized = `${normalized}api/v1/`
  }
  return normalized
}

function laneOf(order: PretixOrderLite): 'eth' | 'fiat' | 'other' {
  if (parseFloat(order.total || '0') === 0) return 'other'
  const confirmed = (order.payments || []).find(p => p.state === 'confirmed')
  const provider = confirmed?.provider || ''
  if (provider.startsWith('stripe')) return 'fiat'
  if (provider === 'walletconnect') return 'eth'
  return 'other'
}

interface PretixOrderLite {
  code: string
  status: string
  testmode: boolean
  datetime: string
  total: string
  payments?: { provider: string; state: string }[]
  positions?: { item: number; voucher?: number | null }[]
}

/** Shape of every paginated Pretix list response. Annotating the parsed
 *  json with this breaks the `url → fetch → data.next → url` circular
 *  inference that otherwise makes `data` implicitly any (ts7022). */
interface PretixPage<T> {
  count: number
  next: string | null
  results: T[]
}

interface PretixItemLite {
  id: number
  name: string | Record<string, string> | null
  admission?: boolean
}

interface QuotaLite {
  size: number | null
  items: number[]
  closed?: boolean
  available_number?: number | null
  availability?: { available_number?: number | null }
}

/** Runs `fn` over `items` with at most `concurrency` in flight; results keep
 *  the input order. */
async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i])
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return out
}

async function fetchPretixPage<T>(
  url: string,
  headers: Record<string, string>,
  what: string,
  opts: { pastEnd?: boolean } = {}
): Promise<PretixPage<T>> {
  const r = await fetch(url, { headers })
  // Pages are planned from the first page's `count`; if the set shrinks
  // while the sweep runs (an order refunded mid-flight) the last planned
  // page no longer exists and Pretix answers 404. That is an empty page,
  // not a failure.
  if (r.status === 404 && opts.pastEnd) return { count: 0, next: null, results: [] }
  if (!r.ok) throw new Error(`Pretix ${what} ${r.status}`)
  return r.json()
}

/** Every result of a Pretix list endpoint. Page 1 is fetched alone for its
 *  `count`; the remaining pages are independent and run concurrently. Lists
 *  are requested in ascending datetime order so rows that appear during the
 *  sweep land on a trailing page (picked up next refresh) instead of
 *  shifting the pages already planned. */
async function fetchAllPretixPages<T>(firstUrl: string, headers: Record<string, string>, what: string): Promise<T[]> {
  const first = await fetchPretixPage<T>(firstUrl, headers, what)
  const results = [...first.results]
  if (!first.next || first.results.length === 0) return results
  const pageCount = Math.ceil(first.count / first.results.length)
  const urls: string[] = []
  for (let page = 2; page <= pageCount; page++) {
    const u = new URL(firstUrl)
    u.searchParams.set('page', String(page))
    urls.push(u.toString())
  }
  const pages = await mapPool(urls, PRETIX_CONCURRENCY, url =>
    fetchPretixPage<T>(url, headers, what, { pastEnd: true })
  )
  for (const page of pages) results.push(...page.results)
  return results
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SalesStatsResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!checkAdminAuth(req, res, { allowReadonly: true })) return

  const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
  const eventUrl = `${baseUrl}organizers/${TICKETING.pretix.organizer}/events/${TICKETING.pretix.event}/`
  const headers = { Authorization: `Token ${getPretixApiToken()}` }

  // ── Sources. The three Pretix loaders are fatal (no stats without them);
  // Supabase and NocoDB are failure-isolated — an outage there must not take
  // down the sales numbers — and report through sourceErrors instead. ──

  // Item id → display name (localized objects; prefer en) + admission flag
  // (admission=true → ticket; false → swag/add-on).
  const loadItemMeta = async () => {
    const items = await fetchAllPretixPages<PretixItemLite>(`${eventUrl}items/?page_size=${PRETIX_PAGE_SIZE}`, headers, 'items')
    const itemMeta = new Map<number, { name: string; admission: boolean }>()
    for (const it of items) {
      const name = typeof it.name === 'string' ? it.name : it.name?.en || Object.values(it.name || {})[0] || `#${it.id}`
      itemMeta.set(it.id, { name: String(name), admission: !!it.admission })
    }
    return itemMeta
  }

  // Quotas with live availability. An item can be covered by several
  // quotas; we surface the most binding one (smallest size).
  const loadQuotaByItem = async () => {
    const quotas = await fetchAllPretixPages<QuotaLite>(
      `${eventUrl}quotas/?with_availability=true&page_size=${PRETIX_PAGE_SIZE}`,
      headers,
      'quotas'
    )
    const quotaByItem = new Map<number, { size: number; left: number | null; shared: boolean; closed: boolean }>()
    for (const qta of quotas) {
      if (qta.size == null) continue // unlimited quota never binds
      const left = qta.availability?.available_number ?? qta.available_number ?? null
      for (const itemId of qta.items || []) {
        const existing = quotaByItem.get(itemId)
        if (!existing || qta.size < existing.size) {
          quotaByItem.set(itemId, { size: qta.size, left, shared: (qta.items || []).length > 1, closed: !!qta.closed })
        }
      }
    }
    return quotaByItem
  }

  // Paid, non-test orders only, trimmed to the fields read below.
  const loadPaidOrders = async () => {
    const u = new URL(`${eventUrl}orders/`)
    u.searchParams.set('page_size', String(PRETIX_PAGE_SIZE))
    u.searchParams.set('status', 'p')
    u.searchParams.set('testmode', 'false')
    u.searchParams.set('ordering', 'datetime')
    for (const field of ORDER_FIELDS) u.searchParams.append('include', field)
    const orders = await fetchAllPretixPages<PretixOrderLite>(u.toString(), headers, 'orders')
    // Keyed by code so an order that shifts across a page boundary during
    // the concurrent sweep can never be counted twice.
    const byCode = new Map<string, PretixOrderLite>()
    for (const o of orders) byCode.set(o.code, o)
    return [...byCode.values()]
  }

  // Early-access voucher pipeline per collection. `redeemed` is counted
  // later from actual PAID order positions (via the position's voucher id),
  // not Pretix's voucher counter, which also counts pending orders.
  interface VoucherCounts {
    generated: number
    assigned: number
    emailed: number
    redeemed: number
  }
  const loadVouchers = async (): Promise<
    { ok: true; agg: Map<string, VoucherCounts>; collectionById: Map<number, string> } | { ok: false; error: string }
  > => {
    try {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseKey) throw new Error('Supabase env not configured')
      const supabase = createClient(supabaseUrl, supabaseKey)
      const agg = new Map<string, VoucherCounts>()
      const collectionById = new Map<number, string>()
      const PAGE = 1000
      for (let from = 0; ; from += PAGE) {
        const { data: rows, error } = await supabase
          .from('devcon8_early_access_vouchers')
          .select('collection, assigned_to, email_sent, pretix_voucher_id')
          .range(from, from + PAGE - 1)
        if (error) throw new Error(error.message)
        for (const row of rows ?? []) {
          const key = row.collection || '(none)'
          let c = agg.get(key)
          if (!c) {
            c = { generated: 0, assigned: 0, emailed: 0, redeemed: 0 }
            agg.set(key, c)
          }
          c.generated++
          if (row.assigned_to) c.assigned++
          if (row.email_sent) c.emailed++
          if (row.pretix_voucher_id != null) collectionById.set(row.pretix_voucher_id, key)
        }
        if (!rows || rows.length < PAGE) break
      }
      return { ok: true, agg, collectionById }
    } catch (e) {
      return { ok: false, error: `vouchers: ${(e as Error).message}` }
    }
  }

  // Form applications (builder / students / youth) by review status, the
  // three tables in parallel.
  const loadApplications = () =>
    Promise.all(
      APPLICATION_SOURCES.map(async (src): Promise<{ ok: true; stats: ApplicationStats } | { ok: false; error: string }> => {
        try {
          const nocoBase = process.env.NOCODB_BASE_URL
          const nocoToken = process.env.NOCODB_API_TOKEN
          if (!nocoBase || !nocoToken) throw new Error('NocoDB env not configured')
          const byStatus: Record<string, number> = {}
          let total = 0
          for (let offset = 0; ; offset += 200) {
            // No `fields=` filter: NocoDB 404s when a named field doesn't
            // exist on the table (e.g. Youth has no Status column yet), and
            // these tables are small enough to fetch whole rows.
            const r = await fetch(`${nocoBase}/api/v2/tables/${src.tableId}/records?limit=200&offset=${offset}`, {
              headers: { 'xc-token': nocoToken },
            })
            if (!r.ok) throw new Error(`NocoDB ${r.status}`)
            const page: { list?: Record<string, unknown>[] } = await r.json()
            const rows = page.list ?? []
            for (const row of rows) {
              total++
              const status = String(row[src.statusField] || src.emptyLabel)
              byStatus[status] = (byStatus[status] ?? 0) + 1
            }
            if (rows.length < 200) break
          }
          return { ok: true, stats: { label: src.label, url: src.url, total, byStatus } }
        } catch (e) {
          return { ok: false, error: `applications/${src.label}: ${(e as Error).message}` }
        }
      })
    )

  try {
    const startedAt = Date.now()
    const [itemMeta, quotaByItem, paidOrders, voucherSource, applicationSources] = await Promise.all([
      loadItemMeta(),
      loadQuotaByItem(),
      loadPaidOrders(),
      loadVouchers(),
      loadApplications(),
    ])

    const sourceErrors: string[] = []
    const voucherAgg = voucherSource.ok ? voucherSource.agg : new Map<string, VoucherCounts>()
    const voucherCollectionById = voucherSource.ok ? voucherSource.collectionById : new Map<number, string>()
    if (!voucherSource.ok) sourceErrors.push(voucherSource.error)

    const itemStats = new Map<number, ItemStats>()
    const dailyStats = new Map<string, DailyStats>()
    const totals = {
      orders: 0,
      total: 0,
      eth: 0,
      fiat: 0,
      other: 0,
      swag: 0,
      revenueUsd: 0,
      ethRevenueUsd: 0,
      fiatRevenueUsd: 0,
    }

    for (const o of paidOrders) {
      // Already filtered server-side; kept as a guard against a filter that
      // silently stops applying after a Pretix upgrade.
      if (o.testmode || o.status !== 'p') continue
      const lane = laneOf(o)
      const date = (o.datetime || '').slice(0, 10)
      const revenue = parseFloat(o.total || '0') || 0
      const positions = o.positions ?? []

      totals.orders++
      totals.revenueUsd += revenue
      if (lane === 'eth') totals.ethRevenueUsd += revenue
      if (lane === 'fiat') totals.fiatRevenueUsd += revenue

      let day = dailyStats.get(date)
      if (!day) {
        day = { date, orders: 0, total: 0, eth: 0, fiat: 0, other: 0, swag: 0, revenueUsd: 0, ethRevenueUsd: 0, fiatRevenueUsd: 0 }
        dailyStats.set(date, day)
      }
      day.orders++
      day.revenueUsd += revenue
      if (lane === 'eth') day.ethRevenueUsd += revenue
      if (lane === 'fiat') day.fiatRevenueUsd += revenue

      for (const pos of positions) {
        // Voucher redemption "based on tickets sold": this position sits on
        // a PAID order and was bought with a tracked early-access voucher.
        if (pos.voucher != null) {
          const collection = voucherCollectionById.get(pos.voucher)
          if (collection) {
            const c = voucherAgg.get(collection)
            if (c) c.redeemed++
          }
        }
        const meta = itemMeta.get(pos.item)
        const kind: 'ticket' | 'swag' = meta?.admission === false ? 'swag' : 'ticket'
        let item = itemStats.get(pos.item)
        if (!item) {
          const quota = quotaByItem.get(pos.item)
          item = {
            itemId: pos.item,
            name: meta?.name ?? `Item #${pos.item}`,
            kind,
            total: 0,
            eth: 0,
            fiat: 0,
            other: 0,
            quotaSize: quota?.size ?? null,
            quotaLeft: quota?.left ?? null,
            quotaShared: quota?.shared ?? false,
            quotaClosed: quota?.closed ?? false,
          }
          itemStats.set(pos.item, item)
        }
        item.total++
        item[lane]++
        if (kind === 'swag') {
          // Swag counts separately — it must not inflate the ticket
          // totals or the ETH/fiat ticket percentages.
          totals.swag++
          day.swag++
        } else {
          totals.total++
          totals[lane]++
          day.total++
          day[lane]++
        }
      }
    }

    const vouchers: SalesStatsResponse['vouchers'] = voucherSource.ok
      ? [...voucherAgg.entries()].map(([collection, c]) => ({ collection, ...c })).sort((a, b) => b.generated - a.generated)
      : null

    const applicationResults: ApplicationStats[] = []
    for (const src of applicationSources) {
      if (src.ok) applicationResults.push(src.stats)
      else sourceErrors.push(src.error)
    }
    const applications: SalesStatsResponse['applications'] = applicationResults.length ? applicationResults : null

    const paidLaneTickets = totals.eth + totals.fiat
    const paidLaneRevenue = totals.ethRevenueUsd + totals.fiatRevenueUsd
    const round2 = (n: number) => Math.round(n * 100) / 100

    // One line per run in the function log, so a slow Pretix is visible
    // without re-instrumenting.
    console.info(`[sales-stats] ${paidOrders.length} paid orders aggregated in ${Date.now() - startedAt}ms`)

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      totals: {
        ...totals,
        revenueUsd: round2(totals.revenueUsd),
        ethRevenueUsd: round2(totals.ethRevenueUsd),
        fiatRevenueUsd: round2(totals.fiatRevenueUsd),
        ethPctTickets: paidLaneTickets ? round2((totals.eth / paidLaneTickets) * 100) : null,
        fiatPctTickets: paidLaneTickets ? round2((totals.fiat / paidLaneTickets) * 100) : null,
        ethPctRevenue: paidLaneRevenue ? round2((totals.ethRevenueUsd / paidLaneRevenue) * 100) : null,
        fiatPctRevenue: paidLaneRevenue ? round2((totals.fiatRevenueUsd / paidLaneRevenue) * 100) : null,
      },
      vouchers,
      applications,
      ...(sourceErrors.length ? { sourceErrors } : {}),
      items: [...itemStats.values()].sort((a, b) => b.total - a.total),
      daily: [...dailyStats.values()]
        .map(d => ({
          ...d,
          revenueUsd: round2(d.revenueUsd),
          ethRevenueUsd: round2(d.ethRevenueUsd),
          fiatRevenueUsd: round2(d.fiatRevenueUsd),
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    })
  } catch (e) {
    console.error('[sales-stats] failed:', e)
    return res.status(502).json({ success: false, error: 'Failed to aggregate Pretix sales data' })
  }
}
