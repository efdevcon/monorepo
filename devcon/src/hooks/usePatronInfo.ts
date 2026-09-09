import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { TICKETING } from 'config/ticketing'
import type { PatronInfoResponse } from 'pages/api/tickets/patron-info'

// USD amounts for the Patron ticket: "2,000" / "2,500.5". No currency symbol,
// callers add it so the intl strings can place it.
export const formatPatronAmount = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Patron ticket availability + pricing, straight from Pretix via
// /api/tickets/patron-info/. Shared by the store card, the dedicated
// /tickets/store/patron/ page and the General Admission table on /tickets/.
//
//   configured  the env has a Patron item id (null hides everything)
//   loading     configured, request in flight
//   available   Pretix says the item is purchasable right now
//   fixedPrice  the item is not free-price (buyer cannot choose the amount)
export function usePatronInfo() {
  const { locale } = useRouter()
  const configured = TICKETING.patron.itemId != null
  const [info, setInfo] = useState<PatronInfoResponse | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!configured) return
    let cancelled = false
    fetch(`/api/tickets/patron-info/?locale=${encodeURIComponent(locale ?? 'en')}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<PatronInfoResponse>
      })
      .then(data => {
        if (!cancelled) setInfo(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [configured, locale])

  const item = info?.item ?? null
  const available = Boolean(info?.available && item)
  const minPrice = item ? Number(item.minPrice) : 0
  const fixedPrice = Boolean(item && !item.freePrice)
  const loading = configured && info === null && !loadError

  return { configured, info, item, available, minPrice, fixedPrice, loading, loadError }
}
