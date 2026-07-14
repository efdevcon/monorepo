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
  // Legacy single-price fallback used when ethPrice is not set. Kept for
  // backwards compat with the countdown banner and older row rendering
  // paths that only know about one price field.
  price: string
  // ETH-side price for the wave's row (green chip on the /tickets landing).
  // Falls back to `price` when unset.
  ethPrice?: string
  // Fiat-side price for the wave's row. When unset, the fiat cell in the
  // /tickets table renders empty (i.e. ETH-only for that wave).
  fiatPrice?: string
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
  // Bullet points rendered on the sale banner — inline (• separated) on
  // tablet/desktop, as a real bulleted list on mobile. The "Includes 18% GST"
  // GST line is prepended automatically from translations; only list the
  // wave-specific points here.
  bannerBullets?: string[]
  // Pretix quota ID backing this wave's inventory. DORMANT: wave state is now
  // schedule-only + the manual GA_SALE_STATE switch, so the live availability
  // poll (`/api/tickets/availability/`) is disabled and this is no longer read
  // by the wave-state logic. Kept as a reference to which Pretix quota backs
  // each wave; re-wire `useWaveStates` to `useTicketAvailabilityMap` to restore
  // automatic sold-out detection.
  quotaId?: number
  // Renders the row de-emphasized (muted purple name + ETH price, no
  // strikethrough) — used for the Final Waves future/TBA tier per Figma.
  dimmed?: boolean
}

// The global General Admission ticket launch moment. Exported so `useNow`
// can resolve the `?mockNow=launch` shorthand to "just after launch" and so
// any surface can reference the canonical launch time without re-deriving it
// from the waves list.
// 14 Jul 2026 16:00 UTC
export const GLOBAL_LAUNCH_TIME = new Date(Date.UTC(2026, 6, 14, 16, 0, 0))

// ── Current sale wave ────────────────────────────────────────────────────
// Points at the wave that is currently "the active sale" (matched by `id`).
// The wave-state logic is position-relative to this pointer, with no reliance
// on close/reopen dates:
//   - waves BEFORE it (config order) → "Sale ended"
//   - the current wave               → driven by GA_SALE_STATE below
//   - waves AFTER it                 → upcoming (their openLabel / "Date TBA")
// Because it's an explicit pointer (not derived from the sequence), the current
// wave and the next wave can both be General Admission — just keep it pointed at
// GA and toggle GA_SALE_STATE across rounds. Move it (e.g. to 'final-waves')
// only when a genuinely different wave becomes the active sale.
export const CURRENT_WAVE_ID = 'wave-ga'

// ── Current sale state ───────────────────────────────────────────────────
// THE single switch for the current wave (CURRENT_WAVE_ID). One of:
//   'open'        — selling normally (row shows price + "Get tickets").
//   'coming-soon' — reopening at a known time: the strip / hero / banner count
//                   down to GA_COMING_SOON_OPENS_AT ("General Admission tickets
//                   available in 5d 20h …"), badge reads "Coming soon". CTA
//                   hidden, price kept.
//   'closed'      — reopening later, no exact time yet: shows GA_CLOSED_LABEL
//                   ("Reopens Aug"), no timer. CTA hidden, price kept.
// The overview / comparison tags flip to match. Nothing else needs editing.
// Preview: `?mockNow=coming-soon` or `?mockNow=closed`.
export type GaSaleState = 'open' | 'coming-soon' | 'closed'
export const GA_SALE_STATE: GaSaleState = 'open'

// Time the 'coming-soon' state counts down to. Defaults to the global launch
// (14 Jul 2026, 16:00 UTC) so the surfaces read "Available on Jul 14, 16:00
// UTC" / "available in 5d 20h …". When set (and still in the future) they show
// a live countdown; if it's null or already past, 'coming-soon' falls back to
// the GA_COMING_SOON_LABEL text with no timer. Set to a later date for a
// subsequent round's reopen.
export const GA_COMING_SOON_OPENS_AT: Date | null = GLOBAL_LAUNCH_TIME

