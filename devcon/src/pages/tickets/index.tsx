import React, { useState } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconFarcaster from 'assets/icons/farcaster.svg'
import DevconLogo from 'assets/images/dc-8/dc8-logo.png'
import themes from '../themes.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/ticketing.jpeg'
import css from './tickets-landing.module.scss'

const NAV_LINKS = [
  { title: 'Early Bird', to: '#early-bird' },
  { title: 'Overview', to: '#overview' },
  { title: 'General Admission', to: '#general-admission' },
  { title: 'Discounts', to: '#discounts' },
  { title: 'FAQ', to: '#faq' },
].map(link => ({ ...link, title: link.title.toUpperCase() }))

const OVERVIEW_CARDS = [
  {
    number: '01',
    title: 'Sale waves',
    subtitle: 'GENERAL ADMISSION',
    price: null,
    priceLabel: 'Coming soon',
    status: 'OPENS 02/04',
  },
  {
    number: '02',
    title: 'Self-claiming',
    subtitle: 'DISCOUNTS',
    price: '$149',
    originalPrice: '$249',
    priceLabel: null,
    status: 'AVAILABLE NOW',
  },
  {
    number: '03',
    title: 'Applications',
    subtitle: 'DISCOUNTS',
    price: null,
    priceLabel: 'Coming soon',
    status: 'TBD',
  },
]

const WAVES = [
  { name: 'Global Early Bird', price: '$249', date: 'Opens 2 April', live: true },
  { name: 'Waves 1-5', price: 'TBD', date: 'TBD', live: false },
  { name: 'Waves 5-9', price: 'TBD', date: 'TBD', live: false },
  { name: 'Waves 9-13', price: 'TBD', date: 'TBD', live: false },
]

const SELF_CLAIMING = [
  { name: 'Local Early Bird', detail: 'via AnonAadhaar', price: '$149', date: 'Ends 31 March', live: true },
  { name: 'Locals', detail: null, price: '$249', date: 'Opens 2 April', live: true },
  { name: 'Local Builders', detail: null, price: '$149', date: 'Opens 2 April', live: true },
  { name: 'Past attendee POAPs', detail: null, price: null, date: 'Opens 1 May', live: false },
  { name: 'Open-source contributors', detail: null, price: null, date: 'Opens 1 May', live: false },
  { name: 'DAO / governance participants', detail: null, price: null, date: 'Opens 1 May', live: false },
  { name: 'Core Devs', detail: null, price: null, date: 'Opens 1 May', live: false },
]

const FAQ_ITEMS = [
  {
    q: 'I plan on bringing my child to Devcon with me. Do they need a ticket?',
    a: 'If your child is between the ages of 5-17, they will need a Youth ticket, which can be purchased at any time at tickets.devcon.org. Children under the age of 5 do not need a ticket. A Youth Ticket will not be valid for anyone 18+.',
  },
  {
    q: 'If I buy a ticket, and then I am accepted for a discount after having bought a full-priced ticket, can I get a refund of the difference?',
    a: 'If I buy a ticket, and then I am accepted to Speak, can I get a refund for my original ticket I purchased?',
  },
  {
    q: 'If I am accepted for a discount after buying a full-priced ticket, can I get a refund of the difference?',
    a: 'Please contact the ticketing team for refund eligibility.',
  },
  {
    q: 'I need a Visa Invitation Letter. How can I obtain one?',
    a: 'Visa invitation letters are available after ticket purchase. Check your confirmation email for details.',
  },
  {
    q: 'When will I get my ticket?',
    a: 'Tickets are delivered electronically after purchase. You will receive a confirmation email with your ticket.',
  },
  {
    q: 'When will General ticket sales start?',
    a: 'General admission waves will be announced. Global Early Bird launches 2 April.',
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: 'Yes. Self-claiming discounts for Indian locals are available now. Additional discount categories open throughout 2026.',
  },
  {
    q: 'Can I purchase tickets with crypto?',
    a: 'Yes. Crypto and fiat payments are accepted, with a 3% discount for crypto payments.',
  },
  {
    q: 'How can I cancel my order?',
    a: 'Please contact the ticketing team for cancellation and refund requests.',
  },
  {
    q: 'What if I only want to cancel some tickets as an order with multiple?',
    a: 'Partial cancellations are possible. Please contact the ticketing team.',
  },
  {
    q: 'Tickets are sold out - How can I attend?',
    a: 'Join the waitlist and follow our social channels for updates on additional ticket releases.',
  },
]

