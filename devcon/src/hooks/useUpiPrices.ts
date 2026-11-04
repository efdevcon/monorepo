import { useSyncExternalStore } from 'react'
import { TICKETING, discountItem } from 'config/ticketing'

/** Formatted rupee price by Pretix item id (e.g. `{ '53': '₹3,315' }`); empty until loaded. */
export type UpiPriceMap = Record<string, string>

/** Products whose rupee price the ticket surfaces show, resolved to the
 *  environment's Pretix item id. Content rows name a product by this slug
 *  (`upiProduct`), never by item id, so the ids stay in config. */
export type UpiProduct = 'daily-india-pass' | 'indian-student'

export function upiProductItemId(product: UpiProduct): number | null {
  switch (product) {
    case 'daily-india-pass':
      return TICKETING.pretix.dailyIndiaPassItemId
    case 'indian-student':
      return discountItem('indian-student') ?? null
  }
}

/** The product's rupee price from the map, or null while loading / when the item has no rupee price. */
export function upiPriceFor(prices: UpiPriceMap, product: UpiProduct | undefined): string | null {
  if (!product) return null
  const itemId = upiProductItemId(product)
  return itemId === null ? null : prices[String(itemId)] ?? null
}

// ── Singleton store ─────────────────────────────────────────────────────────
// `/api/tickets/upi-prices/` is fetched once per page load no matter how many
// surfaces read it (the /tickets page has three). Prices change rarely; the
// endpoint is CDN-cached, so there is no polling.

const EMPTY_MAP: UpiPriceMap = {}
let latestMap: UpiPriceMap = EMPTY_MAP
let subscribers = new Set<() => void>()
let started = false

async function load() {
  try {
    const res = await fetch('/api/tickets/upi-prices/')
    if (!res.ok) return
    const json = await res.json()
    const prices = json?.data?.prices
    if (!prices || typeof prices !== 'object') return
    const next: UpiPriceMap = {}
    for (const [itemId, price] of Object.entries(prices)) {
      if (typeof price === 'string') next[itemId] = price
    }
    latestMap = next
    for (const cb of subscribers) cb()
  } catch {
    // Leave the map empty: the surfaces then show the USD price alone.
  }
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  if (!started) {
    started = true
    load()
  }
  return () => {
    subscribers.delete(cb)
  }
}

function getSnapshot(): UpiPriceMap {
  return latestMap
}

function getServerSnapshot(): UpiPriceMap {
  return EMPTY_MAP
}

/** Live rupee prices by Pretix item id. Empty on the server and until the first fetch lands. */
export function useUpiPrices(): UpiPriceMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
