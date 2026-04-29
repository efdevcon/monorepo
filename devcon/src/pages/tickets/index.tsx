import React, { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { Ticket, Shirt, Coffee, ChevronDown, ArrowRight } from 'lucide-react'
import { Faq, FAQ_ITEMS, type FaqItem } from 'components/common/faq'
import { BloomingEthFlower } from 'components/domain/landing-page/BloomingEthFlower'
import { getFaqData } from 'services/faq'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconFarcaster from 'assets/icons/farcaster.svg'
import themes from '../themes.module.scss'
import HeroBackground from './updated-hero.png'
import EarlyBirdTicket from './big-ticket.png'
import EarlyBirdMobile from './small-ticket.png'
import ArtOverlayBg from './tickets-art-overlay-bg.png'
import ArtOverlayText from 'assets/images/pages/tickets-art-overlay-text.svg'
import css from './tickets-landing.module.scss'
import cn from 'classnames'

const TICKETS_FAQ_CATEGORY = 'Tickets & availability'
const TICKETS_FAQ_LIMIT = 7

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
    price: null,
    priceLabel: 'Coming soon',
    status: 'TBD',
  },
  {
    number: '03',
    title: 'Applications',
    subtitle: 'REVIEW-BASED DISCOUNTS',
    price: null,
    priceLabel: 'from $25',
    status: 'AVAILABLE NOW',
    live: true,
  },
]

const WAVES = [
  { name: 'Global Early Bird', price: '$299', date: 'Opens in May' },
  { name: 'Waves 1-10', price: 'TBD', date: 'TBD' },
]

const COMMUNITY_ROWS = [
  { name: 'India Residents', detail: 'VIA SELF PROTOCOL', price: '$149', date: 'Opens in May', live: false, bold: false },
  // { name: 'Past Attendee POAPs', detail: null, price: null, date: 'Opens 4 May', live: false, bold: false },
  // { name: 'Open-Source Contributors', detail: null, price: null, date: 'Opens 4 May', live: false, bold: false },
  // { name: 'Core Devs', detail: null, price: null, date: 'Opens 4 May', live: false, bold: false },
]

interface ApplicationRow {
  id: string
  name: string
  price: string
  date?: string
  applyUrl?: string
  live: boolean
  criteria?: React.ReactNode
}

const STUDENT_CRITERIA = (
  <>
    <p>
      <strong>All applicants should meet the following criteria:</strong>
    </p>
    <ul>
      <li>
        Currently enrolled in an <strong>accredited university degree program</strong> (Bachelor, Master, or PhD)
      </li>
      <li>
        Studying fields such as computer science, engineering, mathematics, economics, law, governance, public policy,
        or other relevant disciplines
      </li>
      <li>
        Students contributing to research, open-source projects, or academic work related to blockchain, cryptography,
        governance, or digital public infrastructure
      </li>
      <li>
        Students involved in university research groups, blockchain clubs, policy initiatives, or developer communities
      </li>
      <li>Students with a demonstrated interest in Ethereum and open technologies</li>
    </ul>
    <p>
      <strong>Please note:</strong> Short-term courses, bootcamps, and online-only programs are not eligible.
    </p>
  </>
)

const APPLICATION_ROWS: ApplicationRow[] = [
  {
    id: 'indian-students',
    name: 'Indian Students',
    price: '$25',
    applyUrl: '/form/student-application',
    live: true,
    criteria: STUDENT_CRITERIA,
  },
  {
    id: 'international-students',
    name: 'International Students',
    price: '$99',
    applyUrl: '/form/student-application',
    live: true,
    criteria: STUDENT_CRITERIA,
  },
  {
    id: 'builders',
    name: 'Builders',
    price: 'from $299',
    date: 'Opens in June',
    live: false,
  },
]

function ApplicationRowItem({
  row,
  isOpen,
  onToggle,
}: {
  row: ApplicationRow
  isOpen: boolean
  onToggle: () => void
}) {
  const isExpandable = !!row.criteria

  return (
    <div
      className={cn(css['ticket-type-row-expandable'], {
        [css['ticket-type-row-expanded']]: isExpandable && isOpen,
        [css['ticket-type-row-clickable']]: isExpandable,
      })}
      onClick={isExpandable ? onToggle : undefined}
      role={isExpandable ? 'button' : undefined}
      tabIndex={isExpandable ? 0 : undefined}
      onKeyDown={
        isExpandable
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle()
              }
            }
          : undefined
      }
    >
      <div className={css['ticket-type-row-main']}>
        <span className={cn(css['row-name'], { [css['row-name-bold']]: row.live })}>{row.name}</span>
        <div className={css['row-meta']}>
          {row.live && <span className={css['row-live-badge']}>LIVE</span>}
          <span className={cn(css['row-price'], { [css['row-price-bold']]: row.live })}>{row.price}</span>
          {row.live && row.applyUrl ? (
            <Link
              to={row.applyUrl}
              className={css['row-apply']}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              Apply
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          ) : (
            <span className={css['row-date']}>{row.date}</span>
          )}
        </div>
      </div>
      {isExpandable && isOpen && (
        <>
          <hr className={css['row-divider']} />
          <div className={css['row-criteria']}>{row.criteria}</div>
        </>
      )}
    </div>
  )
}

interface TicketsPageProps {
  faqItems?: Array<{ question: string; answer: string }>
}

