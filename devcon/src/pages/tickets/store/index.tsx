import React, { useState, useEffect } from 'react'
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
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Minus,
  Plus,
  Ticket,
  Coffee,
  Shirt,
  TicketPercent,
} from 'lucide-react'
import css from './store.module.scss'

// Strip trailing .00 from round prices (e.g. "99.00" → "99", "99.50" → "99.50")
const fmtPrice = (p: string) => p.replace(/\.00$/, '')
import { TicketInfo } from 'types/pretix'
import StoreSidebarLogo from 'assets/images/dc-8/dc8-logo.png'
import StoreCountdownBanner from 'assets/images/pages/countdown-banner.png'
import SelfLogo from 'assets/images/dc-8/self-logo.svg'
import { TICKETING, pretixEventUrl } from 'config/ticketing'
import { getTicketPurchaseInfo } from 'services/pretix'
import { addItemsToPretixCartAndRedirect } from 'services/pretixCart'

const EVENT_DATE = new Date('2026-11-03T00:00:00Z')

interface CartItem {
  ticketId: number
  name: string
  price: string
  quantity: number
}

// Static self-claim discounts shown in the Community section that have no
// backend verification flow yet. Their buttons are active no-ops until the
// corresponding flow ships.
type CommunityPlaceholder = {
  title: string
  meta: string
  description: React.ReactNode
  price: string
  buttonLabel: string
}

const COMMUNITY_PLACEHOLDERS: CommunityPlaceholder[] = [
  {
    title: 'Core Devs / Protocol Guild',
    meta: 'Merge Pass or Protocol Guild',
    description:
      'This discount is reserved for Ethereum core developers; those with a Merge Pass, or Protocol Guild membership.',
    price: 'FREE',
    buttonLabel: 'Verify',
  },
  {
    title: 'OSS Contributors',
    meta: 'Contribution-based',
    description: (
      <>
        This discounted ticket is reserved for those who have made at least 2 contributions (since Devcon SEA) to any
        repo under the <em>efdevcon</em> or <em>ethereum</em> organizations, or any execution/consensus clients.
      </>
    ),
    price: '50% off',
    buttonLabel: 'Verify',
  },
  {
    title: 'Public Good Projects',
    meta: 'Active fundraisers',
    description: 'This discount is reserved for those who have fundraised for Public Goods projects.',
    price: '50% off',
    buttonLabel: 'Connect wallet',
  },
  {
    title: 'Past POAP Holders',
    meta: 'Devcon/nect POAPs',
    description: 'This ticket is reserved for those who collected a POAP at any past Devcon/nect event.',
    price: '10% off',
    buttonLabel: 'Connect wallet',
  },
]

