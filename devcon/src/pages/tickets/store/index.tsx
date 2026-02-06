import React, { useState, useEffect } from 'react'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
import { AnonAadhaarProvider } from '@anon-aadhaar/react'
import { VerificationModal } from 'components/domain/tickets/VerificationModal'
import css from './store.module.scss'

const EVENT_DATE = new Date('2026-11-03T00:00:00Z')

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
  useTestAadhaar: boolean
  setUseTestAadhaar: (value: boolean) => void
  setProviderResetKey: React.Dispatch<React.SetStateAction<number>>
  verificationOpen: boolean
  setVerificationOpen: React.Dispatch<React.SetStateAction<boolean>>
}

function StoreContent({
  useTestAadhaar,
  setUseTestAadhaar,
  setProviderResetKey,
  verificationOpen,
  setVerificationOpen,
}: StoreContentProps) {
  const [earlyBirdQty, setEarlyBirdQty] = useState(0)
  const countdown = useCountdown()

  const totalQty = earlyBirdQty
  const totalCents = earlyBirdQty * 34900
  const totalFormatted = `$${(totalCents / 100).toFixed(2)} USD`

  return (
    <>
      <div className={css['store-layout']}>
        <aside className={css['sidebar']}>
          <div className={css['sidebar-logo']}>DEV CON INDIA</div>
          <h1 className={css['sidebar-title']}>Devcon Tickets</h1>
          <p className={css['sidebar-description']}>
            Secure your Devcon India ticket and join thousands of builders, creators, and thinkers at the world's biggest
            Ethereum conference.
          </p>
          <ul className={css['sidebar-details']}>
            <li>3-6 November 2026</li>
            <li>Jio World Centre, Mumbai, India</li>
          </ul>
        </aside>

        <div className={css['content-wrapper']}>
          <div className={css['content']}>
            <div className={css['countdown-banner']}>
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

          <section className={css['section']} id="general-admission">
            <h2 className={css['section-title']}>General admission</h2>
            <p className={css['section-subtitle']}>Our General admission tickets are now live!</p>

            <div className={css['card']}>
              <div className={css['card-main']}>
                <div className={css['card-body']}>
                  <h3 className={css['card-title']}>Early Bird Tickets</h3>
                  <p className={css['card-meta']}>Price increases 30 March</p>
                  <p className={css['card-description']}>
                    Full conference access, swag bag, plus coffee, lunch and snacks all week!
                  </p>
                </div>
                <div className={css['card-right']}>
                  <div className={css['pricing']}>
                    <span className={css['price-current']}>$349</span>
                    <span className={css['price-original']}>$599</span>
                  </div>
                  <div className={css['quantity']}>
                    <button
                      type="button"
                      className={css['quantity-btn']}
                      onClick={() => setEarlyBirdQty((q) => Math.max(0, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className={css['quantity-input']}
                      value={earlyBirdQty}
                      min={0}
                      onChange={(e) =>
                        setEarlyBirdQty(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      className={css['quantity-btn']}
                      onClick={() => setEarlyBirdQty((q) => q + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={css['section']} id="discounts">
            <h2 className={css['section-title']}>Discounts</h2>
            <p className={css['section-subtitle']}>Check if you qualify for a general admission discount</p>

            <div className={css['discounts-grid']}>
              <div className={css['card']}>
                <div className={css['card-main']}>
                  <div className={css['card-body']}>
                    <h3 className={css['card-title']}>Locals</h3>
                    <p className={css['card-meta']}>Via AnonAadhaar</p>
                    <p className={css['card-description']}>
                      Verify you're based in India (via AnonAadhaar) to get this discount
                    </p>
                  </div>
                  <div className={css['card-right']}>
                    <div className={css['pricing']}>
                      <span className={css['price-current']}>$99</span>
                      <span className={css['price-original']}>$349</span>
                    </div>
                    <button
                      type="button"
                      className={css['verify-btn']}
                      onClick={() => setVerificationOpen(true)}
                    >
                      <VerifyIcon />
                      Verify
                    </button>
                  </div>
                </div>
              </div>
              <div className={css['card']}>
                <div className={css['card-main']}>
                  <div className={css['card-body']}>
                    <h3 className={css['card-title']}>Local Builders</h3>
                    <p className={css['card-meta']}>Via AnonAadhaar</p>
                    <p className={css['card-description']}>
                      Verify you're based in India (via AnonAadhaar) to get this discount
                    </p>
                  </div>
                  <div className={css['card-right']}>
                    <div className={css['pricing']}>
                      <span className={css['price-current']}>$99</span>
                      <span className={css['price-original']}>$349</span>
                    </div>
                    <button
                      type="button"
                      className={css['verify-btn']}
                      onClick={() => setVerificationOpen(true)}
                    >
                      <VerifyIcon />
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          </div>
          <div className={css['summary-sticky']}>
            <div className={css['summary-sticky-inner']}>
              <div className={css['summary-row']}>
                <div>
                  <p className={css['summary-label']}>Your selection</p>
                  <p className={css['summary-selection']}>
                    {totalQty === 0
                      ? 'No tickets selected'
                      : `${totalQty} x Global Early Bird Ticket`}
                  </p>
                </div>
                <div>
                  <p className={css['summary-total-label']}>Total</p>
                  <p className={css['summary-total-value']}>{totalFormatted}</p>
                </div>
              </div>
              <div className={css['summary-actions']}>
                {totalQty > 0 ? (
                  <Link to="/tickets/store/checkout" className={css['checkout-btn']}>
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
        </div>
      </div>

      <VerificationModal
        isOpen={verificationOpen}
        onClose={() => setVerificationOpen(false)}
        useTestAadhaar={useTestAadhaar}
        setUseTestAadhaar={setUseTestAadhaar}
        onReset={() => setProviderResetKey((k) => k + 1)}
      />
    </>
  )
}

export default function TicketsStorePage() {
  const [useTestAadhaar, setUseTestAadhaar] = useState(false)
  const [providerResetKey, setProviderResetKey] = useState(0)
  const [verificationOpen, setVerificationOpen] = useState(false)

  return (
    <Page theme={themes['tickets']} hideFooter>
      <AnonAadhaarProvider
        key={providerResetKey}
        _useTestAadhaar={useTestAadhaar}
        _appName="Devcon Tickets"
      >
        <StoreContent
          useTestAadhaar={useTestAadhaar}
          setUseTestAadhaar={setUseTestAadhaar}
          setProviderResetKey={setProviderResetKey}
          verificationOpen={verificationOpen}
          setVerificationOpen={setVerificationOpen}
        />
      </AnonAadhaarProvider>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
