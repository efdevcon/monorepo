import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
// AnonAadhaar disabled — keeping code for now
// import { AnonAadhaarProvider } from '@anon-aadhaar/react'
// import { VerificationModal } from 'components/domain/tickets/VerificationModal'
import { SelfVerificationModal } from 'components/domain/tickets/SelfVerificationModal'
import { RedeemVoucherModal } from 'components/domain/tickets/RedeemVoucherModal'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Minus,
  Plus,
  Ticket,
  Coffee,
  Ribbon,
  TicketPercent,
  Loader2,
} from 'lucide-react'
import css from './store.module.scss'

// Strip trailing .00 from round prices (e.g. "99.00" → "99", "99.50" → "99.50")
const fmtPrice = (p: string) => p.replace(/\.00$/, '')
import { EthGlyphTile, FiatGlyphTile } from 'components/domain/tickets/TicketTable'

/*
 * Price displays per the store Figma (node 4650:6814):
 *   – ETH-payable price → green chip (harit/100) with the ETH tile
 *   – fiat price        → dark $ tile + muted bold price, no chip bg
 *   – same price via either method → both tiles side by side + one price
 */
const EthPriceChip = ({ price }: { price: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded bg-[#d5f4dd] px-1.5 py-1">
    <EthGlyphTile size={20} />
    <span className="text-[18px] font-bold leading-none tracking-[-0.5px] text-[#221144]">{price}</span>
  </span>
)

const FiatPriceTag = ({ price }: { price: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <FiatGlyphTile size={20} />
    <span className="text-[18px] font-bold leading-none tracking-[-0.5px] text-[#594d73]">{price}</span>
  </span>
)

const CombinedPriceTag = ({ price }: { price: string }) => (
  <span className="inline-flex items-center gap-2">
    <span className="inline-flex items-center gap-1">
      <EthGlyphTile size={20} />
      <FiatGlyphTile size={20} />
    </span>
    <span className="text-[18px] font-bold leading-none tracking-[-0.5px] text-[#221144]">{price}</span>
  </span>
)

// Renders the right chip combination for a card's pricing shape. The green
// chip only appears when BOTH payment methods exist (it highlights the
// cheaper ETH option); ETH-only tickets render the bare tile + price.
const CardPrice = ({ eth, fiat, combined }: { eth?: string; fiat?: string; combined?: string }) => (
  <span className="inline-flex items-center gap-4">
    {combined ? (
      <CombinedPriceTag price={combined} />
    ) : eth && !fiat ? (
      <span className="inline-flex items-center gap-2">
        <EthGlyphTile size={20} />
        <span className="text-[18px] font-bold leading-none tracking-[-0.5px] text-[#221144]">{eth}</span>
      </span>
    ) : (
      <>
        {eth && <EthPriceChip price={eth} />}
        {fiat && <FiatPriceTag price={fiat} />}
      </>
    )}
  </span>
)
import { TicketInfo } from 'types/pretix'
import StoreSidebarLogo from 'assets/images/dc-8/dc8-logo.png'
import StoreCountdownBanner from 'assets/images/pages/countdown-banner.png'
import SelfLogo from 'assets/images/dc-8/self-logo.svg'
import { TICKETING, pretixEventUrl, discountSoldOut } from 'config/ticketing'
import { GA_CLOSED_LABEL } from 'config/waves'
import { useIsLaunched, useGaSaleState } from 'hooks/useWaveStates'
import { addItemsToPretixCartAndRedirect } from 'services/pretixCart'
import { VerifyDiscountModal } from 'components/domain/tickets/VerifyDiscountModal'
import { WagmiProvider, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiAdapter } from 'context/appkit-config'

const EVENT_DATE = new Date('2026-11-03T00:00:00Z')

// Single React Query client for the wallet (wagmi) provider that powers the
// "Connect wallet" discount modal.
const queryClient = new QueryClient()

interface CartItem {
  ticketId: number
  name: string
  price: string
  quantity: number
}

// Pricing shape shared by store cards: `combined` = one price payable via
// either ETH or fiat (both tiles, single figure); otherwise `eth`/`fiat`
// render as separate chip + tag; `free` renders plain bold "FREE".
type CardPricing = {
  eth?: string
  fiat?: string
  combined?: string
  free?: boolean
}

// Static self-claim discounts shown in the Community section that have no
// backend verification flow yet. Their buttons are active no-ops until the
// corresponding flow ships. Order matches the store Figma: Ethereum Public
// Goods, Past POAP Holders, then Core Devs.
type CommunityPlaceholder = CardPricing & {
  // Discount `type` from /api/discounts/validate; also the key into the config
  // `soldOut` override and Pretix item map.
  type: string
  title: string
  meta: string
  description: React.ReactNode
  buttonLabel: string
}

const COMMUNITY_PLACEHOLDERS: CommunityPlaceholder[] = [
  {
    type: 'pg-projects',
    title: 'Ethereum Public Goods',
    meta: 'Active fundraisers',
    description: 'This discount is reserved for those who are fundraising for Public Goods projects.',
    eth: '$349',
    buttonLabel: 'Verify',
  },
  {
    type: 'past-attendees',
    title: 'Past POAP Holders',
    meta: 'Devcon/nect POAPs',
    description: 'This ticket is reserved for those who collected a POAP at any past Devcon/nect event.',
    eth: '$449',
    buttonLabel: 'Verify',
  },
  {
    type: 'core-devs',
    title: 'Core Devs',
    meta: 'Merge Pass or Protocol Guild',
    description:
      'This discount is reserved for Ethereum core developers; those with a Merge Pass, or Protocol Guild membership.',
    free: true,
    buttonLabel: 'Verify',
  },
]

// Curated, application-based tickets shown in the Applications section.
const APPLICATION_TICKETS: Array<
  CardPricing & { type: string; title: string; meta: string; description: string; href: string }
> = [
  {
    type: 'indian-student',
    title: 'Indian Student 🇮🇳',
    meta: 'ID required at check-in',
    description:
      'A limited amount of discounted tickets will be distributed this year to students from all over India who are looking to explore Ethereum.',
    combined: '$25',
    href: '/form/student-application',
  },
  {
    type: 'international-student',
    title: 'International Student 🌎',
    meta: 'ID required at check-in',
    description:
      'A limited amount of tickets will be distributed this year to students from around the world who wish to learn more about Ethereum.',
    eth: '$49',
    fiat: '$99',
    href: '/form/student-application',
  },
  {
    type: 'builder',
    title: 'Sanctuary Tech Builders',
    meta: 'Contribution-based',
    description:
      'For developers, designers and everyone building the open, privacy-preserving, decentralized technologies that keeps the internet free and self-sovereign.',
    eth: '$349',
    fiat: '$499',
    href: '/form/builder-application',
  },
  {
    type: 'youth',
    title: 'Youth Ticket (3-17) 🌱',
    meta: 'Consent form submission & ID required at check-in',
    description: "Whether you're a younger attendee, or bringing your child.",
    combined: '$19',
    href: '/form/youth-ticket',
  },
]

function useCountdown() {
  const [diff, setDiff] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const d = EVENT_DATE.getTime() - now.getTime()
      if (d <= 0) {
        setDiff({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setDiff({
        days: Math.floor(d / (1000 * 60 * 60 * 24)),
        hours: Math.floor((d % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((d % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((d % (1000 * 60)) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return diff
}

type StoreContentProps = {
  selfVerificationOpen: boolean
  setSelfVerificationOpen: React.Dispatch<React.SetStateAction<boolean>>
  useSelfStaging: boolean
  setUseSelfStaging: (value: boolean) => void
  initialTickets: TicketInfo[]
}

function StoreContent({
  selfVerificationOpen,
  setSelfVerificationOpen,
  useSelfStaging,
  setUseSelfStaging,
  initialTickets,
}: StoreContentProps) {
  const countdown = useCountdown()
  // Global ticket launch gate (config/waves.ts GLOBAL_LAUNCH_TIME). Before
  // the launch, GA checkout and the Community self-claim flows show an
  // "Opens July" label instead of their buttons — same before/during split
  // as the /tickets landing page. Student applications stay open; the
  // Sanctuary Tech Builders application opens at launch. Preview the
  // launched view with ?mockNow=launch.
  const { launched } = useIsLaunched()
  // General Admission sale state (config/waves GA_SALE_STATE, overridable via
  // ?mockNow=coming-soon|closed). GA is only purchasable when 'open'; the
  // paused states close the buy controls: 'coming-soon' → "Opens July",
  // 'closed' → GA_CLOSED_LABEL ("Reopens Aug").
  const gaSaleState = useGaSaleState()
  const gaClosed = gaSaleState === 'closed'
  const gaOpen = gaSaleState === 'open'

  const [tickets, setTickets] = useState<TicketInfo[]>(initialTickets)
  // False until the client catalog fetch resolves. The page no longer has
  // getStaticProps, so `tickets` starts empty; without this flag the GA card
  // would briefly render "Sold out" (no admission ticket yet) before the fetch
  // lands. Seeded true if SSR ever provides initial tickets.
  const [ticketsLoaded, setTicketsLoaded] = useState(initialTickets.length > 0)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [earlyAccess, setEarlyAccess] = useState<string | null>(null)
  const [earlyAccessEmail, setEarlyAccessEmail] = useState<string | null>(null)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [verifyDiscountOpen, setVerifyDiscountOpen] = useState(false)

  // "Parked": the x402 catalog is off (sales run through Pretix's hosted shop),
  // so `/api/x402/tickets/` returns no tickets. In that mode we source the GA
  // item + a fresh quota check straight from Pretix (`/api/tickets/ga-availability/`)
  // so the store still shows the cart selector and a genuine sold-out. null = loading.
  const parked = !TICKETING.pretix.x402ApiEnabled
  const [gaInfo, setGaInfo] = useState<{ available: boolean; ticket: TicketInfo | null } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('early-access')
    if (code) {
      setEarlyAccess(code)
    }
    const emailParam = params.get('email')
    if (emailParam) {
      setEarlyAccessEmail(emailParam)
    }
  }, [])

  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await fetch('/api/x402/tickets/')
        const data = await res.json()
        if (data.success) {
          // `tickets` and `paymentInfo` are absent when the x402 catalog API
          // is disabled (TICKETING.pretix.x402ApiEnabled=false) — the
          // endpoint returns only `pluginSettings` then. Default to empty /
          // null so this page renders the empty-state instead of crashing.
          const rawTickets = data.data.tickets || []
          const tix = TICKETING.overrides.soldOut
            ? rawTickets.map((t: TicketInfo) => ({ ...t, available: false, availableCount: 0 }))
            : rawTickets
          setTickets(tix)
        } else {
          setError(data.error || 'Failed to load tickets')
        }
      } catch {
        setError('Failed to load tickets')
      } finally {
        setTicketsLoaded(true)
      }
    }
    fetchTickets()
  }, [])

  // Parked state: pull GA item + real availability from Pretix directly (not the
  // disabled x402 catalog) so the cart selector and sold-out reflect reality.
  useEffect(() => {
    if (!parked) return
    let cancelled = false
    fetch('/api/tickets/ga-availability/')
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setGaInfo({ available: d?.available !== false, ticket: d?.ticket ?? null })
      })
      .catch(() => {
        if (!cancelled) setGaInfo({ available: true, ticket: null }) // fail open
      })
    return () => {
      cancelled = true
    }
  }, [parked])

  // Minimum quantity a buyer can select for a ticket once it's in the cart —
  // the store seeds the cart with one ticket and never lets it drop below this.
  const MIN_QTY = 1

  // Clamp a desired quantity to [MIN_QTY, maxPerOrder]. `maxPerOrder` is the
  // ticket's Pretix per-order cap; no upper bound when the item has no cap.
  const clampQuantity = (ticket: TicketInfo, qty: number) =>
    Math.max(MIN_QTY, ticket.maxPerOrder != null ? Math.min(qty, ticket.maxPerOrder) : qty)

  const updateCartQuantity = (ticket: TicketInfo, delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.ticketId === ticket.id)
      if (existing) {
        const newQty = clampQuantity(ticket, existing.quantity + delta)
        return prev.map(c => (c.ticketId === ticket.id ? { ...c, quantity: newQty } : c))
      }
      return [
        ...prev,
        { ticketId: ticket.id, name: ticket.name, price: ticket.price, quantity: clampQuantity(ticket, delta) },
      ]
    })
  }

  const setCartQuantity = (ticket: TicketInfo, qty: number) => {
    const newQty = clampQuantity(ticket, qty)
    setCart(prev => {
      const existing = prev.find(c => c.ticketId === ticket.id)
      if (existing) {
        return prev.map(c => (c.ticketId === ticket.id ? { ...c, quantity: newQty } : c))
      }
      return [...prev, { ticketId: ticket.id, name: ticket.name, price: ticket.price, quantity: newQty }]
    })
  }

  const getQuantity = (ticketId: number) => cart.find(c => c.ticketId === ticketId)?.quantity || 0

  // Hand the buyer off to the Pretix shop with the selected tickets already in
  // their cart (the purchase happens on Pretix, not our custom checkout page).
  const goToPretixCheckout = () => {
    if (checkoutLoading) return
    const items = cart.filter(c => c.quantity > 0).map(c => ({ id: c.ticketId, quantity: c.quantity }))
    if (items.length === 0) return
    setCheckoutLoading(true)
    try {
      addItemsToPretixCartAndRedirect(items)
    } catch (err) {
      // CORS block / network failure (e.g. the event's allowed widget domains
      // don't include this origin). Fall back to the plain Pretix shop so the
      // buyer can still purchase — just without the pre-filled cart.
      console.error('Pretix cart handoff failed, falling back to shop:', err)
      window.location.href = pretixEventUrl('/')
    }
  }

  const forceSoldOut = TICKETING.overrides.soldOut
  const requireEarlyAccess = TICKETING.self.requireEarlyAccess
  const admissionTickets = tickets.filter(t => t.isAdmission && (forceSoldOut || t.available) && !t.requireVoucher)

  // General Admission card — driven by the admission item pinned in ticketing
  // config (`gaItemId`), falling back to the first available admission item
  // when unset or not currently purchasable. Figma reference price applies
  // when no admission ticket exists at all.
  const catalogGaTicket = admissionTickets.find(t => t.id === TICKETING.pretix.gaItemId) ?? admissionTickets[0]
  // In parked mode the x402 catalog is empty, so drive GA from the Pretix-direct
  // info; otherwise use the x402 catalog ticket as before.
  const gaTicket = parked ? gaInfo?.ticket ?? undefined : catalogGaTicket
  const gaPrice = gaTicket ? fmtPrice(gaTicket.price) : '499'
  const gaOriginal =
    gaTicket?.originalPrice && gaTicket.originalPrice !== gaTicket.price ? fmtPrice(gaTicket.originalPrice) : '999'
  const gaQty = gaTicket ? getQuantity(gaTicket.id) : 0

  // GA card state, unified across parked (Pretix-direct) and non-parked (x402
  // catalog) modes. A manual force-sold-out (the `overrides.soldOut` config
  // switch or a per-type discount sold-out) wins in BOTH modes and short-circuits
  // the availability fetch; otherwise parked mode uses the REAL Pretix quota.
  const gaForcedSoldOut = forceSoldOut || discountSoldOut('general-admission')
  const gaLoading = gaForcedSoldOut ? false : parked ? gaInfo === null : !ticketsLoaded
  const gaSoldOut =
    gaForcedSoldOut || (parked ? gaInfo !== null && (!gaInfo.available || !gaTicket) : !gaTicket)

  // Seed the cart with one GA ticket on first load so the buyer starts with a
  // valid selection (quantity can't drop below MIN_QTY). Runs once, after the
  // GA ticket resolves from SSR props or the client catalog fetch.
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current || !gaTicket || forceSoldOut) return
    seededRef.current = true
    setCart(prev =>
      prev.length > 0
        ? prev
        : [{ ticketId: gaTicket.id, name: gaTicket.name, price: gaTicket.price, quantity: MIN_QTY }]
    )
  }, [gaTicket, forceSoldOut])

  return (
    <>
      <div className={css['store-layout']}>
        <aside className={css['sidebar']}>
          <Link to="/tickets" className={css['sidebar-back']}>
            <ArrowLeft size={20} />
            Back to Tickets
          </Link>
          <div className={css['sidebar-content']}>
            <div className={css['sidebar-top']}>
              <div className={css['sidebar-logo']}>
                <Image src={StoreSidebarLogo} alt="Devcon India" height={56} width={127} />
              </div>
              <h2 className={css['sidebar-title']}>Ticket Store</h2>
              <p className={css['sidebar-description']}>
                Secure your place at Devcon India, where the people behind decentralized systems come together to learn,
                build, and connect.
              </p>
              <div className={css['sidebar-includes']}>
                <p className={css['sidebar-includes-label']}>Included in ticket:</p>
                <ul className={css['sidebar-includes-list']}>
                  <li className={css['sidebar-includes-item']}>
                    <Ticket size={20} strokeWidth={1.5} aria-hidden="true" />
                    Full conference access
                  </li>
                  <li className={css['sidebar-includes-item']}>
                    <Coffee size={20} strokeWidth={1.5} aria-hidden="true" />
                    Catering all week
                  </li>
                  <li className={css['sidebar-includes-item']}>
                    <Ribbon size={20} strokeWidth={1.5} aria-hidden="true" />
                    Event swag bag
                  </li>
                </ul>
              </div>
            </div>
            <ul className={css['sidebar-details']}>
              <li className={css['sidebar-details-item']}>
                <CalendarDays size={20} color="#1a0d33" strokeWidth={1.5} aria-hidden="true" />
                3–6 November 2026
              </li>
              <li className={css['sidebar-details-item']}>
                <MapPin size={20} color="#1a0d33" strokeWidth={1.5} aria-hidden="true" />
                Jio World Centre, Mumbai, India
              </li>
            </ul>
          </div>
        </aside>

        <div className={css['content-wrapper']}>
          <div className={css['content']}>
            <div className={css['countdown-banner']}>
              <Image
                src={StoreCountdownBanner}
                alt=""
                fill
                priority
                className={css['countdown-banner-bg']}
                sizes="(max-width: 1024px) 100vw, 1400px"
              />
              <div className={css['countdown-grid']}>
                <div className={css['countdown-item']}>
                  <span className={css['countdown-value']}>{countdown.days}</span>
                  <span className={css['countdown-label']}>Days</span>
                </div>
                <div className={css['countdown-item']}>
                  <span className={css['countdown-value']}>{String(countdown.hours).padStart(2, '0')}</span>
                  <span className={css['countdown-label']}>Hours</span>
                </div>
                <div className={css['countdown-item']}>
                  <span className={css['countdown-value']}>{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className={css['countdown-label']}>Minutes</span>
                </div>
                <div className={css['countdown-item']}>
                  <span className={css['countdown-value']}>{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className={css['countdown-label']}>Seconds</span>
                </div>
              </div>
            </div>

            {/* ─── Sale Waves ─── */}
            <section className={css['section']} id="general-admission">
              <div className={css['section-header']}>
                <div className={css['section-title-row']}>
                  <h3 className={css['section-title']}>Sale Waves</h3>
                  {gaClosed ? (
                    <span className={css['opens-badge']}>{GA_CLOSED_LABEL}</span>
                  ) : gaOpen && launched ? (
                    <span className={css['open-badge']}>OPEN</span>
                  ) : (
                    <span className={css['opens-badge']}>Opens July</span>
                  )}
                </div>
                <p className={css['section-subtitle']}>Secure tickets early to access the lowest prices.</p>
              </div>

              {error && <p style={{ color: '#c00', marginBottom: '1rem' }}>{error}</p>}

              <div className={css['card']}>
                <div className={css['card-stacked']}>
                  <div className={css['card-details']}>
                    <h3 className={css['discount-card-title']}>General Admission 🎟️</h3>
                    <p className={css['discount-card-meta']}>Anon-friendly</p>
                    <p className={css['discount-card-desc']}>
                      The original, anon-friendly Devcon ticket. Includes full conference access, swag bag, and catering
                      all week.
                    </p>
                  </div>
                  <div className={css['card-footer']}>
                    {/* Per Figma: ETH-payable price in the green chip, fiat
                        price alongside — two payment options, not a discount
                        strikethrough. */}
                    <CardPrice eth={`$${gaPrice}`} fiat={gaOriginal !== gaPrice ? `$${gaOriginal}` : undefined} />
                    {gaClosed ? (
                      <span className={css['sold-out-badge']}>{GA_CLOSED_LABEL}</span>
                    ) : !gaOpen || !launched ? (
                      <span className={css['opens-label']}>Opens July</span>
                    ) : gaLoading ? (
                      <Loader2 className={css['ga-loading']} size={24} aria-label="Loading availability" />
                    ) : gaSoldOut || !gaTicket ? (
                      <span className={css['sold-out-badge']}>Sold out</span>
                    ) : (
                      <div className={css['ga-actions']}>
                        <div className={css['quantity']}>
                          <button
                            type="button"
                            className={css['quantity-btn']}
                            onClick={() => updateCartQuantity(gaTicket, -1)}
                            disabled={gaQty <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={16} />
                          </button>
                          <Input
                            type="number"
                            className="w-11 h-9 border-x border-y-0 rounded-none text-center p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            value={gaQty}
                            min={1}
                            max={gaTicket.maxPerOrder ?? undefined}
                            onChange={e => setCartQuantity(gaTicket, parseInt(e.target.value, 10) || 0)}
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            className={css['quantity-btn']}
                            onClick={() => updateCartQuantity(gaTicket, 1)}
                            disabled={gaTicket.maxPerOrder != null && gaQty >= gaTicket.maxPerOrder}
                            aria-label="Increase quantity"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className={css['checkout-pill']}
                          onClick={goToPretixCheckout}
                          disabled={checkoutLoading}
                        >
                          {checkoutLoading ? 'Loading…' : 'Checkout'}
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className={css['gst-note']}>Prices include 18% GST</p>
            </section>

            {/* ─── Community (self-claim discounts) ─── */}
            <section className={css['section']} id="community">
              <div className={css['section-header']}>
                <div className={css['section-title-row']}>
                  <h3 className={css['section-title']}>Community</h3>
                  {launched ? (
                    <span className={css['open-badge']}>OPEN</span>
                  ) : (
                    <span className={css['opens-badge']}>Opens July</span>
                  )}
                </div>
                <p className={css['section-subtitle']}>
                  Self-claim discounts — no application required. Tickets are non-transferable and limited.
                </p>
              </div>

              <div className={css['applications-grid']}>
                <div className={css['application-card']}>
                  <div className={css['application-card-body']}>
                    <h3 className={css['application-card-title']}>India Early Bird 🇮🇳</h3>
                    <p className={css['application-card-meta']}>ID required at check-in</p>
                    <p className={css['application-card-description']}>
                      Accessible via the vouchers we distributed during ETH Mumbai in March. Got a voucher? Redeem yours
                      now!
                    </p>
                  </div>
                  <div className={css['application-card-footer']}>
                    <CardPrice combined="$99" />
                    {!launched ? (
                      <span className={css['opens-label']}>Opens July</span>
                    ) : (
                      <button type="button" className={css['apply-btn']} onClick={() => setRedeemOpen(true)}>
                        <TicketPercent size={16} strokeWidth={2} />
                        Redeem voucher
                      </button>
                    )}
                  </div>
                </div>

                <div className={css['application-card']}>
                  <div className={css['application-card-body']}>
                    <h3 className={css['application-card-title']}>India Resident 🇮🇳</h3>
                    <p className={css['application-card-meta']}>ID required at check-in</p>
                    <p className={css['application-card-description']}>
                      Indian residents can apply using Self.xyz. Use your Aadhaar Card &amp; Zero-Knowledge Proofs to
                      prove Indian residency.
                    </p>
                  </div>
                  <div className={css['application-card-footer']}>
                    <CardPrice combined="$149" />
                    {!launched ? (
                      <span className={css['opens-label']}>Opens July</span>
                    ) : discountSoldOut('india-resident') ? (
                      <span className={css['sold-out-badge']}>Sold out</span>
                    ) : (
                      <button
                        type="button"
                        className={css['verify-self-btn']}
                        onClick={() => setSelfVerificationOpen(true)}
                      >
                        <SelfLogo className={css['self-logo']} aria-hidden="true" />
                        Verify via Self
                      </button>
                    )}
                  </div>
                </div>

                {COMMUNITY_PLACEHOLDERS.map(card => {
                  const cardSoldOut = discountSoldOut(card.type)
                  return (
                    <div key={card.title} className={css['application-card']}>
                      <div className={css['application-card-body']}>
                        <h3 className={css['application-card-title']}>{card.title}</h3>
                        <p className={css['application-card-meta']}>{card.meta}</p>
                        <p className={css['application-card-description']}>{card.description}</p>
                      </div>
                      <div className={css['application-card-footer']}>
                        {card.free ? (
                          <span className={css['application-price']}>FREE</span>
                        ) : (
                          <CardPrice eth={card.eth} fiat={card.fiat} combined={card.combined} />
                        )}
                        {!launched ? (
                          <span className={css['opens-label']}>Opens July</span>
                        ) : cardSoldOut ? (
                          <span className={css['sold-out-badge']}>Sold out</span>
                        ) : (
                          <button
                            type="button"
                            className={css['apply-btn']}
                            onClick={() => setVerifyDiscountOpen(true)}
                          >
                            {card.buttonLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Voucher redemption also opens at launch — no entry point before. */}
              {launched && (
                <div className={css['voucher-banner']}>
                  <button type="button" className={css['voucher-banner-link']} onClick={() => setRedeemOpen(true)}>
                    <span className={css['voucher-banner-prompt']}>Got a voucher?</span> Redeem it here
                  </button>
                </div>
              )}

              <p className={css['gst-note']}>Prices include 18% GST</p>
            </section>

            {/* ─── Applications (curated) ─── */}
            <section className={css['section']} id="applications">
              <div className={css['section-header']}>
                <div className={css['section-title-row']}>
                  <h3 className={css['section-title']}>Applications</h3>
                  <span className={css['open-badge']}>OPEN</span>
                </div>
                <p className={css['section-subtitle']}>
                  Applications are curated and limited per round, subject to availability and review.
                </p>
              </div>

              <div className={css['applications-grid']}>
                {APPLICATION_TICKETS.map(card => (
                  <div key={card.title} className={css['application-card']}>
                    <div className={css['application-card-body']}>
                      <h3 className={css['application-card-title']}>{card.title}</h3>
                      <p className={css['application-card-meta']}>{card.meta}</p>
                      <p className={css['application-card-description']}>{card.description}</p>
                    </div>
                    <div className={css['application-card-footer']}>
                      <CardPrice eth={card.eth} fiat={card.fiat} combined={card.combined} />
                      {/* Sanctuary Tech Builders applications open at the
                          global launch; student applications are already
                          open (same split as the /tickets landing page). */}
                      {!launched && card.type === 'builder' ? (
                        <span className={css['opens-label']}>Opens July</span>
                      ) : discountSoldOut(card.type) ? (
                        <span className={css['sold-out-badge']}>Sold out</span>
                      ) : (
                        <Link to={card.href} className={css['apply-btn']}>
                          Apply now
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className={css['gst-note']}>Prices include 18% GST</p>
            </section>
          </div>
        </div>
      </div>

      <SelfVerificationModal
        isOpen={selfVerificationOpen}
        onClose={() => setSelfVerificationOpen(false)}
        useStaging={useSelfStaging}
        setUseStaging={setUseSelfStaging}
        earlyAccess={requireEarlyAccess ? earlyAccess ?? undefined : undefined}
        email={earlyAccessEmail ?? undefined}
      />

      <RedeemVoucherModal isOpen={redeemOpen} onClose={() => setRedeemOpen(false)} />

      <VerifyDiscountModal isOpen={verifyDiscountOpen} onClose={() => setVerifyDiscountOpen(false)} />
    </>
  )
}

export default function TicketsStorePage({ initialTickets = [] }: { initialTickets?: TicketInfo[] }) {
  const [selfVerificationOpen, setSelfVerificationOpen] = useState(false)
  const [useSelfStaging, setUseSelfStaging] = useState(TICKETING.self.staging)

  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
        <QueryClientProvider client={queryClient}>
          <StoreContent
            selfVerificationOpen={selfVerificationOpen}
            setSelfVerificationOpen={setSelfVerificationOpen}
            useSelfStaging={useSelfStaging}
            setUseSelfStaging={setUseSelfStaging}
            initialTickets={initialTickets}
          />
        </QueryClientProvider>
      </WagmiProvider>
    </Page>
  )
}

// NOTE: this page intentionally has NO getStaticProps/getServerSideProps. The
// store imports the web3 stack (appkit-config -> wagmi -> viem) plus the Self
// SDK; running a data method forces that whole module graph to execute in the
// Netlify runtime function, which opens thousands of viem `_esm` files per
// request and exhausts the Lambda's file-descriptor limit (EMFILE). Keeping the
// page statically served means that graph only runs client-side. Tickets are
// fetched client-side via `/api/x402/tickets/` in StoreContent. (Same fix
// previously applied to the order/checkout pages.)
