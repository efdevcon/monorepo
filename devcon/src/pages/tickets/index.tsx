import React, { useState } from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import themes from '../themes.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/ticketing.jpeg'
import css from './tickets-landing.module.scss'

const NAV_LINKS = [
  { title: 'Early Bird', to: '#early-bird' },
  { title: 'Overview', to: '#overview' },
  { title: 'General admission', to: '#general-admission' },
  { title: 'Discounts', to: '#discounts' },
  { title: 'FAQ', to: '#faq' },
]

const WAVES = [
  { name: 'Initial Early Bird', price: null, end: 'Ended 30 September' },
  { name: 'Global Early Bird', price: '$399', end: 'Ends 30 April' },
  { name: 'Waves 1-4', price: '$599', end: 'TBD' },
  { name: 'Waves 5-8', price: '$799', end: 'TBD' },
  { name: 'Waves 9-10', price: '$999', end: 'TBD' },
]

const SELF_CLAIMING = [
  { name: 'Non-locals', status: '$99' },
  { name: 'Local Builders', status: 'Open 1 May' },
  { name: 'Past attendee POWs', status: 'Open 1 May' },
  { name: 'Open source contributors', status: 'Open 1 May' },
  { name: 'DAO/governance participants', status: 'Open 1 May' },
  { name: 'Core Devs', status: 'Open 1 May' },
]

const FAQ_ITEMS = [
  {
    q: 'Can I plan on bringing my child to Devcon with me? Do they need a ticket?',
    a: 'Youth tickets (ages 5-17) are available. Children under 5 do not need a ticket.',
  },
  {
    q: 'If I buy a ticket, and then I am accepted for a discount after having bought a full-priced ticket, can I get a refund of the difference?',
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
    a: 'Early Bird tickets are on sale now. General admission waves will be announced.',
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: 'Yes. Self-claiming discounts for Indian locals are available. Additional discount categories open 1 May.',
  },
  {
    q: 'Can I purchase tickets with crypto?',
    a: 'Yes. Crypto and fiat payments are accepted via our payment provider, with a 5% discount for crypto/fiat payments.',
  },
]

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
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
        <section id="early-bird" className={css['early-bird-section']}>
          <div className={css['early-bird-content']}>
            <h2>Early Bird tickets on sale!</h2>
            <p className={css['early-bird-description']}>
              Be one of the first to secure your Devcon India ticket. Join builders, creators, and thinkers in Mumbai,
              3-6 November 2026.
            </p>
            <p className={css['whats-included']}>What's included</p>
            <ul className={css['included-list']}>
              <li>Full conference access</li>
              <li>Event swag bag</li>
              <li>Coffee, tea, lunch & snacks</li>
              <li>Access to all sessions</li>
              <li>Networking events</li>
              <li>Devcon India experience</li>
            </ul>
            <div className={css['early-bird-ctas']}>
              <Link to="/tickets/store" className={css['btn-primary']}>
                Get Early Bird Ticket
              </Link>
              <Link to="#discounts" className={css['btn-secondary']}>
                View Discounts
                <ChevronDownIcon />
              </Link>
            </div>
          </div>
          <div className={css['ticket-stub']}>
            <div className={css['ticket-stub-logo']}>DEVCON</div>
            <div className={css['ticket-stub-title']}>Early Bird Ticket</div>
            <div className={css['ticket-stub-subtitle']}>GENERAL ADMISSION.</div>
            <div className={css['ticket-stub-price']}>$349</div>
            <div className={css['ticket-stub-currency']}>USD</div>
            <div className={css['ticket-stub-venue']}>JIO WORLD CONVENTION CENTRE, MUMBAI, INDIA</div>
            <div className={css['ticket-stub-dates']}>3-6 NOV 2026</div>
          </div>
        </section>

        <section id="overview" className={css['overview-section']}>
          <h2>Overview</h2>
          <p className={css['overview-intro']}>
            Tickets to Devcon India will be distributed through three different methods.
          </p>
          <div className={css['overview-cards']}>
            <div className={css['overview-card']}>
              <div className={css['overview-card-title']}>Sale waves</div>
              <div className={css['overview-card-type']}>GENERAL ADMISSION</div>
              <div className={css['overview-card-price']}>$349</div>
              <div className={css['overview-card-status']}>AVAILABLE NOW</div>
            </div>
            <div className={css['overview-card']}>
              <div className={css['overview-card-title']}>Self-claiming</div>
              <div className={css['overview-card-type']}>DISCOUNTS</div>
              <div className={css['overview-card-price']}>$99</div>
              <div className={css['overview-card-status']}>AVAILABLE NOW</div>
            </div>
            <div className={css['overview-card']}>
              <div className={css['overview-card-title']}>Applications</div>
              <div className={css['overview-card-type']}>DISCOUNTS</div>
              <div className={css['overview-card-price']}>—</div>
              <div className={css['overview-card-status']}>COMING SOON</div>
            </div>
          </div>
          <div className={css['faq-cta-wrap']}>
            <Link to="#faq" className={css['btn-secondary']}>
              + Frequently asked questions
            </Link>
          </div>
        </section>

        <section id="general-admission" className={css['sale-waves-section']}>
          <div>
            <p className={css['section-subtitle']}>GENERAL ADMISSION.</p>
            <h2 className={css['section-heading']}>Sale waves.</h2>
            <p className={css['section-body']}>
              General Admission Early Bird tickets are live for Devcon India in Mumbai, 3-6 November 2026. A 5% discount
              applies for crypto/fiat payments via Stripe.
            </p>
            <Link to="/tickets/store" className={css['btn-primary']}>
              + Get Early Bird Ticket
            </Link>
          </div>
          <div className={css['waves-list']}>
            <div className={css['waves-list-header']}>
              <div>
                <div className={css['waves-list-title']}>Waves</div>
                <div className={css['waves-list-subtitle']}>GENERAL ADMISSION.</div>
              </div>
              <button type="button" className={css['list-btn']}>
                LIST
              </button>
            </div>
            {WAVES.map(row => (
              <div key={row.name} className={css['wave-row']}>
                <span className={css['wave-name']}>{row.name}</span>
                <span className={css['wave-price']}>{row.price != null ? `${row.price} · ${row.end}` : row.end}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="discounts" className={css['self-claiming-section']}>
          <div>
            <p className={css['section-subtitle']}>DISCOUNTS.</p>
            <h2 className={css['section-heading']}>Self-claiming.</h2>
            <p className={css['section-body']}>Our self-claiming discounts for Indian locals are now live!</p>
            <Link to="/tickets/store#discounts" className={css['btn-eligibility']}>
              Check my eligibility
              <ChevronRightIcon />
            </Link>
          </div>
          <div className={css['self-claiming-list']}>
            <div className={css['self-claiming-header']}>
              <div>
                <div className={css['self-claiming-title']}>Self-claiming</div>
                <div className={css['self-claiming-subtitle']}>DISCOUNTS.</div>
              </div>
              <button type="button" className={css['list-btn']}>
                LIST
              </button>
            </div>
            {SELF_CLAIMING.map(row => (
              <div key={row.name} className={css['claim-row']}>
                <span className={css['claim-name']}>{row.name}</span>
                <span className={css['claim-status']}>{row.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className={css['faq-section']}>
          <h2>FAQ.</h2>
          <ul className={css['faq-list']}>
            {FAQ_ITEMS.map((item, i) => (
              <li key={i} className={css['faq-item']}>
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
              </li>
            ))}
          </ul>
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
