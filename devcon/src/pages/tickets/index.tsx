import React, { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { Ticket, Shirt, Coffee, ChevronDown, ArrowRight } from 'lucide-react'
import { Faq, type FaqItem } from 'components/common/faq'
import { BloomingEthFlower } from 'components/domain/landing-page/BloomingEthFlower'
import { getFaqData } from 'services/faq'
import { getMessages } from 'utils/intl'
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
import { useTranslations } from 'next-intl'

const TICKETS_FAQ_CATEGORIES = ['Tickets & availability', 'Pricing & discounts']
const TICKETS_FAQ_PER_CATEGORY = 4

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
    price: 'TBD',
    date: 'Opens in June',
    live: false,
  },
]

function ApplicationRowItem({
  row,
  isOpen,
  onToggle,
  applyLabel,
}: {
  row: ApplicationRow
  isOpen: boolean
  onToggle: () => void
  applyLabel: string
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
            <Link to={row.applyUrl} className={css['row-apply']} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              {applyLabel}
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
  const t = useTranslations('tickets')
  const tFaq = useTranslations('home.faq')

  const navLinks = [
    { title: t('nav.overview'), to: '#overview' },
    { title: t('nav.general_admission'), to: '#general-admission' },
    { title: t('nav.discounts'), to: '#discounts' },
    { title: t('nav.applications'), to: '#applications' },
    { title: t('nav.faq'), to: '#faq' },
  ]

  const overviewCards = t.raw('overview.cards') as Array<{
    number: string
    title: string
    subtitle: string
    price_label: string
    status: string
    live?: boolean
    price?: string
  }>
  const waves = t.raw('sale_waves.rows') as Array<{ name: string; price: string; date: string }>
  const communityRows = t.raw('community.rows') as Array<{ name: string; detail?: string; price: string; date: string }>

  const resolvedFaqItems: FaqItem[] =
    faqItems && faqItems.length > 0
      ? faqItems.map(i => ({ q: i.question, a: <ReactMarkdown>{i.answer}</ReactMarkdown> }))
      : [
          { q: tFaq('item_1.q'), a: tFaq('item_1.a') },
          {
            q: tFaq('item_2.q'),
            a: (
              <>
                <p>{tFaq('item_2.a_intro')}</p>
                <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
                  <li>
                    <strong>{tFaq('item_2.community_h')}</strong> — {tFaq('item_2.community_b')}
                  </li>
                  <li>
                    <strong>{tFaq('item_2.applications_h')}</strong> — <em>{tFaq('item_2.applications_b')}</em>
                  </li>
                  <li>
                    <strong>{tFaq('item_2.ecosystem_h')}</strong> — <em>{tFaq('item_2.ecosystem_b')}</em>
                  </li>
                </ul>
              </>
            ),
          },
          { q: tFaq('item_3.q'), a: tFaq('item_3.a') },
        ]
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null)

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('title')}
        navigation={navLinks}
      />

      <div className={cn(css['landing'], 'section')}>
        <div className="flex flex-col gap-8 md:gap-16">
          {/* ── Hero Content ─────────────────────────────────────── */}
          <section className={css['hero-content-section']}>
            <div className={css['hero-left']}>
              <div className={css['hero-text']}>
                <h2 className={css['heading-2']}>{t('hero.heading')}</h2>
                <p className={css['body-lg']}>{t('hero.body_lg')}</p>
                <p className={css['body']}>{t('hero.body')}</p>
              </div>

              <div className={css['included-section']}>
                <p className={css['included-label']}>{t('hero.included_label')}</p>
                <div className={css['included-items']}>
                  <div className={css['included-item']}>
                    <Ticket size={24} strokeWidth={1.5} />
                    <span>{t('hero.included_conference')}</span>
                  </div>
                  <div className={css['included-item']}>
                    <Shirt size={24} strokeWidth={1.5} />
                    <span>{t('hero.included_swag')}</span>
                  </div>
                  <div className={css['included-item']}>
                    <Coffee size={24} strokeWidth={1.5} />
                    <span>{t('hero.included_lunch')}</span>
                  </div>
                </div>
              </div>

              <div className={css['cta-group']}>
                <Link to="/tickets/store" className={css['btn-primary']}>
                  Learn more
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <a href="https://paragraph.com/@efevents" className={css['btn-secondary']}>
                  {t('hero.subscribe_button')}
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
                alt={t('hero.ticket_alt')}
                className={cn(css['ticket-image'], css['ticket-image-desktop'])}
              />
              <Image
                src={EarlyBirdMobile}
                alt={t('hero.ticket_alt')}
                className={cn(css['ticket-image'], css['ticket-image-mobile'])}
              />
            </div>
          </section>

          <hr className={css['divider']} />

          {/* ── Overview ─────────────────────────────────────────── */}
          <section id="overview" className={css['overview-section']}>
            <h2 className={css['heading-2-center']}>{t('overview.heading')}</h2>
            <p className={css['body-center']}>{t('overview.body')}</p>

            <div className={css['overview-cards']}>
              {overviewCards.map(card => (
                <div key={card.number} className={css['overview-card']}>
                  <span className={css['overview-card-number']}>{card.number}</span>
                  <div className={css['overview-card-content']}>
                    <div className={css['overview-card-left']}>
                      <div className={css['overview-card-title']}>{card.title}</div>
                      <div className={css['overview-card-subtitle']}>{card.subtitle}</div>
                    </div>
                    <div className={css['overview-card-right']}>
                      <div className={css['overview-card-price']}>{card.price || card.price_label}</div>
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
              {t('overview.view_faq')}
              <ChevronDown size={16} strokeWidth={2} />
            </Link>
          </section>

          <hr className={css['divider']} />

          {/* ── Sale Waves ───────────────────────────────────────── */}
          <section id="general-admission" className={css['two-col-section']}>
            <div className={css['section-left']}>
              <div className={css['section-text']}>
                <p className={css['section-tag']}>{t('sale_waves.tag')}</p>
                <h2 className={css['heading-2']}>{t('sale_waves.heading')}</h2>
                <p className={css['body-lg']}>{t('sale_waves.body_lg')}</p>
                <p className={css['body']}>
                  {t('sale_waves.body_prefix')}
                  <strong>{t('sale_waves.body_strong')}</strong>
                  {t('sale_waves.body_suffix')}
                </p>
              </div>

              <div className={css['social-row']}>
                <a href="https://paragraph.com/@efevents" className={css['btn-secondary']}>
                  {t('hero.subscribe_button')}
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
                <span className={css['ticket-type-title']}>{t('sale_waves.card_title')}</span>
                <span className={css['ticket-type-status']}>{t('sale_waves.card_status')}</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {waves.map(row => (
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
                <p className={css['section-tag']}>{t('community.tag')}</p>
                <h2 className={css['heading-2']}>{t('community.heading')}</h2>
                <p className={css['body-lg']}>
                  {t('community.body_lg_prefix')}
                  <strong>{t('community.body_lg_strong')}</strong>
                  {t('community.body_lg_suffix')}
                </p>
                <p className={css['body']}>
                  {t('community.body_prefix')}
                  <strong>{t('community.body_strong_1')}</strong>
                  {t('community.body_middle')}
                  <strong>{t('community.body_strong_2')}</strong>
                  {t('community.body_and')}
                  <strong>{t('community.body_strong_3')}</strong>
                  {t('community.body_suffix')}
                </p>
              </div>
            </div>

            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>{t('community.card_title')}</span>
                <span className={css['ticket-type-status']}>{t('community.card_status')}</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {communityRows.map(row => (
                  <div key={row.name} className={css['ticket-type-row']}>
                    <div className={css['row-name-group']}>
                      <span className={css['row-name']}>{row.name}</span>
                      {row.detail && <span className={css['row-detail']}>{row.detail}</span>}
                    </div>
                    <div className={css['row-meta']}>
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
                <p className={css['section-tag']}>{t('applications.tag')}</p>
                <h2 className={css['heading-2']}>{t('applications.heading')}</h2>
                <p className={css['body-lg']}>
                  {t('applications.body_lg_prefix')}
                  <strong>{t('applications.body_lg_strong')}</strong>
                  {t('applications.body_lg_suffix')}
                </p>
                <p className={css['body']}>
                  {t('applications.body_prefix')}
                  <strong>{t('applications.body_strong_1')}</strong>
                  {t('applications.body_middle')}
                  <strong>{t('applications.body_strong_2')}</strong>
                  {t('applications.body_suffix')}
                </p>
              </div>
              <Link to="/tickets/store" className={css['btn-primary']}>
                {t('applications.learn_more')}
                <ChevronDown size={16} strokeWidth={2} style={{ transform: 'rotate(-90deg)' }} />
              </Link>
            </div>

            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>{t('applications.card_title')}</span>
                <span className={css['ticket-type-status-live']}>{t('applications.card_status')}</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {APPLICATION_ROWS.map(row => (
                  <ApplicationRowItem
                    key={row.id}
                    row={row}
                    isOpen={expandedApplicationId === row.id}
                    onToggle={() => setExpandedApplicationId(prev => (prev === row.id ? null : row.id))}
                    applyLabel={t('applications.apply')}
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
            <h2 className={css['faq-section-heading']}>{t('faq_section.heading')}</h2>
            <div className={css['faq-section-content']}>
              <Faq items={resolvedFaqItems} />
              <Link to="/tickets/faq" className={cn(css['btn-secondary'], css['btn-secondary-centered'])}>
                {t('faq_section.view_all')}
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

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'
  const messages = await getMessages(locale)

  let faqItems: Array<{ question: string; answer: string }> = []
  try {
    const data = await getFaqData()
    faqItems = TICKETS_FAQ_CATEGORIES.flatMap(category =>
      data.items
        .filter(i => i.category === category && i.answer.trim() !== '')
        .slice(0, TICKETS_FAQ_PER_CATEGORY)
        .map(i => ({ question: i.question, answer: i.answer }))
    )
  } catch {
    // Fall back to empty list — TicketsPage renders translated fallback instead
  }

  return {
    props: { faqItems, messages },
    revalidate: 3600, // 1 hour
  }
}
