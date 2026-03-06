import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
// AnonAadhaar disabled — keeping code for now
// import { AnonAadhaarProvider } from '@anon-aadhaar/react'
// import { VerificationModal } from 'components/domain/tickets/VerificationModal'
import { SelfVerificationModal } from 'components/domain/tickets/SelfVerificationModal'
import { Input } from '@/components/ui/input'
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react'
import css from './store.module.scss'
import { TicketInfo, QuestionInfo } from 'types/pretix'
import StoreSidebarLogo from 'assets/images/dc-8/dc8-logo.png'
import StoreCountdownBanner from 'assets/images/pages/countdown-banner.png'
import SelfLogo from 'assets/images/dc-8/self-logo.svg'
import SelfLogoPng from 'assets/images/self-logo.png'
import { TICKETING } from 'config/ticketing'

const EVENT_DATE = new Date('2026-11-03T00:00:00Z')

interface CartItem {
  ticketId: number
  name: string
  price: string
  quantity: number
}

interface PaymentInfo {
  network: string
  chainId: number
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  discountForCrypto: string
}

interface CartData {
  items: CartItem[]
  paymentInfo: PaymentInfo
  savedAt: number
}

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

function VerifyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={css['verify-icon']}
    >
      <circle
        cx="10"
        cy="10"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 2"
        fill="none"
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg className={css['checkout-arrow']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}


type StoreContentProps = {
  selfVerificationOpen: boolean
  setSelfVerificationOpen: React.Dispatch<React.SetStateAction<boolean>>
  useSelfStaging: boolean
  setUseSelfStaging: (value: boolean) => void
}

