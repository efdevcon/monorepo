import React, { useState } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { Ticket, Shirt, Coffee, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconFarcaster from 'assets/icons/farcaster.svg'
import themes from '../themes.module.scss'
import HeroBackground from './updated-hero.png'
import EarlyBirdTicket from './early-bird-india.png'
import EarlyBirdMobile from './early-bird-mobile.png'
import css from './tickets-landing.module.scss'
import cn from 'classnames'

const NAV_LINKS = [
  { title: 'Overview', to: '#overview' },
  { title: 'General Admission', to: '#general-admission' },
  { title: 'Discounts', to: '#discounts' },
  { title: 'Applications', to: '#applications' },
  { title: 'FAQ', to: '#faq' },
].map(link => ({ ...link, title: link.title.toUpperCase() }))

const OVERVIEW_CARDS = [
  {
    number: '01',
    title: 'Sale waves',
    subtitle: 'GENERAL ADMISSION',
    price: null,
    priceLabel: 'Coming soon',
    status: 'TBD',
  },
  {
    number: '02',
    title: 'Community',
    subtitle: 'SELF-CLAIMING DISCOUNTS',
    price: '$99',
    priceLabel: null,
    status: 'AVAILABLE NOW',
  },
  {
    number: '03',
    title: 'Applications',
    subtitle: 'REVIEW-BASED DISCOUNTS',
    price: null,
    priceLabel: 'Coming soon',
    status: 'TBD',
  },
]

const WAVES = [
  { name: 'Global Early Bird', price: '$299', date: 'TBD' },
  // { name: 'Waves 1-4', price: 'TBD', date: 'TBD' },
  // { name: 'Waves 5-8', price: 'TBD', date: 'TBD' },
  // { name: 'Waves 9-10', price: 'TBD', date: 'TBD' },
]

const COMMUNITY_ROWS = [
  { name: 'Indian Early Bird', detail: 'VIA SELF', price: '$99', date: 'Ends 15 Mar', live: true, bold: true },
  { name: 'India Residents', detail: 'VIA SELF', price: '$149', date: 'TBD', live: false, bold: false },
  // { name: 'Past Attendee POAPs', detail: null, price: null, date: 'Opens 4 May', live: false, bold: false },
  // { name: 'Open-Source Contributors', detail: null, price: null, date: 'Opens 4 May', live: false, bold: false },
  // { name: 'Core Devs', detail: null, price: null, date: 'Opens 4 May', live: false, bold: false },
]

const APPLICATION_ROWS = [
  { name: 'Students (Limited)', price: '$25', date: 'TBD' },
  { name: 'Builders', price: 'from $299', date: 'TBD' },
]

const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'When will General ticket sales start?',
    a: <em>General Admission ticket sales for Devcon India will launch in early May. Stay tuned for updates as we get closer to this date.</em>,
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: (
      <>
        <p>Yes! There will be multiple ways to obtain discounted tickets this year:</p>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
          <li>
            <strong>Community Discounts</strong> — This will consist of groups like Protocol Guild members, OSS
            Contributors and more.
          </li>
          <li>
            <strong>Applications</strong> — <em>This will include Builder Discounts, Student Discounts, and Youth Tickets
            for those under 18.</em>
          </li>
          <li>
            <strong>Ecosystem Tickets</strong> — <em>An application will be open for leaders & organizers of various web2
            & web3 communities or meetups to apply for free or discounted tickets for their groups.</em>
          </li>
        </ul>
      </>
    ),
  },
  {
    q: 'Can I purchase tickets with crypto?',
    a: 'Yes! You will be able to choose between Credit Card or Crypto to pay for your ticket. Orders paid in Crypto receive a 3% discount on the total cost.',
  },
]

const FAQ_INITIAL_COUNT = 6