// Curated, application-based tickets shown in the Applications section.
const APPLICATION_TICKETS = [
  {
    title: 'Indian Student 🇮🇳',
    meta: 'Student ID required at check-in',
    description:
      'A limited amount of discounted tickets will be distributed this year to students from all over India who are looking to explore Ethereum.',
    price: '$25',
    originalPrice: null,
    href: '/form/student-application',
  },
  {
    title: 'International Student 🌎',
    meta: 'Student ID required at check-in',
    description:
      'A limited amount of tickets will be distributed this year to students from around the world who wish to learn more about Ethereum.',
    price: '$99',
    originalPrice: null,
    href: '/form/student-application',
  },
  {
    title: 'Builder Discount 🦄',
    meta: 'ID required at Registration',
    description:
      'For builders of all kinds who actively volunteer or contribute their time to the growth, research and development of Ethereum or the ecosystem.',
    price: '$349',
    originalPrice: '$699',
    href: '/form/builder-application',
  },
] as const

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

  const [tickets, setTickets] = useState<TicketInfo[]>(initialTickets)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [earlyAccess, setEarlyAccess] = useState<string | null>(null)
  const [earlyAccessEmail, setEarlyAccessEmail] = useState<string | null>(null)
  const [redeemOpen, setRedeemOpen] = useState(false)

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
      }
    }
    fetchTickets()
  }, [])

  const updateCartQuantity = (ticket: TicketInfo, delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.ticketId === ticket.id)
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta)
        if (newQty === 0) return prev.filter(c => c.ticketId !== ticket.id)
        return prev.map(c => (c.ticketId === ticket.id ? { ...c, quantity: newQty } : c))
      }
      if (delta > 0) {
        return [...prev, { ticketId: ticket.id, name: ticket.name, price: ticket.price, quantity: delta }]
      }
      return prev
    })
  }

  const setCartQuantity = (ticket: TicketInfo, qty: number) => {
    const newQty = Math.max(0, qty)
    setCart(prev => {
      const existing = prev.find(c => c.ticketId === ticket.id)
      if (newQty === 0) return prev.filter(c => c.ticketId !== ticket.id)
      if (existing) {
        return prev.map(c => (c.ticketId === ticket.id ? { ...c, quantity: newQty } : c))
      }
      return [...prev, { ticketId: ticket.id, name: ticket.name, price: ticket.price, quantity: newQty }]
    })
  }

  const getQuantity = (ticketId: number) => cart.find(c => c.ticketId === ticketId)?.quantity || 0

  const totalQty = cart.reduce((sum, c) => sum + c.quantity, 0)
  const totalCents = cart.reduce((sum, c) => sum + Math.round(parseFloat(c.price) * 100) * c.quantity, 0)

  const selectionText =
    totalQty === 0
      ? 'No tickets selected'
      : cart
          .filter(c => c.quantity > 0)
          .map(c => `${c.quantity} x ${c.name}`)
          .join(', ')

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

  // General Admission card — driven by the Pretix admission ticket where it
  // exists, falling back to the Figma reference price otherwise.
  const gaTicket = admissionTickets[0]
  const gaPrice = gaTicket ? fmtPrice(gaTicket.price) : '699'
  const gaOriginal =
    gaTicket?.originalPrice && gaTicket.originalPrice !== gaTicket.price ? fmtPrice(gaTicket.originalPrice) : '999'
  const gaQty = gaTicket ? getQuantity(gaTicket.id) : 0

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
                Secure your participation in Devcon India and join thousands of builders, creators, researchers,
                designers, and thinkers at the world&apos;s biggest Ethereum conference.
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
                    <Shirt size={20} strokeWidth={1.5} aria-hidden="true" />
                    Event swag bag
                  </li>
                </ul>
              </div>
            </div>
            <ul className={css['sidebar-details']}>
              <li className={css['sidebar-details-item']}>
                <CalendarDays size={24} color="#1a0d33" strokeWidth={1.5} aria-hidden="true" />
                3–6 November 2026
              </li>
              <li className={css['sidebar-details-item']}>
                <MapPin size={24} color="#1a0d33" strokeWidth={1.5} aria-hidden="true" />
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
                  <h3 className={css['section-title']}>General Admission</h3>
                  <span className={css['open-badge']}>OPEN</span>
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
                    <div className={css['pricing']}>
                      <span className={css['price-current']}>${gaPrice}</span>
                      {gaOriginal !== gaPrice && <span className={css['price-original']}>${gaOriginal}</span>}
                    </div>
                    {!gaTicket || forceSoldOut ? (
                      <span className={css['sold-out-badge']}>Sold out</span>
                    ) : (
                      <div className={css['ga-actions']}>
                        <div className={css['quantity']}>
                          <button
                            type="button"
                            className={css['quantity-btn']}
                            onClick={() => updateCartQuantity(gaTicket, -1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={16} />
                          </button>
                          <Input
                            type="number"
                            className="w-11 h-9 border-x border-y-0 rounded-none text-center p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            value={gaQty}
                            min={0}
                            onChange={e => setCartQuantity(gaTicket, parseInt(e.target.value, 10) || 0)}
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            className={css['quantity-btn']}
                            onClick={() => updateCartQuantity(gaTicket, 1)}
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
                          <ArrowUpRight size={16} strokeWidth={2.5} />
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
                  <span className={css['open-badge']}>OPEN</span>
                </div>
                <p className={css['section-subtitle']}>
                  Self-claim discounts — no application required. Tickets are non-transferable and limited.
                </p>
              </div>

              <div className={css['applications-grid']}>
                <div className={css['application-card']}>
                  <div className={css['application-card-body']}>
                    <h3 className={css['application-card-title']}>India Resident 🇮🇳</h3>
                    <p className={css['application-card-meta']}>ID required at Registration</p>
                    <p className={css['application-card-description']}>
                      Indian residents can apply using Self.xyz. Use your Aadhaar Card &amp; Zero-Knowledge Proofs to
                      prove Indian residency.
                    </p>
                  </div>
                  <div className={css['application-card-footer']}>
                    <div className={css['discount-price-wrap']}>
                      <span className={css['application-price']}>$149</span>
                      <span className={css['price-original']}>$349</span>
                    </div>
                    <button
                      type="button"
                      className={css['verify-self-btn']}
                      onClick={() => setSelfVerificationOpen(true)}
                    >
                      <SelfLogo className={css['self-logo']} aria-hidden="true" />
                      Verify via Self
                    </button>
                  </div>
                </div>

                <div className={css['application-card']}>
                  <div className={css['application-card-body']}>
                    <h3 className={css['application-card-title']}>India Early Bird 🇮🇳</h3>
                    <p className={css['application-card-meta']}>ID required at Registration</p>
                    <p className={css['application-card-description']}>
                      Accessible via the vouchers we distributed during ETH Mumbai in March. Got a voucher? Redeem yours
                      now!
                    </p>
                  </div>
                  <div className={css['application-card-footer']}>
                    <div className={css['discount-price-wrap']}>
                      <span className={css['application-price']}>$99</span>
                      <span className={css['price-original']}>$149</span>
                    </div>
                    <button type="button" className={css['apply-btn']} onClick={() => setRedeemOpen(true)}>
                      <TicketPercent size={16} strokeWidth={2} />
                      Redeem voucher
                    </button>
                  </div>
                </div>

                {COMMUNITY_PLACEHOLDERS.map(card => (
                  <div key={card.title} className={css['application-card']}>
                    <div className={css['application-card-body']}>
                      <h3 className={css['application-card-title']}>{card.title}</h3>
                      <p className={css['application-card-meta']}>{card.meta}</p>
                      <p className={css['application-card-description']}>{card.description}</p>
                    </div>
                    <div className={css['application-card-footer']}>
                      <span className={css['application-price']}>{card.price}</span>
                      <button type="button" className={css['apply-btn']} onClick={() => {}}>
                        {card.buttonLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={css['voucher-banner']}>
                <button type="button" className={css['voucher-banner-link']} onClick={() => setRedeemOpen(true)}>
                  <span className={css['voucher-banner-prompt']}>Got a voucher?</span> Redeem it here
                </button>
              </div>

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
                      <div className={css['discount-price-wrap']}>
                        <span className={css['application-price']}>{card.price}</span>
                        {card.originalPrice && <span className={css['price-original']}>{card.originalPrice}</span>}
                      </div>
                      <Link to={card.href} className={css['apply-btn']}>
                        Apply now
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <p className={css['gst-note']}>Prices include 18% GST</p>
            </section>
          </div>
          {totalQty > 0 && (
            <div className={css['summary-sticky']}>
              <div className={css['summary-sticky-inner']}>
                <div className={css['summary-row']}>
                  <div>
                    <p className={css['summary-label']}>Your selection</p>
                    <p className={css['summary-selection']}>{selectionText}</p>
                  </div>
                  <div>
                    <p className={css['summary-total-label']}>Total</p>
                    <p className={css['summary-total-value']}>
                      ${fmtPrice((totalCents / 100).toFixed(2))}
                      <span className={css['summary-total-currency']}> USD</span>
                    </p>
                  </div>
                </div>
                <div className={css['summary-actions']}>
                  <button
                    type="button"
                    className={css['checkout-btn']}
                    onClick={goToPretixCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? 'Loading…' : 'Checkout'}
                    <ArrowUpRight className={css['checkout-arrow']} size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          )}
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
    </>
  )
}

export default function TicketsStorePage({ initialTickets = [] }: { initialTickets?: TicketInfo[] }) {
  const [selfVerificationOpen, setSelfVerificationOpen] = useState(false)
  const [useSelfStaging, setUseSelfStaging] = useState(TICKETING.self.staging)

  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <StoreContent
        selfVerificationOpen={selfVerificationOpen}
        setSelfVerificationOpen={setSelfVerificationOpen}
        useSelfStaging={useSelfStaging}
        setUseSelfStaging={setUseSelfStaging}
        initialTickets={initialTickets}
      />
    </Page>
  )
}

// Hardcoded fallback if Pretix is unreachable at build time
const FALLBACK_TICKET: TicketInfo = {
  id: 0,
  name: 'India Early Bird (Limited Availability) 🇮🇳',
  description: null,
  price: '99.00',
  originalPrice: '149.00',
  currency: 'USD',
  available: true,
  availableCount: null,
  isAdmission: true,
  requireVoucher: true,
  variations: [],
  addons: [],
}

export async function getStaticProps() {
  let initialTickets: TicketInfo[] = []

  try {
    const data = await getTicketPurchaseInfo()
    initialTickets = TICKETING.overrides.soldOut
      ? data.tickets.map(t => ({ ...t, available: false, availableCount: 0 }))
      : data.tickets
  } catch {
    // Pretix unavailable at build time — use hardcoded fallback
    initialTickets = [FALLBACK_TICKET]
  }

  // Check Supabase voucher pool availability for voucher-required tickets
  try {
    const { hasAvailableVouchers } = await import('services/discountStore')
    const vouchersAvailable = await hasAvailableVouchers()
    initialTickets = initialTickets.map(t =>
      t.requireVoucher ? { ...t, vouchersAvailable } : t
    )
  } catch {
    // Supabase unavailable at build time — assume available
  }

  return {
    props: { initialTickets },
  }
}
