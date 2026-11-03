import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
// AnonAadhaar disabled — keeping code for now
// import { AnonAadhaarProvider } from '@anon-aadhaar/react'
// import { VerificationModal } from 'components/domain/tickets/VerificationModal'
import { RedeemVoucherModal } from 'components/domain/tickets/RedeemVoucherModal'
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Ticket, Coffee, Ribbon } from 'lucide-react'
import css from './store.module.scss'

// Single price figure on a store card — one price regardless of payment
// method (the ETH / fiat split and its chips are gone).
const CardPrice = ({ price }: { price: string }) => (
  <span className="text-[18px] font-bold leading-none tracking-[-0.5px] text-[#221144]">{price}</span>
)
import StoreSidebarLogo from 'assets/images/dc-8/dc8-logo.png'
import StoreCountdownBanner from 'assets/images/pages/countdown-banner.png'
import { TICKETING, pretixEventUrl, discountSoldOut } from 'config/ticketing'
import { useIsLaunched } from 'hooks/useWaveStates'
import { addItemsToPretixCartAndRedirect } from 'services/pretixCart'
import { VerifyDiscountModal } from 'components/domain/tickets/VerifyDiscountModal'
import { WagmiProvider, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiAdapter } from 'context/appkit-config'

const EVENT_DATE = new Date('2026-11-03T00:00:00Z')

// Single React Query client for the wallet (wagmi) provider that powers the
// "Connect wallet" discount modal.
const queryClient = new QueryClient()

// Pricing shape shared by store cards: `price` renders as a single bold
// figure; `free` renders plain bold "FREE".
type CardPricing = {
  price?: string
  free?: boolean
}

// Static self-claim discounts shown in the Community section that have no
// backend verification flow yet. Their buttons are active no-ops until the
// corresponding flow ships. Order matches the store Figma: Ethereum Public
// Goods, then Core Devs.
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
    price: '$349',
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
// `href` cards link to an application form ("Apply now"); `pretixItemId`
// cards sell a plain public Pretix item and hand the buyer straight to the
// Pretix shop with it in their cart.
type ApplicationTicket = CardPricing & {
  type: string
  title: string
  meta: string
  description: string
  buttonLabel: string
} & ({ href: string; pretixItemId?: undefined } | { href?: undefined; pretixItemId: number | null })

