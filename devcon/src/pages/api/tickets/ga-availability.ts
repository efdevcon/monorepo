import type { NextApiRequest, NextApiResponse } from 'next'
import { getTicketPurchaseInfo, isItemAvailable } from 'services/pretix'
import { TICKETING } from 'config/ticketing'
import type { TicketInfo } from 'types/pretix'

/**
 * General Admission info straight from Pretix — the GA item (price, name,
 * max-per-order) plus a FRESH quota check — independent of the x402 catalog
 * (`/api/x402/tickets/`, gated by `x402ApiEnabled`). This lets the store render
 * the GA cart selector and a genuine sold-out state even when the x402 catalog
 * is "parked" and sales run through Pretix's hosted shop. Only the single GA
 * admission item is exposed (its price + availability are already public on
 * /tickets), not the full catalog/voucher/discount config the x402 kill switch
 * protects.
 *
 * Fails open (`available: true`) so a transient Pretix hiccup routes buyers to
 * checkout rather than falsely blocking them — Pretix is the final gate.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const gaItemId = TICKETING.pretix.gaItemId
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

  if (gaItemId == null) {
    return res.status(200).json({ available: true, ticket: null })
  }

  try {
    const locale = typeof req.query.locale === 'string' ? req.query.locale : 'en'
    const [info, available] = await Promise.all([getTicketPurchaseInfo(locale), isItemAvailable(gaItemId)])
    const ticket: TicketInfo | null = info.tickets.find(t => t.id === gaItemId) ?? null
    return res.status(200).json({ available, ticket })
  } catch {
    return res.status(200).json({ available: true, ticket: null })
  }
}