const INCLUDED_ITEMS = [
  ['Full conference access', 'Event swag bag', 'Coffee, tea, lunch & snacks'],
  ['Full conference access', 'Event swag bag', 'Coffee, tea, lunch & snacks'],
]

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export default function TicketsPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  return (
    <Page theme={themes['tickets']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Event</span> }, { text: 'Tickets' }]}
        title="Tickets"
        navigation={NAV_LINKS}
      />

      <div className={css['landing']}>
        {/* Hero: Early Bird */}
        <section id="early-bird" className={css['early-bird-section']}>
          <div className={css['early-bird-content']}>
            <h2>Local Early Bird tickets on sale!</h2>
            <p className={css['early-bird-description']}>
              Join thousands of builders, creators and thinkers gathering in Mumbai for the world&apos;s biggest Ethereum
              conference, 3&ndash;6 November 2026. Secure your ticket early to be part of this pivotal moment in
              Ethereum&apos;s journey.
            </p>
            <p className={css['whats-included']}>What&apos;s included</p>
            <div className={css['included-list']}>
              {INCLUDED_ITEMS.map((row, ri) => (
                <div key={ri} className={css['included-row']}>
                  {row.map((item, ci) => (
                    <div key={ci} className={css['included-item']}>
                      <span className={css['included-dot']} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className={css['early-bird-ctas']}>
              <Link to="/tickets/store" className={css['btn-primary-pill']}>
                Get My ticket
                <ArrowRightIcon />
              </Link>
              <a href="#discounts" className={css['btn-secondary-pill']}>
                View future discounts
                <ChevronDownIcon />
              </a>
            </div>
          </div>
          <div className={css['ticket-stub']}>
            <div className={css['ticket-stub-inner']}>
              <div className={css['ticket-stub-left']}>
                <div className={css['ticket-stub-logo']}>
                  <Image src={DevconLogo} alt="Devcon" height={40} width={120} />
                </div>
                <div className={css['ticket-stub-title']}>Local Early Bird</div>
                <div className={css['ticket-stub-subtitle']}>GENERAL ADMISSION TICKET</div>
                <div className={css['ticket-stub-location']}>
                  <div>
                    <span className={css['ticket-label']}>LOCATION</span>
                    <span className={css['ticket-value']}>Jio World Centre, Mumbai, India</span>
                  </div>
                  <div>
                    <span className={css['ticket-label']}>DATES</span>
                    <span className={css['ticket-value']}>3&ndash;6 NOV 2026</span>
                  </div>
                </div>
              </div>
              <div className={css['ticket-stub-divider']} />
              <div className={css['ticket-stub-right']}>
                <span className={css['ticket-price-label']}>PRICE</span>
                <span className={css['ticket-price']}>$149</span>
                <span className={css['ticket-price-original']}>$249</span>
                <span className={css['ticket-savings']}>Save $100</span>
                <span className={css['ticket-note']}>Ends 31 March</span>
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section id="overview" className={css['overview-section']}>
          <h2>Overview</h2>
          <p className={css['overview-intro']}>
            Tickets to Devcon India will be distributed through three different methods:
          </p>
          <div className={css['overview-cards']}>
            {OVERVIEW_CARDS.map((card) => (
              <div key={card.number} className={css['overview-card']}>
                <span className={css['overview-card-number']}>{card.number}</span>
                <div className={css['overview-card-content']}>
                  <div className={css['overview-card-left']}>
                    <div className={css['overview-card-title']}>{card.title}</div>
                    <div className={css['overview-card-type']}>{card.subtitle}</div>
                  </div>
                  <div className={css['overview-card-right']}>
                    {card.price ? (
                      <div className={css['overview-card-price-wrap']}>
                        {card.originalPrice && (
                          <span className={css['overview-card-price-original']}>{card.originalPrice}</span>
                        )}
                        <span className={css['overview-card-price']}>{card.price}</span>
                      </div>
                    ) : (
                      <div className={css['overview-card-price']}>{card.priceLabel}</div>
                    )}
                    <div className={css['overview-card-status']}>{card.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={css['faq-cta-wrap']}>
            <a href="#faq" className={css['btn-secondary-pill']}>
              Frequently asked questions
              <ChevronDownIcon />
            </a>
          </div>
        </section>

        {/* Sale Waves */}
        <section id="general-admission" className={css['sale-waves-section']}>
          <div>
            <div className={css['section-tag']}>GENERAL ADMISSION</div>
            <h2 className={css['section-heading']}>Sale waves</h2>
            <p className={css['section-body']}>
              General Admission tickets to Devcon will be distributed via waves, beginning with our Global Early Bird
              launch on <strong>2 April</strong>.
            </p>
            <div className={css['social-row']}>
              <a href="#" className={css['btn-secondary-pill']}>
                Subscribe for updates
              </a>
              <div className={css['social-icons']}>
                <a
                  href="https://x.com/EFDevcon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css['social-icon']}
                >
                  <IconX />
                </a>
                <a
                  href="https://www.instagram.com/efdevcon/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css['social-icon']}
                >
                  <IconInstagram />
                </a>
                <a
                  href="https://warpcast.com/devcon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css['social-icon']}
                >
                  <IconFarcaster />
                </a>
              </div>
            </div>
          </div>
          <div className={css['waves-list']}>
            <div className={css['waves-list-header']}>
              <div>
                <div className={css['waves-list-title']}>Wave structure</div>
                <div className={css['waves-list-subtitle']}>GENERAL ADMISSION</div>
              </div>
              <span className={css['live-badge']}>LIVE</span>
            </div>
            <div className={css['table-body']}>
              {WAVES.map((row) => (
                <div key={row.name} className={css['table-row']}>
                  <span className={css['table-name']}>{row.name}</span>
                  <div className={css['table-meta']}>
                    {row.live && <span className={css['live-badge-sm']}>LIVE</span>}
                    <span className={css['table-price']}>{row.price}</span>
                    <span className={css['table-date']}>{row.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Self-Claiming */}
        <section id="discounts" className={css['self-claiming-section']}>
          <div>
            <div className={css['section-tag']}>DISCOUNTS</div>
            <h2 className={css['section-heading']}>Self-claiming</h2>
            <p className={css['section-body']}>
              Our early bird discounts for <strong>Indian locals</strong> are now live! Verify Indian residency via
              AnonAadhaar to purchase.
            </p>
            <Link to="/tickets/store#discounts" className={css['btn-primary-pill']}>
              Check my eligibility
              <ArrowRightIcon />
            </Link>
          </div>
          <div className={css['self-claiming-list']}>
            <div className={css['self-claiming-header']}>
              <div>
                <div className={css['self-claiming-title']}>Self-claiming</div>
                <div className={css['self-claiming-subtitle']}>DISCOUNTS</div>
              </div>
              <span className={css['live-badge']}>LIVE</span>
            </div>
            <div className={css['table-body']}>
              {SELF_CLAIMING.map((row) => (
                <div key={row.name} className={css['table-row']}>
                  <div className={css['table-name-group']}>
                    <span className={css['table-name']}>{row.name}</span>
                    {row.detail && <span className={css['table-detail']}>{row.detail}</span>}
                  </div>
                  <div className={css['table-meta']}>
                    {row.live && <span className={css['live-badge-sm']}>LIVE</span>}
                    {row.price && <span className={css['table-price']}>{row.price}</span>}
                    <span className={css['table-date']}>{row.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={css['faq-section']}>
          <div className={css['faq-image']}>
            <div className={css['faq-image-placeholder']} />
          </div>
          <div className={css['faq-content']}>
            <h2>FAQ</h2>
            <div className={css['faq-list']}>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={css['faq-item']}>
                  <button
                    type="button"
                    className={`${css['faq-question']} ${openFaqIndex === i ? css['open'] : ''}`}
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    aria-expanded={openFaqIndex === i}
                  >
                    <span>{item.q}</span>
                    <span className={css['faq-chevron']}>
                      <ChevronRightIcon />
                    </span>
                  </button>
                  {openFaqIndex === i && <p className={css['faq-answer']}>{item.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