const APPLICATION_TICKETS: ApplicationTicket[] = [
  {
    type: 'indian-student',
    title: 'Indian Student 🇮🇳',
    meta: 'ID required at check-in',
    description:
      'A limited amount of discounted tickets will be distributed this year to students from all over India who are looking to explore Ethereum. Tickets are available until sold out.',
    price: '$25',
    buttonLabel: 'Apply now',
    href: '/form/student-application',
  },
  {
    type: 'international-student',
    title: 'International Student 🌎',
    meta: 'ID required at check-in',
    description:
      'A limited amount of tickets will be distributed this year to students from around the world who wish to learn more about Ethereum. Tickets are available until sold out.',
    price: '$99',
    buttonLabel: 'Apply now',
    href: '/form/student-application',
  },
  {
    type: 'builder',
    title: 'Sanctuary Tech Builders',
    meta: 'Contribution-based',
    description:
      'For developers, designers and everyone building the open, privacy-preserving, decentralized technologies that keeps the internet free and self-sovereign.',
    price: '$499',
    buttonLabel: 'Apply now',
    href: '/form/builder-application',
  },
  {
    // Copy mirrors the live Pretix product (item 7 on tickets.devcon.org).
    type: 'youth',
    title: 'Solo Youth Ticket (16-17) 🌱',
    meta: 'Consent form submission & ID/proof required at check-in',
    description: 'For attendees 16-17 attending alone. Anyone under 16 must be accompanied by a parent/guardian.',
    price: '$19',
    buttonLabel: 'Apply now',
    href: '/form/youth-ticket',
  },
  {
    // Copy mirrors the live Pretix product (item 109 on tickets.devcon.org).
    // Store-only, like the Under 3 card below.
    type: 'child-with-adult',
    title: 'Child (3-17) with Adult',
    meta: 'Adults must hold their own Devcon ticket to enter',
    description: 'This ticket grants access to all 4 days of Devcon, with lunch included.',
    price: '$19',
    buttonLabel: 'Get ticket',
    pretixItemId: TICKETING.pretix.childWithAdultItemId,
  },
  {
    // Copy mirrors the live Pretix product (item 110 on tickets.devcon.org).
    // Store-only: the /tickets landing page deliberately doesn't list it.
    type: 'child-under-3',
    title: 'Child (Under 3) with Adult',
    meta: 'Adults must hold their own Devcon ticket to enter',
    description: 'This ticket grants access to all 4 days of Devcon, with lunch included.',
    free: true,
    buttonLabel: 'Get ticket',
    pretixItemId: TICKETING.pretix.childUnder3ItemId,
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

function StoreContent() {
  const countdown = useCountdown()
  // Global ticket launch gate (config/waves.ts GLOBAL_LAUNCH_TIME). Before
  // the launch, the Community self-claim flows show an "Opens July" label
  // instead of their buttons — same before/during split as the /tickets
  // landing page. Student applications stay open; the Sanctuary Tech
  // Builders application opens at launch. Preview the launched view with
  // ?mockNow=launch.
  const { launched } = useIsLaunched()

  const [redeemOpen, setRedeemOpen] = useState(false)
  // Deep link for voucher holders: /tickets/store/#redeem scrolls to the
  // voucher banner (its id) and opens the redeem modal straight away.
  useEffect(() => {
    if (launched && window.location.hash === '#redeem') setRedeemOpen(true)
  }, [launched])
  const [verifyDiscountOpen, setVerifyDiscountOpen] = useState(false)

  // Hand the buyer off to the Pretix shop with a single plain Pretix item (the
  // Child (3-17) / Child (Under 3) cards) already in their cart when the item
  // is provisioned for this environment, otherwise just the Pretix shop.
  const goToPretixItem = (itemId: number | null) => {
    if (itemId === null) {
      window.location.href = pretixEventUrl('/')
      return
    }
    try {
      addItemsToPretixCartAndRedirect([{ id: itemId, quantity: 1 }])
    } catch (err) {
      console.error('Pretix cart handoff failed, falling back to shop:', err)
      window.location.href = pretixEventUrl('/')
    }
  }

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
                          <CardPrice price={card.price ?? ''} />
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
                // /tickets/store/#redeem lands here and opens the redeem modal (see the hash effect above).
                <div className={css['voucher-banner']} id="redeem">
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
                      {card.free ? (
                        <span className={css['application-price']}>FREE</span>
                      ) : (
                        <CardPrice price={card.price ?? ''} />
                      )}
                      {/* Sanctuary Tech Builders applications open at the
                          global launch; student applications are already
                          open (same split as the /tickets landing page). */}
                      {!launched && card.type === 'builder' ? (
                        <span className={css['opens-label']}>Opens July</span>
                      ) : discountSoldOut(card.type) ? (
                        <span className={css['sold-out-badge']}>Sold out</span>
                      ) : card.pretixItemId !== undefined ? (
                        <button
                          type="button"
                          className={css['apply-btn']}
                          onClick={() => goToPretixItem(card.pretixItemId)}
                        >
                          {card.buttonLabel}
                          <ArrowRight size={16} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <Link to={card.href} className={css['apply-btn']}>
                          {card.buttonLabel}
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

      <RedeemVoucherModal isOpen={redeemOpen} onClose={() => setRedeemOpen(false)} />

      <VerifyDiscountModal isOpen={verifyDiscountOpen} onClose={() => setVerifyDiscountOpen(false)} />
    </>
  )
}

export default function TicketsStorePage() {
  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
        <QueryClientProvider client={queryClient}>
          <StoreContent />
        </QueryClientProvider>
      </WagmiProvider>
    </Page>
  )
}

// NOTE: this page intentionally has NO getStaticProps/getServerSideProps. The
// store imports the web3 stack (appkit-config -> wagmi -> viem); running a
// data method forces that whole module graph to execute in the Netlify runtime
// function, which opens thousands of viem `_esm` files per request and
// exhausts the Lambda's file-descriptor limit (EMFILE). Keeping the page
// statically served means that graph only runs client-side. (Same fix
// previously applied to the order/checkout pages.)
