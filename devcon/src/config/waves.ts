// Canonical wave config — single source of truth for the General Admission
// sale waves table, the countdown timers across the site, and the hero / strip
// status messaging.
//
// To change wave details (prices, names, opening times, fallback labels), edit
// this file only. Hooks and components derive everything they need from it.

export interface TicketWave {
  // Stable internal id; used for matching dynamic state to a row.
  id: string
  // Display name shown in the General Admission table.
  name: string
  // Display price.
  price: string
  // When this wave opens. Multiple times = multiple opening windows on the
  // same wave (e.g. 02:00 UTC + 16:00 UTC to span timezones). Omit if the
  // exact time isn't set yet — falls back to `openLabel`.
  openTimes?: Date[]
  // Static date label shown when `openTimes` is undefined (e.g. "Opens in June").
  openLabel?: string
  // CTA shown on the row when the wave is live (e.g. "Get tickets" → /tickets/store).
  action?: string
  actionHref?: string
  // Short tagline rendered on the sale banner below the countdown. Use • to
  // separate bullet-style fragments (e.g. "Limited quantity • Save $350").
  description?: string
}

export const TICKET_WAVES: TicketWave[] = [
  {
    id: 'eth-early-bird',
    name: 'ETH Early Bird',
    price: '$349',
    // Two windows on the same day to span global timezones:
    //   02:00 UTC → 07:30 IST / 22:00 PT (previous day) — Asia-friendly window
    //   16:00 UTC → 21:30 IST / 09:00 PT — Americas-friendly window
    openTimes: [new Date(Date.UTC(2026, 4, 20, 2, 0, 0))], // , new Date(Date.UTC(2026, 4, 20, 16, 0, 0))],
    description: 'Limited quantity • Save $350 • Purchasable using ETH (L1)',
    action: 'Get tickets',
    actionHref: '/tickets/store',
  },
  {
    id: 'wave-1',
    name: 'First wave',
    description: 'Limited quantity, cheaper than subsequent waves',
    price: '$699',
    openLabel: 'Opens Jun 15',
    openTimes: [new Date(Date.UTC(2026, 5, 15, 2, 0, 0)), new Date(Date.UTC(2026, 5, 15, 16, 0, 0))],
  },
  {
    id: 'wave-2',
    name: 'Subsequent waves',
    price: 'More than $699',
    openLabel: 'Opens in July',
    // openTimes: [new Date(Date.UTC(2026, 6, 20, 2, 0, 0))],
  },
]

// Flat list of every opening time across all waves — used by the countdown
// hooks to determine the next upcoming wave globally.
export const TICKET_WAVE_TIMES: Date[] = TICKET_WAVES.flatMap(w => w.openTimes ?? [])
