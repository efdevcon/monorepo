import React, { useState } from 'react'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
import css from './checkout.module.scss'

function CaretDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

const GOALS = [
  'Networking',
  'Learning',
  'Attending talks & workshops',
  'Participating in bounties/hackathons',
  'Unique experiences',
  'Knowledge sharing',
  'Find a job',
  'Meet an event',
  'Make new connections',
  'Immerse in the culture',
]

const FAQ_ITEMS = [
  {
    q: 'I plan on bringing my child to Devcon with me. Do they need a ticket?',
    a: 'Youth tickets (ages 5-17) are available. Children under 5 do not need a ticket.',
  },
  {
    q: 'When will General ticket sales start?',
    a: 'Early Bird tickets are on sale now. General admission waves will be announced.',
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: 'Yes. Self-claiming discounts for Indian locals are available. Additional discount categories open 1 May.',
  },
]

export default function CheckoutPage() {
  const [openSection, setOpenSection] = useState<string | null>('swag')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>('crypto')
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set())
  const [swag1Size, setSwag1Size] = useState('Size Male M')
  const [swag2Size, setSwag2Size] = useState('Size Male M')
  const [premium1Qty, setPremium1Qty] = useState(1)
  const [premium2Qty, setPremium2Qty] = useState(0)

  const toggleSection = (id: string) => {
    setOpenSection((s) => (s === id ? null : id))
  }

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goal)) next.delete(goal)
      else next.add(goal)
      return next
    })
  }

  const subtotal = 349 + 45 * premium1Qty + 45 * premium2Qty
  const totalUsd = paymentMethod === 'crypto' ? (subtotal * 0.97).toFixed(2) : subtotal.toFixed(2)

  return (
    <Page theme={themes['tickets']} hideFooter>
      <div className={css['checkout-layout']}>
        <main className={css['main']}>
          <Link to="/tickets/store" className={css['back-link']}>
            ← Back
          </Link>
          <h1 className={css['page-title']}>Checkout</h1>

          {/* Swag & Add-ons */}
          <section className={css['section']}>
            <button
              type="button"
              className={`${css['section-header']} ${openSection === 'swag' ? css['is-open'] : ''}`}
              onClick={() => toggleSection('swag')}
              aria-expanded={openSection === 'swag'}
            >
              <span>Swag & Add-ons</span>
              <CaretDownIcon className={css['section-caret']} />
            </button>
            {openSection === 'swag' && (
              <div className={css['section-body']}>
                <div className={css['swag-grid']}>
                  <div className={css['swag-card']}>
                    <div className={css['swag-image']} />
                    <div className={css['swag-info']}>
                      <h4>Swag Item 1</h4>
                    </div>
                    <div className={css['swag-right']}>
                      <select
                        className={css['select-input']}
                        value={swag1Size}
                        onChange={(e) => setSwag1Size(e.target.value)}
                      >
                        <option>Size Male M</option>
                        <option>Size Male S</option>
                        <option>Size Male L</option>
                        <option>Size Female M</option>
                      </select>
                      <span className={css['swag-price-free']}>FREE</span>
                    </div>
                  </div>
                  <div className={css['swag-card']}>
                    <div className={css['swag-image']} />
                    <div className={css['swag-info']}>
                      <h4>Swag Item 2</h4>
                    </div>
                    <div className={css['swag-right']}>
                      <select
                        className={css['select-input']}
                        value={swag2Size}
                        onChange={(e) => setSwag2Size(e.target.value)}
                      >
                        <option>Size Male M</option>
                        <option>Size Male S</option>
                        <option>Size Male L</option>
                        <option>Size Female M</option>
                      </select>
                      <span className={css['swag-price-free']}>FREE</span>
                    </div>
                  </div>
                  <div className={css['swag-card']}>
                    <div className={css['swag-image']} />
                    <div className={css['swag-info']}>
                      <h4>Premium Swag Item 1</h4>
                      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                    </div>
                    <div className={css['swag-right']}>
                      <div className={css['quantity-inline']}>
                        <button
                          type="button"
                          className={css['quantity-inline-btn']}
                          onClick={() => setPremium1Qty((q) => Math.max(0, q - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className={css['quantity-inline-input']}
                          value={premium1Qty}
                          min={0}
                          readOnly
                        />
                        <button
                          type="button"
                          className={css['quantity-inline-btn']}
                          onClick={() => setPremium1Qty((q) => q + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className={css['swag-price']}>$45</span>
                    </div>
                  </div>
                  <div className={css['swag-card']}>
                    <div className={css['swag-image']} />
                    <div className={css['swag-info']}>
                      <h4>Premium Swag Item 2</h4>
                      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                    </div>
                    <div className={css['swag-right']}>
                      <div className={css['quantity-inline']}>
                        <button
                          type="button"
                          className={css['quantity-inline-btn']}
                          onClick={() => setPremium2Qty((q) => Math.max(0, q - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className={css['quantity-inline-input']}
                          value={premium2Qty}
                          min={0}
                          readOnly
                        />
                        <button
                          type="button"
                          className={css['quantity-inline-btn']}
                          onClick={() => setPremium2Qty((q) => q + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className={css['swag-price']}>$45</span>
                    </div>
                  </div>
                </div>
                <button type="button" className={css['btn-primary']}>
                  Continue
                </button>
              </div>
            )}
          </section>

          {/* Contact details */}
          <section className={css['section']}>
            <button
              type="button"
              className={`${css['section-header']} ${openSection === 'contact' ? css['is-open'] : ''}`}
              onClick={() => toggleSection('contact')}
              aria-expanded={openSection === 'contact'}
            >
              <span>Contact details</span>
              <CaretDownIcon className={css['section-caret']} />
            </button>
            {openSection === 'contact' && (
              <div className={css['section-body']}>
                <p className={css['section-intro']}>
                  Where should we send your tickets? Your Devcon tickets will be linked with this name and email address.
                </p>
                <div className={css['field-row']}>
                  <div className={css['field']}>
                    <label htmlFor="first-name">First name</label>
                    <input id="first-name" type="text" className={css['text-input']} placeholder="First name" />
                  </div>
                  <div className={css['field']}>
                    <label htmlFor="last-name">Last name</label>
                    <input id="last-name" type="text" className={css['text-input']} placeholder="Last name" />
                  </div>
                </div>
                <div className={css['field-row']}>
                  <div className={css['field']}>
                    <label htmlFor="email">Enter email</label>
                    <input id="email" type="email" className={css['text-input']} placeholder="Enter email" />
                  </div>
                  <div className={css['field']}>
                    <label htmlFor="confirm-email">Confirm email</label>
                    <input id="confirm-email" type="email" className={css['text-input']} placeholder="Confirm email" />
                  </div>
                </div>
                <label className={css['checkbox-label']}>
                  <input type="checkbox" />
                  <span>Subscribe to the Devcon newsletter</span>
                </label>
                <button type="button" className={css['btn-secondary']}>
                  Continue
                </button>
              </div>
            )}
          </section>

          {/* Attendee information */}
          <section className={css['section']}>
            <button
              type="button"
              className={`${css['section-header']} ${openSection === 'attendee' ? css['is-open'] : ''}`}
              onClick={() => toggleSection('attendee')}
              aria-expanded={openSection === 'attendee'}
            >
              <span>Attendee information</span>
              <CaretDownIcon className={css['section-caret']} />
            </button>
            {openSection === 'attendee' && (
              <div className={css['section-body']}>
                <div className={css['field']}>
                  <label htmlFor="country">Country of Nationality</label>
                  <select id="country" className={css['text-input']}>
                    <option>Select a country.</option>
                  </select>
                </div>
                <div className={css['field']}>
                  <label htmlFor="role">Which best describes your role?</label>
                  <select id="role" className={css['text-input']}>
                    <option>Select a role.</option>
                  </select>
                </div>
                <div className={css['field']}>
                  <label>Is this your first Devcon/web3 event?</label>
                  <div className={css['radio-group']}>
                    <label className={css['radio-label']}>
                      <input type="radio" name="first-event" value="yes" />
                      Yes
                    </label>
                    <label className={css['radio-label']}>
                      <input type="radio" name="first-event" value="no" />
                      No
                    </label>
                  </div>
                </div>
                <div className={css['field']}>
                  <label>Dietary restrictions</label>
                  <div className={css['radio-group']}>
                    {['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-Free', 'Halal', 'Not Allergies'].map((opt) => (
                      <label key={opt} className={css['radio-label']}>
                        <input type="radio" name="dietary" value={opt} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={css['field']}>
                  <label>What are your goals for Devcon?</label>
                  <div className={css['goals-grid']}>
                    {GOALS.map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        className={`${css['goal-tag']} ${selectedGoals.has(goal) ? css['selected'] : ''}`}
                        onClick={() => toggleGoal(goal)}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className={css['btn-secondary']}>
                  Continue
                </button>
              </div>
            )}
          </section>

          {/* Payment */}
          <section className={css['section']}>
            <button
              type="button"
              className={`${css['section-header']} ${openSection === 'payment' ? css['is-open'] : ''}`}
              onClick={() => toggleSection('payment')}
              aria-expanded={openSection === 'payment'}
            >
              <span>Payment</span>
              <CaretDownIcon className={css['section-caret']} />
            </button>
            {openSection === 'payment' && (
              <div className={css['section-body']}>
                <p className={css['section-intro']}>
                  Select your preferred payment method. Receive a 3% discount when paying with Cryptos.
                </p>
                <label
                  className={`${css['payment-option']} ${paymentMethod === 'crypto' ? css['selected'] : ''}`}
                  onClick={() => setPaymentMethod('crypto')}
                >
                  <input type="radio" name="payment" checked={paymentMethod === 'crypto'} readOnly />
                  <div className={css['payment-option-content']}>
                    <h4>Crypto (3% OFF)</h4>
                    <p>All major wallets & tokens.</p>
                    <div className={css['wallet-placeholder']} />
                    <p>Pay using all major wallets and tokens. Connect your wallet at your next step.</p>
                  </div>
                </label>
                <label
                  className={`${css['payment-option']} ${paymentMethod === 'fiat' ? css['selected'] : ''}`}
                  onClick={() => setPaymentMethod('fiat')}
                >
                  <input type="radio" name="payment" checked={paymentMethod === 'fiat'} readOnly />
                  <div className={css['payment-option-content']}>
                    <h4>Fiat</h4>
                    <p>Debit / Credit Card.</p>
                  </div>
                </label>
                <button type="button" className={css['btn-checkout']}>
                  Checkout — ${totalUsd} USD
                </button>
                <p className={css['stripe-note']}>
                  Powered by Stripe
                </p>
              </div>
            )}
          </section>

          {/* FAQ */}
          <section className={css['section']}>
            <button
              type="button"
              className={`${css['section-header']} ${openSection === 'faq' ? css['is-open'] : ''}`}
              onClick={() => toggleSection('faq')}
              aria-expanded={openSection === 'faq'}
            >
              <span>FAQ</span>
              <CaretDownIcon className={css['section-caret']} />
            </button>
            {openSection === 'faq' && (
              <div className={css['section-body']}>
                <div className={css['faq-list']}>
                  {FAQ_ITEMS.map((item, i) => (
                    <div key={i} className={css['faq-item']}>
                      <button
                        type="button"
                        className={`${css['faq-question']} ${openFaqIndex === i ? css['is-open'] : ''}`}
                        onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                      >
                        <span>{item.q}</span>
                        <span className={css['section-caret']}>
                          <CaretDownIcon />
                        </span>
                      </button>
                      {openFaqIndex === i && <div className={css['faq-answer']}>{item.a}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className={css['panel']}>
          <div className={css['panel-banner']}>
            <span className={css['panel-banner-text']}>Devcon India</span>
          </div>
          <div className={css['panel-content']}>
            <ul className={css['panel-items']}>
              <li className={css['panel-item']}>
                <div>
                  <span className={css['panel-item-name']}>Global Early Bird Ticket</span>
                </div>
                <span className={css['panel-item-price']}>x1 · $349</span>
              </li>
              <li className={css['panel-item']}>
                <div>
                  <span className={css['panel-item-name']}>Swag Item one</span>
                  <div className={css['panel-item-meta']}>Size: Male M</div>
                </div>
                <span className={css['panel-item-price']}>FREE</span>
              </li>
              <li className={css['panel-item']}>
                <div>
                  <span className={css['panel-item-name']}>Swag Item two</span>
                  <div className={css['panel-item-meta']}>Size: Male M</div>
                </div>
                <span className={css['panel-item-price']}>FREE</span>
              </li>
              <li className={css['panel-item']}>
                <div>
                  <span className={css['panel-item-name']}>Premium swag item 1</span>
                </div>
                <span className={css['panel-item-price']}>x{premium1Qty} · $45</span>
              </li>
              {premium2Qty > 0 && (
                <li className={css['panel-item']}>
                  <div>
                    <span className={css['panel-item-name']}>Premium swag item 2</span>
                  </div>
                  <span className={css['panel-item-price']}>x{premium2Qty} · $45</span>
                </li>
              )}
            </ul>
            <div className={css['discount-row']}>
              <input
                type="text"
                className={css['discount-input']}
                placeholder="Discount or Moonlight Code"
              />
              <button type="button" className={css['discount-btn']}>
                Apply
              </button>
            </div>
            <div className={css['summary-row']}>
              <span>Subtotal</span>
              <span>${subtotal}</span>
            </div>
            <div className={css['summary-total']}>
              <span>Total</span>
              <span>${totalUsd} USD</span>
            </div>
            <div className={css['panel-disclaimer']}>
              <p>
                By placing your order, you agree to Devcon's{' '}
                <Link to="/terms-of-service">Terms & Conditions</Link> and{' '}
                <Link to="/privacy-policy">Privacy Policy</Link>.
              </p>
              <p>
                An order confirmation with your tickets will be sent to the email provided during checkout. If you don't
                receive a confirmation email, please <Link to="/contact">contact us</Link>.
              </p>
              <p>
                Got a question? <Link to="/tickets#faq">Read our ticketing FAQs</Link>.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