export default function TicketsPage({ faqItems }: TicketsPageProps = {}) {
  const resolvedFaqItems: FaqItem[] = faqItems && faqItems.length > 0
    ? faqItems.map(i => ({ q: i.question, a: <ReactMarkdown>{i.answer}</ReactMarkdown> }))
    : FAQ_ITEMS
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null)
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
                <h2 className={css['heading-2']}>Student applications now live!</h2>
                <p className={css['body-lg']}>
                  The world&apos;s biggest Ethereum conference returns &ndash; thousands of Students can join us in
                  Mumbai, India from 3&ndash;6 November 2026.
                </p>
                <p className={css['body']}>
                  Not a student? Follow us or subscribe to our newsletter to be the first to hear about our global
                  ticket launch (hint: it&apos;s in May)
                </p>
              </div>

              <div className={css['included-section']}>
                <p className={css['included-label']}>INCLUDED IN TICKET</p>
                <div className={css['included-items']}>
                  <div className={css['included-item']}>
                    <Ticket size={24} strokeWidth={1.5} />
                    <span>Full 4-day conference access</span>
                  </div>
                  <div className={css['included-item']}>
                    <Shirt size={24} strokeWidth={1.5} />
                    <span>Event swag</span>
                  </div>
                  <div className={css['included-item']}>
                    <Coffee size={24} strokeWidth={1.5} />
                    <span>Lunch all week</span>
                  </div>
                </div>
              </div>

              <div className={css['cta-group']}>
                <Link to="/tickets/store" className={css['btn-primary']}>
                  Learn more
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <a href="https://paragraph.com/@efevents" className={css['btn-secondary']}>
                  Subscribe
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
                      <div
                        className={cn(css['overview-card-status'], { [css['overview-card-status-live']]: card.live })}
                      >
                        {card.status}
                      </div>
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
                  Bird launch in May.
                </p>
                <p className={css['body']}>
                  Sale waves are <strong>limited time windows</strong> to purchase a general admission Devcon India
                  ticket. Follow us on socials or subscribe to our newsletter to stay updated!
                </p>
              </div>

              <div className={css['social-row']}>
                <a href="https://paragraph.com/@efevents" className={css['btn-secondary']}>
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
                  Our <strong>Early Access vouchers for Indian residents</strong> have now ended. Thank you to everyone
                  who reserved their place at Devcon.
                </p>
                <p className={css['body']}>
                  Community tickets are <strong>self-claimable</strong> &ndash; no application required, just verify
                  your eligibility and purchase directly. Tickets are <strong>non-transferable</strong> and{' '}
                  <strong>limited</strong>.
                </p>
              </div>
            </div>

            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>Community</span>
                <span className={css['ticket-type-status']}>COMING SOON!</span>
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
                  <strong>Local</strong> and <strong>International student</strong> applications are now open! Supply is
                  limited so apply early to secure your Devcon ticket.
                </p>
                <p className={css['body']}>
                  All ticket applications are <strong>curated</strong> and <strong>limited per round</strong>. Applying
                  earlier gives access to <strong>lower price tiers</strong>, subject to availability and review.
                </p>
              </div>
              <Link to="/tickets/store" className={css['btn-primary']}>
                Learn more
                <ChevronDown size={16} strokeWidth={2} style={{ transform: 'rotate(-90deg)' }} />
              </Link>
            </div>

            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>Applications</span>
                <span className={css['ticket-type-status-live']}>AVAILABLE NOW</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {APPLICATION_ROWS.map(row => (
                  <ApplicationRowItem
                    key={row.id}
                    row={row}
                    isOpen={expandedApplicationId === row.id}
                    onToggle={() =>
                      setExpandedApplicationId(prev => (prev === row.id ? null : row.id))
                    }
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Art with Text Overlay ─────────────────────────────── */}
      <section className={css['art-overlay']}>
        <Image src={ArtOverlayBg} alt="" className={css['art-overlay-bg']} fill sizes="100vw" />
        <div className={css['art-overlay-inner']}>
          <div className={css['art-overlay-text']} aria-label="Tickets">
            <ArtOverlayText />
          </div>
        </div>
      </section>

      <div className={cn(css['landing'], 'section')}>
        <div className="flex flex-col gap-8 md:gap-16">
          {/* ── FAQ ──────────────────────────────────────────────── */}
          <section id="faq" className={css['faq-section-vertical']}>
            <h2 className={css['faq-section-heading']}>Frequently asked questions</h2>
            <div className={css['faq-section-content']}>
              <Faq items={resolvedFaqItems} />
              <Link to="/tickets/faq" className={cn(css['btn-secondary'], css['btn-secondary-centered'])}>
                View all FAQs
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
            <BloomingEthFlower className={css['faq-flower']} />
          </section>
        </div>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  let faqItems: Array<{ question: string; answer: string }> = []
  try {
    const data = await getFaqData()
    faqItems = data.items
      .filter(i => i.category === TICKETS_FAQ_CATEGORY && i.answer.trim() !== '')
      .slice(0, TICKETS_FAQ_LIMIT)
      .map(i => ({ question: i.question, answer: i.answer }))
  } catch {
    // Fall back to empty list — TicketsPage renders hardcoded FAQ_ITEMS instead
  }

  return {
    props: { faqItems },
    revalidate: 60,
  }
}