export default function TicketsPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const visibleFaq = FAQ_ITEMS

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title="Tickets"
        navigation={NAV_LINKS}
      />

      <div className={cn(css['landing'], 'section')}>
        <div className="flex flex-col gap-8 md:gap-16">
          {/* ── Hero Content ─────────────────────────────────────── */}
          <section className={css['hero-content-section']}>
            <div className={css['hero-left']}>
              <div className={css['hero-text']}>
                <h2 className={css['heading-2']}>Indian Early Bird tickets on sale!</h2>
                <p className={css['body-lg']}>
                  Join thousands of builders, creators, researchers, designers and thinkers 3&ndash;6 November 2026 in
                  Mumbai for the world&apos;s biggest Ethereum conference.
                </p>
                <p className={css['body']}>
                  Secure your ticket early to be part of this pivotal moment in Ethereum&apos;s journey.
                </p>
              </div>

              <div className={css['included-section']}>
                <p className={css['included-label']}>WHAT&apos;S INCLUDED</p>
                <div className={css['included-items']}>
                  <div className={css['included-item']}>
                    <Ticket size={24} strokeWidth={1.5} />
                    <span>Full conference access</span>
                  </div>
                  <div className={css['included-item']}>
                    <Shirt size={24} strokeWidth={1.5} />
                    <span>Event swag</span>
                  </div>
                  <div className={css['included-item']}>
                    <Coffee size={24} strokeWidth={1.5} />
                    <span>Catering all week</span>
                  </div>
                </div>
              </div>

              <div className={css['cta-group']}>
                <Link to="/tickets/store" className={css['btn-primary']}>
                  Get my tickets
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
                <Link to="#discounts" className={css['btn-secondary']}>
                  View future discounts
                  <ChevronDown size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>

            <div className={css['ticket-image-wrapper']}>
              <Image
                src={EarlyBirdTicket}
                alt="Indian Early Bird Ticket"
                className={cn(css['ticket-image'], css['ticket-image-desktop'])}
              />
              <Image
                src={EarlyBirdMobile}
                alt="Indian Early Bird Ticket"
                className={cn(css['ticket-image'], css['ticket-image-mobile'])}
              />
            </div>
          </section>

          <hr className={css['divider']} />

          {/* ── Overview ─────────────────────────────────────────── */}
          <section id="overview" className={css['overview-section']}>
            <h2 className={css['heading-2-center']}>Overview</h2>
            <p className={css['body-center']}>
              Tickets to Devcon India will be distributed through three different methods:
            </p>

            <div className={css['overview-cards']}>
              {OVERVIEW_CARDS.map(card => (
                <div key={card.number} className={css['overview-card']}>
                  <span className={css['overview-card-number']}>{card.number}</span>
                  <div className={css['overview-card-content']}>
                    <div className={css['overview-card-left']}>
                      <div className={css['overview-card-title']}>{card.title}</div>
                      <div className={css['overview-card-subtitle']}>{card.subtitle}</div>
                    </div>
                    <div className={css['overview-card-right']}>
                      <div className={css['overview-card-price']}>{card.price || card.priceLabel}</div>
                      <div className={css['overview-card-status']}>{card.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link to="#faq" className={css['btn-secondary']}>
              View FAQ
              <ChevronDown size={16} strokeWidth={2} />
            </Link>
          </section>

          <hr className={css['divider']} />

          {/* ── Sale Waves ───────────────────────────────────────── */}
          <section id="general-admission" className={css['two-col-section']}>
            <div className={css['section-left']}>
              <div className={css['section-text']}>
                <p className={css['section-tag']}>GENERAL ADMISSION</p>
                <h2 className={css['heading-2']}>Sale waves</h2>
                <p className={css['body-lg']}>
                  General Admission tickets to Devcon will be distributed via waves, beginning with our Global Early
                  Bird launch later this year.
                </p>
                <p className={css['body']}>
                  Sale waves are <strong>limited time windows</strong> to purchase a general admission Devcon India
                  ticket. Follow us on socials or subscribe to our newsletter to stay updated!
                </p>
              </div>

              <div className={css['social-row']}>
                <a href="https://paragraph.com/@efevents/subscribe" className={css['btn-secondary']}>
                  Subscribe for updates
                </a>
                <div className={css['social-icons']}>
                  <a
                    href="https://x.com/EFDevcon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css['social-icon-btn']}
                  >
                    <IconX />
                  </a>
                  <a
                    href="https://www.instagram.com/efdevcon/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css['social-icon-btn']}
                  >
                    <IconInstagram />
                  </a>
                  <a
                    href="https://farcaster.xyz/~/channel/devcon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css['social-icon-btn']}
                  >
                    <IconFarcaster />
                  </a>
                </div>
              </div>
            </div>

            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>Sale waves</span>
                <span className={css['ticket-type-status']}>COMING SOON!</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {WAVES.map(row => (
                  <div key={row.name} className={css['ticket-type-row']}>
                    <span className={css['row-name']}>{row.name}</span>
                    <div className={css['row-meta']}>
                      <span className={css['row-price']}>{row.price}</span>
                      <span className={css['row-date']}>{row.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <hr className={css['divider']} />

          {/* ── Community (Self-Claiming Discounts) ──────────────── */}
          <section id="discounts" className={css['two-col-section']}>
            <div className={css['section-left']}>
              <div className={css['section-text']}>
                <p className={css['section-tag']}>SELF-CLAIMING DISCOUNTS</p>
                <h2 className={css['heading-2']}>Community</h2>
                <p className={css['body-lg']}>
                  Our early bird discounts for <strong>Indian locals</strong> are now live. Verify Indian residency via
                  Self to purchase.
                </p>
                <p className={css['body']}>
                  Community tickets are <strong>self-claimable</strong> &ndash; no application required, just verify
                  your eligibility and purchase directly. Tickets are <strong>non-transferable</strong> and{' '}
                  <strong>limited</strong>.
                </p>
              </div>
              <Link to="/tickets/store#discounts" className={css['btn-primary']}>
                Check my eligibility
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>

            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>Community</span>
                <span className={css['ticket-type-status']}>AVAILABLE NOW</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {COMMUNITY_ROWS.map(row => (
                  <div key={row.name} className={cn(css['ticket-type-row'], row.bold && css['row-bold'])}>
                    <div className={css['row-name-group']}>
                      <span className={css['row-name']}>{row.name}</span>
                      {row.detail && <span className={css['row-detail']}>{row.detail}</span>}
                    </div>
                    <div className={css['row-meta']}>
                      {row.live && <span className={css['live-badge']}>LIVE</span>}
                      {row.price && <span className={css['row-price']}>{row.price}</span>}
                      <span className={css['row-date']}>{row.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <hr className={css['divider']} />

          {/* ── Applications (Review-Based Discounts) ────────────── */}
          <section id="applications" className={css['two-col-section']}>
            <div className={css['section-left']}>
              <div className={css['section-text']}>
                <p className={css['section-tag']}>REVIEW-BASED DISCOUNTS</p>
                <h2 className={css['heading-2']}>Applications</h2>
                <p className={css['body-lg']}>
                  Ticket support is intended to <strong>enable participation at Devcon</strong>, reward meaningful
                  contributions, and support initiatives with clear ecosystem impact.
                </p>
                <p className={css['body']}>
                  All ticket applications are <strong>curated and limited per round</strong>. Discounted prices will
                  increase over time. Applying earlier gives access to <strong>lower price tiers</strong>, subject to
                  availability and review.
                </p>
              </div>
              {/* <a href="/esp" className={css['btn-secondary']}>
                Learn more
              </a> */}
            </div>

            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>Applications</span>
                <span className={css['ticket-type-status']}>COMING SOON!</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {APPLICATION_ROWS.map(row => (
                  <div key={row.name} className={css['ticket-type-row']}>
                    <span className={css['row-name']}>{row.name}</span>
                    <div className={css['row-meta']}>
                      <span className={css['row-price']}>{row.price}</span>
                      <span className={css['row-date']}>{row.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <hr className={css['divider']} />

          {/* ── FAQ ──────────────────────────────────────────────── */}
          <section id="faq" className={css['faq-section']}>
            <div className={css['faq-image']}>
              <Image src={HeroBackground} alt="" className={css['faq-bg-image']} />
              <span className={css['faq-image-text']}>Tickets</span>
            </div>
            <div className={css['faq-right']}>
              <h2 className={css['heading-2']}>Frequently asked questions</h2>
              <div className={css['faq-and-cta']}>
                <div className={css['faq-accordion']}>
                  {visibleFaq.map((item, i) => (
                    <div key={i} className={css['faq-item']}>
                      <button
                        type="button"
                        className={cn(css['faq-trigger'], openFaqIndex === i && css['faq-trigger-open'])}
                        onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                        aria-expanded={openFaqIndex === i}
                      >
                        <span>{item.q}</span>
                        {openFaqIndex === i ? (
                          <ChevronUp size={16} strokeWidth={2} className={css['faq-chevron']} />
                        ) : (
                          <ChevronDown size={16} strokeWidth={2} className={css['faq-chevron']} />
                        )}
                      </button>
                      <div className={cn(css['faq-answer-wrap'], openFaqIndex === i && css['faq-answer-open'])}>
                        <div className={css['faq-answer-inner']}>
                          <div className={css['faq-answer']}>{item.a}</div>
                        </div>
                      </div>
                      {i < visibleFaq.length - 1 && <div className={css['faq-border']} />}
                    </div>
                  ))}
                </div>
                {/* View all button hidden while FAQ has few entries
                {!showAllFaq && (
                  <button type="button" className={css['btn-secondary']} onClick={() => setShowAllFaq(true)}>
                    View all <span className={css['view-all-count']}>({FAQ_ITEMS.length})</span>
                  </button>
                )}
                */}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
