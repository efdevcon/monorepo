import React, { useState } from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from '../themes.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/ticketing.jpeg'
import { AnonAadhaarProvider } from '@anon-aadhaar/react'
import { VerificationModal } from 'components/domain/tickets/VerificationModal'
import css from '../tickets.module.scss'

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

type TicketsContentProps = {
  useTestAadhaar: boolean
  setUseTestAadhaar: (value: boolean) => void
  setProviderResetKey: React.Dispatch<React.SetStateAction<number>>
  verificationOpen: boolean
  setVerificationOpen: React.Dispatch<React.SetStateAction<boolean>>
}

function TicketsContent({
  useTestAadhaar,
  setUseTestAadhaar,
  setProviderResetKey,
  verificationOpen,
  setVerificationOpen,
}: TicketsContentProps) {
  const [quantity, setQuantity] = useState(1)

  return (
    <>
      <div className={css['tickets-content']}>
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
                    onClick={() => setQuantity((q) => Math.max(0, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className={css['quantity-input']}
                    value={quantity}
                    min={0}
                    onChange={(e) =>
                      setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    aria-label="Quantity"
                  />
                  <button
                    type="button"
                    className={css['quantity-btn']}
                    onClick={() => setQuantity((q) => q + 1)}
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
          <p className={css['section-subtitle']}>
            Check if you qualify for a general admission discount
          </p>

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
        </section>
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

export default function TicketsPage() {
  const [useTestAadhaar, setUseTestAadhaar] = useState(false)
  const [providerResetKey, setProviderResetKey] = useState(0)
  // Modal state lives here so it survives provider re-renders/remounts (e.g. after proof on mobile)
  const [verificationOpen, setVerificationOpen] = useState(false)

  return (
    <Page theme={themes['tickets']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Event</span> }, { text: 'Tickets' }]}
        title="Tickets"
        navigation={[
          { title: 'General admission', to: '#general-admission' },
          { title: 'Discounts', to: '#discounts' },
        ]}
      />

      <AnonAadhaarProvider
        key={providerResetKey}
        _useTestAadhaar={useTestAadhaar}
        _appName="Devcon Tickets"
      >
        <TicketsContent
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