// Status labels. Coming-soon normally shows a countdown, so its label is only a
// no-date fallback; closed always shows its label.
export const GA_COMING_SOON_LABEL = 'Coming soon'
export const GA_CLOSED_LABEL = 'Reopens August'

export const TICKET_WAVES: TicketWave[] = [
  {
    id: 'eth-early-bird',
    name: 'ETH Early Bird',
    price: '$349',
    // Two windows on the same day to span global timezones:
    //   02:00 UTC → 07:30 IST / 22:00 PT (previous day) — Asia-friendly window
    //   16:00 UTC → 21:30 IST / 09:00 PT — Americas-friendly window
    openTimes: [new Date(Date.UTC(2026, 4, 20, 16, 0, 0))],
    description: 'Includes 18% GST • Limited quantity • Purchase using ETH (L1)',
    bannerBullets: ['Limited quantity', 'Purchase using ETH (L1)'],
    action: 'Get tickets',
    actionHref: '/tickets/store',
    quotaId: 8,
  },
  {
    // General Admission — the standard sale wave. Distinct from
    // ETH Early Bird (the crypto early-bird phase above) and Final Waves
    // (the later, higher-priced phase below). Dual-priced: $499 ETH /
    // $999 fiat matches the Figma design. Opens after ETH Early Bird
    // closes; the action stays visible as "Get tickets" so buyers can
    // land on the storefront and see availability even before this
    // wave technically opens (the store page handles the actual gating).
    id: 'wave-ga',
    name: 'General Admission',
    price: '$499',
    ethPrice: '$499',
    fiatPrice: '$999',
    // Global ticket launch — 14 July 2026, 16:00 UTC. Drives the entire
    // before/during split on /tickets: the top banner flips from the
    // "GLOBAL TICKET LAUNCH 14 JULY" countdown to the "General Admission
    // tickets on sale!" card, the GA table row goes live, and the bottom
    // comparison table switches to OPEN + "Get tickets". Simulate the
    // launched view at /tickets?mockNow=launch (or any mockNow past this
    // time). Adjust the hour here if the announced opening time changes.
    openTimes: [GLOBAL_LAUNCH_TIME],
    description: 'Limited quantity • $499 via ETH • $999 via Fiat',
    bannerBullets: ['Limited quantity', '$499 via ETH • $999 via Fiat'],
    action: 'Get tickets',
    actionHref: '/tickets/store',
    // No `quotaId` yet — the operator can set it once the corresponding
    // Pretix quota is created. Without it the wave is schedule-only: it
    // reads as live from its openTime until a later wave activates (see
    // `classify` in hooks/useWaveStates).
  },
  {
    id: 'final-waves',
    name: 'Final Waves',
    // The last, highest-priced release — not cheaper than anything after it.
    description: 'Limited quantity • Final release',
    bannerBullets: ['Limited quantity', 'Final release'],
    // Dual-priced per the latest Figma. Legacy `price` mirrors ethPrice
    // for any consumer that hasn't migrated to the two-field shape.
    price: '$599',
    ethPrice: '$599',
    fiatPrice: '$1199',
    // Figma shows this row as "Date TBA" in the status column until the
    // opening window is announced. Displayed when the wave has no
    // openTimes and no live status.
    openLabel: 'Date TBA',
    // Rendered de-emphasized (muted purple name + ETH price, no strikethrough)
    // per Figma — signals a future/TBA tier distinct from the active waves.
    dimmed: true,
    quotaId: 1,
    // openTimes: [new Date(Date.UTC(2026, 5, 16, 2, 0, 0)), new Date(Date.UTC(2026, 5, 16, 16, 0, 0))],
  },
  // {
  //   id: 'wave-2',
  //   name: 'Subsequent waves',
  //   price: 'More than $699',
  //   openLabel: 'Opens in July',
  //   // openTimes: [new Date(Date.UTC(2026, 6, 20, 2, 0, 0))],
  // },
]

// Flat list of every opening time across all waves — used by the countdown
// hooks to determine the next upcoming wave globally.
export const TICKET_WAVE_TIMES: Date[] = TICKET_WAVES.flatMap(w => w.openTimes ?? [])
