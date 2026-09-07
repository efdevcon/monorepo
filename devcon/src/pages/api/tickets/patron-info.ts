import type { NextApiRequest, NextApiResponse } from 'next'
import { getItem, isItemAvailable, getLocalizedString } from 'services/pretix'
import { TICKETING } from 'config/ticketing'

export interface PatronInfo {
  id: number
  name: string
  description: string | null
  /** Minimum gross amount: Pretix `default_price`, which is the floor for a
   *  free-price item. Decimal string as returned by Pretix. */
  minPrice: string
  /** Pretix's own pre-filled suggestion, if configured. */
  suggestedPrice: string | null
  /** False means the item is a fixed-price item and the amount picker must
   *  not be shown. */
  freePrice: boolean
  /** Pretix `max_per_order`; null means no per-order cap. */
  maxPerOrder: number | null
}

export interface PatronInfoResponse {
  available: boolean
  item: PatronInfo | null
}

/**
 * Patron ticket info straight from Pretix: the configured free-price item
 * (name, description, minimum amount) plus a FRESH quota check. Backs
 * /tickets/store/patron/, which hands the buyer-chosen amount to Pretix's
 * cart; Pretix stays the final gate on price and availability.
 *
 * Fails CLOSED (`available: false`): without the minimum amount the picker
 * can't render sensibly, and the page offers the plain Pretix shop link as a
 * fallback in that state.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<PatronInfoResponse>) {
  const itemId = TICKETING.patron.itemId
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

  if (itemId == null) {
    return res.status(200).json({ available: false, item: null })
  }

  try {
    const locale = typeof req.query.locale === 'string' ? req.query.locale : 'en'
    const [item, available] = await Promise.all([getItem(itemId), isItemAvailable(itemId)])
    const info: PatronInfo = {
      id: item.id,
      name: getLocalizedString(item.name, locale),
      description: item.description ? getLocalizedString(item.description, locale) : null,
      minPrice: item.default_price,
      suggestedPrice: item.free_price_suggestion ?? null,
      freePrice: item.free_price,
      maxPerOrder: item.max_per_order ?? null,
    }
    return res.status(200).json({ available: available && item.active, item: info })
  } catch {
    return res.status(200).json({ available: false, item: null })
  }
}