function StoreContent({
  selfVerificationOpen,
  setSelfVerificationOpen,
  useSelfStaging,
  setUseSelfStaging,
}: StoreContentProps) {
  const countdown = useCountdown()

  const [tickets, setTickets] = useState<TicketInfo[]>([])
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [earlyAccess, setEarlyAccess] = useState<string | null>(null)
  const [earlyAccessValid, setEarlyAccessValid] = useState<boolean | null>(null)
  const [earlyAccessError, setEarlyAccessError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('early-access')
    if (code) {
      setEarlyAccess(code)
    }
  }, [])

  // Server-side validation of early access code
  useEffect(() => {
    if (!earlyAccess) return
    setEarlyAccessValid(null)
    setEarlyAccessError(null)
    fetch('/api/tickets/validate-early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: earlyAccess }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setEarlyAccessValid(true)
        } else {
          setEarlyAccessValid(false)
          setEarlyAccessError(data.error || 'Invalid early access code')
        }
      })
      .catch(() => {
        setEarlyAccessValid(false)
        setEarlyAccessError('Failed to validate early access code')
      })
  }, [earlyAccess])

  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await fetch('/api/x402/tickets')
        const data = await res.json()
        if (data.success) {
          const tix = TICKETING.overrides.soldOut
            ? data.data.tickets.map((t: TicketInfo) => ({ ...t, available: false, availableCount: 0 }))
            : data.data.tickets
          setTickets(tix)
          setPaymentInfo(data.data.paymentInfo)
        } else {
          setError(data.error || 'Failed to load tickets')
        }
      } catch {
        setError('Failed to load tickets')
      }
      setLoading(false)
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
  const totalFormatted = `$${(totalCents / 100).toFixed(2)} USD`

  const selectionText =
    totalQty === 0
      ? 'No tickets selected'
      : cart
          .filter(c => c.quantity > 0)
          .map(c => `${c.quantity} x ${c.name}`)
          .join(', ')

  const pretixCheckoutUrl = TICKETING.checkout.pretixRedirectUrl || undefined

  const saveCartAndNavigate = () => {
    if (!paymentInfo) return
    const cartData: CartData = {
      items: cart.filter(c => c.quantity > 0),
      paymentInfo,
      savedAt: Date.now(),
    }
    localStorage.setItem('devcon-ticket-cart', JSON.stringify(cartData))
  }

  const handleCheckout = (e: React.MouseEvent) => {
    if (pretixCheckoutUrl) {
      e.preventDefault()
      saveCartAndNavigate()
      // Redirect to Pretix shop — user selects tickets and completes payment there.
      // Cross-origin cart pre-population is not possible (CSRF protected).
      window.location.href = pretixCheckoutUrl
    } else {
      saveCartAndNavigate()
    }
  }

  const forceSoldOut = TICKETING.overrides.soldOut
  const requireDiscountCode = TICKETING.self.requireDiscountCode
  const admissionTickets = tickets.filter(t => t.isAdmission && (forceSoldOut || t.available) && !t.requireVoucher)
  const discountTicketId = TICKETING.pretix.ticketDiscountId
    ? parseInt(TICKETING.pretix.ticketDiscountId, 10)
    : undefined
  const voucherTickets = tickets.filter(t =>
    t.isAdmission && (forceSoldOut || t.available) && t.requireVoucher &&
    (discountTicketId ? t.id === discountTicketId : true)
  )

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
                <Image src={StoreSidebarLogo} alt="Devcon India" height={64} width={146} />
              </div>
              <h1 className={css['sidebar-title']}>
                Ticket Store
              </h1>
              <p className={css['sidebar-description']}>
                Secure your Devcon India ticket and join thousands of builders, creators, researchers, designers and
                thinkers at the world's biggest Ethereum conference.
              </p>
              <p className={css['sidebar-includes']}>
                All tickets include full conference access, swag, and lunch for 4 days.
              </p>
            </div>
            <ul className={css['sidebar-details']}>
              <li className={css['sidebar-details-item']}>
                <CalendarDays size={24} color="#d65600" strokeWidth={1.5} aria-hidden="true" />
                3–6 November 2026
              </li>
              <li className={css['sidebar-details-item']}>
                <MapPin size={24} color="#d65600" strokeWidth={1.5} aria-hidden="true" />
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

            {/* <section className={css['section']} id="local-launch">
              <h2 className={css['section-title']}>Local ticket launch</h2>
              <p className={css['section-subtitle']}>Check if you qualify for the Local Early Bird discount</p>

              <div className={css['card']}>
                <div className={css['card-main']}>
                  <div className={css['card-body']}>
                    <h3 className={css['card-title']}>Local Early Bird</h3>
                    <p className={css['card-meta']}>Via AnonAadhaar &middot; Price increases 31 March</p>
                    <p className={css['card-description']}>
                      Full conference access, swag bag, plus coffee, lunch and snacks all week.
                    </p>
                  </div>
                  <div className={css['card-right']}>
                    <div className={css['pricing']}>
                      <span className={css['price-current']}>$149</span>
                      <span className={css['price-original']}>$249</span>
                    </div>
                    <button type="button" className={css['verify-btn']} onClick={() => setVerificationOpen(true)}>
                      <VerifyIcon />
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            </section> */}

            {/* <section className={css['section']} id="general-admission">
              <h2 className={css['section-title']}>General admission</h2>
              <p className={css['section-subtitle']}>Our General admission tickets are now live!</p>

              {loading && <p>Loading tickets...</p>}
              {error && <p style={{ color: '#c00' }}>{error}</p>}

              {admissionTickets.map(ticket => (
                <div key={ticket.id} className={css['card']}>
                  <div className={css['card-main']}>
                    <div className={css['card-body']}>
                      <h3 className={css['card-title']}>{ticket.name}</h3>
                      {ticket.description && <p className={css['card-meta']}>{ticket.description}</p>}
                      <p className={css['card-description']}>
                        Full conference access, swag bag, plus coffee, lunch and snacks all week!
                        {ticket.availableCount !== null && (
                          <span
                            style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8125rem', color: '#666' }}
                          >
                            {ticket.availableCount} remaining
                          </span>
                        )}
                      </p>
                    </div>
                    <div className={css['card-right']}>
                      <div className={css['pricing']}>
                        {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
                          <span className={css['price-original']}>${ticket.originalPrice}</span>
                        )}
                        <span className={css['price-current']}>${ticket.price}</span>
                      </div>
                      {pretixCheckoutUrl ? (
                        <a href={pretixCheckoutUrl} className={css['checkout-btn']}>
                          Buy
                          <ArrowRightIcon />
                        </a>
                      ) : (
                        <div className={css['quantity']}>
                          <button
                            type="button"
                            className={css['quantity-btn']}
                            onClick={() => updateCartQuantity(ticket, -1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <Input
                            type="number"
                            className="w-11 h-9 border-x border-y-0 rounded-none text-center p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            value={getQuantity(ticket.id)}
                            min={0}
                            onChange={e => setCartQuantity(ticket, parseInt(e.target.value, 10) || 0)}
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            className={css['quantity-btn']}
                            onClick={() => updateCartQuantity(ticket, 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {!loading && admissionTickets.length === 0 && !error && (
                <p style={{ color: '#666' }}>No tickets currently available.</p>
              )}
            </section> */}

            {voucherTickets.length > 0 && (
              <section className={css['section']} id="discounts">
                <div className={css['section-header']}>
                  <div className={css['section-title-row']}>
                    <h2 className={css['section-title']}>Local ticket launch</h2>
                    <span className={css['live-badge']}>LIVE</span>
                  </div>
                  <p className={css['section-subtitle']}>
                    Check if you qualify for the Local Early Bird discounted ticket (ETH Mumbai exclusive)
                  </p>
                </div>

                <div className={css['discounts-grid']}>
                  {voucherTickets.map(ticket => (
                    <React.Fragment key={ticket.id}>
                      <div className={`${css['card']} ${!ticket.available || (requireDiscountCode && !(earlyAccess && earlyAccessValid === true)) ? css['card--disabled'] : ''}`}>
                        <div className={css['card-stacked']}>
                          <div className={css['card-details']}>
                            <h3 className={css['card-title']}>{ticket.name}</h3>
                            {!ticket.available ? (
                              <p className={css['sold-out-meta']}>Next sale: 6 April, 2026</p>
                            ) : (
                              <p className={css['card-meta']}>
                                Via Self & ETH Mumbai registration &middot; Price increases 31 March
                              </p>
                            )}
                            <p className={css['card-description']}>
                              Full conference access including talks and workshops, swag bag, plus coffee, lunch and
                              snacks all week.
                            </p>
                          </div>
                          {!ticket.available ? (
                            <div className={css['card-footer']}>
                              <div className={`${css['pricing']} ${css['pricing--faded']}`}>
                                <span className={css['price-current']}>${ticket.price}</span>
                                {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
                                  <span className={css['price-original']}>${ticket.originalPrice}</span>
                                )}
                              </div>
                              <span className={css['sold-out-badge']}>Sold out!</span>
                            </div>
                          ) : !requireDiscountCode || (earlyAccess && earlyAccessValid === true) ? (
                            <div className={css['card-footer']}>
                              <div className={css['pricing']}>
                                <span className={css['price-current']}>${ticket.price}</span>
                                {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
                                  <span className={css['price-original']}>${ticket.originalPrice}</span>
                                )}
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
                          ) : earlyAccess && earlyAccessValid === null ? (
                            <div className={css['card-footer']}>
                              <div className={css['pricing']}>
                                <span className={css['price-current']}>${ticket.price}</span>
                                {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
                                  <span className={css['price-original']}>${ticket.originalPrice}</span>
                                )}
                              </div>
                              <p className={css['card-disabled-message']}>
                                Validating early access code...
                              </p>
                            </div>
                          ) : earlyAccess && earlyAccessValid === false ? (
                            <div className={css['card-footer']}>
                              <div className={css['pricing']}>
                                <span className={css['price-current']}>${ticket.price}</span>
                                {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
                                  <span className={css['price-original']}>${ticket.originalPrice}</span>
                                )}
                              </div>
                              <p className={css['card-disabled-message']}>
                                {earlyAccessError || 'Invalid early access code'}
                              </p>
                            </div>
                          ) : (
                            <div className={css['card-footer']}>
                              <div className={css['pricing']}>
                                <span className={css['price-current']}>${ticket.price}</span>
                                {ticket.originalPrice && ticket.originalPrice !== ticket.price && (
                                  <span className={css['price-original']}>${ticket.originalPrice}</span>
                                )}
                              </div>
                              <div className={css['access-link-badge']}>
                                <div className={css['access-link-badge-logo']}>
                                  <Image src={SelfLogoPng} alt="Self" width={36} height={36} />
                                </div>
                                <span>Check your email for your unique access link</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </section>
            )}

            <section className={css['section']} id="coming-soon">
              <div className={css['section-header']}>
                <h2 className={css['section-title']}>Coming soon</h2>
                <p className={css['section-subtitle']}>
                  More ways to get Devcon tickets are coming later this year.
                </p>
              </div>

              <div className={css['coming-soon-grid']}>
                <div className={css['coming-soon-card']}>
                  <div className={css['coming-soon-card-body']}>
                    <h3 className={css['coming-soon-card-title']}>{'Early Bird GA \ud83d\udc24'}</h3>
                    <p className={css['card-meta']}>Global launch on 6 April</p>
                    <p className={css['card-description']}>
                      Early-bird discount of the original, anon-friendly Devcon ticket.
                    </p>
                  </div>
                  <div className={css['coming-soon-card-footer']}>
                    <div className={css['coming-soon-card-pricing']}>
                      <span className={css['coming-soon-price']}>$299</span>
                      <span className={css['coming-soon-price-original']}>$599</span>
                    </div>
                    <span className={css['coming-soon-availability']}>Available 6 April</span>
                  </div>
                </div>

                <div className={css['coming-soon-card']}>
                  <div className={css['coming-soon-card-body']}>
                    <h3 className={css['coming-soon-card-title']}>{"Youth Ticket (3\u201317) \ud83c\udf31"}</h3>
                    <p className={css['card-meta']}>Consent form submission & ID/proof required at Registration.</p>
                    <p className={css['card-description']}>
                      {"Whether you're a younger attendee, or bringing your child."}
                    </p>
                  </div>
                  <div className={css['coming-soon-card-footer']}>
                    <div className={css['coming-soon-card-pricing']}>
                      <span className={css['coming-soon-price']}>$19</span>
                    </div>
                    <span className={css['coming-soon-availability']}>Applications open 6 April</span>
                  </div>
                </div>

                <div className={css['coming-soon-card']}>
                  <div className={css['coming-soon-card-body']}>
                    <h3 className={css['coming-soon-card-title']}>{"Student Discount \ud83c\udf93"}</h3>
                    <p className={css['card-meta']}>School/University ID required at check-in</p>
                    <p className={css['card-description']}>
                      500 discounts will be distributed this year to University students from around the world who wish
                      to explore Ethereum.
                    </p>
                  </div>
                  <div className={css['coming-soon-card-footer']}>
                    <div className={css['coming-soon-card-pricing']}>
                      <span className={css['coming-soon-price']}>$49</span>
                    </div>
                    <span className={css['coming-soon-availability']}>Applications open 6 April</span>
                  </div>
                </div>

                <div className={css['coming-soon-card']}>
                  <div className={css['coming-soon-card-body']}>
                    <h3 className={css['coming-soon-card-title']}>{"Builder Discount \ud83e\udd84"}</h3>
                    <p className={css['card-meta']}>ID required at Registration</p>
                    <p className={css['card-description']}>
                      For builders of all kinds who actively volunteer or contribute their time to the growth, research
                      and development of Ethereum or the ecosystem.
                    </p>
                  </div>
                  <div className={css['coming-soon-card-footer']}>
                    <div className={css['coming-soon-card-pricing']}>
                      <span className={css['coming-soon-price']}>$299</span>
                      <span className={css['coming-soon-price-original']}>$599</span>
                    </div>
                    <span className={css['coming-soon-availability']}>Applications open 4 May</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
          {!pretixCheckoutUrl && totalQty > 0 && (
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
                      ${(totalCents / 100).toFixed(2)}
                      <span className={css['summary-total-currency']}> USD</span>
                    </p>
                  </div>
                </div>
                <div className={css['summary-actions']}>
                  {totalQty > 0 ? (
                    <Link to="/tickets/store/checkout" className={css['checkout-btn']} onClick={handleCheckout}>
                      Checkout
                      <ArrowRightIcon />
                    </Link>
                  ) : (
                    <span className={css['checkout-btn']} aria-disabled>
                      Checkout
                      <ArrowRightIcon />
                    </span>
                  )}
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
        earlyAccess={requireDiscountCode ? (earlyAccess ?? undefined) : undefined}
      />
    </>
  )
}

export default function TicketsStorePage() {
  const [selfVerificationOpen, setSelfVerificationOpen] = useState(false)
  const [useSelfStaging, setUseSelfStaging] = useState(TICKETING.self.staging)

  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <StoreContent
        selfVerificationOpen={selfVerificationOpen}
        setSelfVerificationOpen={setSelfVerificationOpen}
        useSelfStaging={useSelfStaging}
        setUseSelfStaging={setUseSelfStaging}
      />
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
