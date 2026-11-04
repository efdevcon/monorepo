/**
 * Rupee (UPI) prices for the ticket surfaces, read from Pretix. Each item
 * that can be paid by UPI carries its rupee price in the `upi_price_inr`
 * item meta property (the same property the Pretix UPI rail and the QR-share
 * voucher pages use); this maps every such item id to a formatted figure.
 * Server-side only (goes through the Pretix API token).
 */
import { getItems } from './pretix'

/** Rupees as the Pretix catalog shows them: Indian grouping, no ".00". */
export function formatRupees(amount: number): string {
  return (
    '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '')
  )
}

/** The operator's `upi_price_inr`: plain digits and dot, positive; anything else means "no rupee price". */
export function parseRupees(raw: string | undefined): number | null {
  const s = (raw ?? '').trim()
  if (!s || !/^[0-9.]+$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Item id → formatted rupee price (e.g. `{ 53: '₹3,315' }`) for every item with a rupee price. */
export async function getUpiPrices(): Promise<Record<number, string>> {
  const items = await getItems()
  const prices: Record<number, string> = {}
  for (const item of items) {
    const amount = parseRupees(item.meta_data?.upi_price_inr)
    if (amount !== null) prices[item.id] = formatRupees(amount)
  }
  return prices
}
