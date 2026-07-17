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
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { TICKETING, getPretixApiToken } from 'config/ticketing'

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
}

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
  positions?: { item: number }[]
}

/** Shape of every paginated Pretix list response. Annotating the parsed
 *  json with this breaks the `url → fetch → data.next → url` circular
 *  inference that otherwise makes `data` implicitly any (ts7022). */
interface PretixPage<T> {
  next: string | null
  results: T[]
}

interface PretixItemLite {
  id: number
  name: string | Record<string, string> | null
  admission?: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SalesStatsResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!checkAdminAuth(req, res)) return

  const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
  const org = TICKETING.pretix.organizer
  const ev = TICKETING.pretix.event
  const headers = { Authorization: `Token ${getPretixApiToken()}` }

  try {
    // Item id → display name (localized objects; prefer en) + admission flag
    // (admission=true → ticket; false → swag/add-on).
    const itemMeta = new Map<number, { name: string; admission: boolean }>()
    let itemsUrl: string | null = `${baseUrl}organizers/${org}/events/${ev}/items/?page_size=100`
    while (itemsUrl) {
      const r = await fetch(itemsUrl, { headers })
      if (!r.ok) throw new Error(`Pretix items ${r.status}`)
      const data: PretixPage<PretixItemLite> = await r.json()
      for (const it of data.results) {
        const name = typeof it.name === 'string' ? it.name : it.name?.en || Object.values(it.name || {})[0] || `#${it.id}`
        itemMeta.set(it.id, { name: String(name), admission: !!it.admission })
      }
      itemsUrl = data.next
    }

    // Quotas with live availability. An item can be covered by several
    // quotas; we surface the most binding one (smallest size).
    interface QuotaLite {
      size: number | null
      items: number[]
      closed?: boolean
      available_number?: number | null
      availability?: { available_number?: number | null }
    }
    const quotaByItem = new Map<number, { size: number; left: number | null; shared: boolean; closed: boolean }>()
    let quotasUrl: string | null = `${baseUrl}organizers/${org}/events/${ev}/quotas/?with_availability=true&page_size=100`
    while (quotasUrl) {
      const r = await fetch(quotasUrl, { headers })
      if (!r.ok) throw new Error(`Pretix quotas ${r.status}`)
      const data: PretixPage<QuotaLite> = await r.json()
      for (const qta of data.results) {
        if (qta.size == null) continue // unlimited quota never binds
        const left = qta.availability?.available_number ?? qta.available_number ?? null
        for (const itemId of qta.items || []) {
          const existing = quotaByItem.get(itemId)
          if (!existing || qta.size < existing.size) {
            quotaByItem.set(itemId, { size: qta.size, left, shared: (qta.items || []).length > 1, closed: !!qta.closed })
          }
        }
      }
      quotasUrl = data.next
    }

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

    let url: string | null = `${baseUrl}organizers/${org}/events/${ev}/orders/?page_size=100`
    while (url) {
      const r = await fetch(url, { headers })
      if (!r.ok) throw new Error(`Pretix orders ${r.status}`)
      const data: PretixPage<PretixOrderLite> = await r.json()
      for (const o of data.results) {
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
      url = data.next
    }

    const paidLaneTickets = totals.eth + totals.fiat
    const paidLaneRevenue = totals.ethRevenueUsd + totals.fiatRevenueUsd
    const round2 = (n: number) => Math.round(n * 100) / 100

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
