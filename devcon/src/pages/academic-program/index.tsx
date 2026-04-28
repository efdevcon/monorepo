import React, { useState } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { ArrowRight, ChevronDown, ChevronUp, Microscope, Globe, Rocket } from 'lucide-react'
import themes from '../themes.module.scss'
import HeroBackground from '../ecosystem-program/hero-bg.png'
import JaaliPattern from 'assets/images/pages/ecosystem-jaali-left.svg'
import JaaliBottom from 'assets/images/pages/ecosystem-jaali-bottom.svg'
import CommunityBannerBg from '../ecosystem-program/community-banner.png'
import ArtOverlayText from 'assets/images/pages/ecosystem-art-overlay-text.svg'
import Photo1 from './photo-1.png'
import Photo2 from './photo-2.png'
import Photo3 from './photo-3.png'
import Photo4 from './photo-4.png'
import Photo5 from './photo-5.png'
import css from '../ecosystem-program/ecosystem-program.module.scss'
import cn from 'classnames'

const NAV_LINKS = [
  { title: 'ABOUT', to: '#about' },
  { title: 'WHY JOIN?', to: '#why-join' },
  { title: 'WHO CAN APPLY', to: '#who-can-apply' },
  { title: 'WHAT YOU CAN RECEIVE', to: '#what-you-can-receive' },
  { title: 'APPLY', to: '#apply' },
]

const SCROLLER_PHOTOS = [Photo1, Photo2, Photo3, Photo4, Photo5]

// Reversed color order vs. Ecosystem Program (per Figma note).
const SUPPORT_TAGS = [
  { label: 'Workshops', color: '#cdf4d7' },
  { label: 'Research seminars', color: '#cddff4' },
  { label: 'Hackathons', color: '#d6d5f6' },
  { label: 'Bootcamps', color: '#f0d7f4' },
  { label: 'Reading groups', color: '#ffe0cc' },
]

const WHY_JOIN = [
  {
    icon: Microscope,
    title: 'Bring your campus on the Road to Devcon',
    body: 'Every meetup is part of a global series building toward Devcon 8. Hosting one makes your university part of that story, and gets your community there first.',
  },
  {
    icon: Globe,
    title: 'Find your people ahead of Devcon India',
    body: 'Connect with researchers, developers, and protocol contributors who share your enthusiasts, and your obsessions.',
  },
  {
    icon: Rocket,
    title: 'Turn your campus into a classroom for Ethereum',
    body: 'The expertise is already around you: professors, researchers, and builders in your own university who are working on the hardest problems in the space.',
  },
]

const APPLICATION_ROWS = [
  { name: 'Indian Students', price: '$25', date: 'Opens in May' },
  { name: 'International Students', price: '$99', date: 'Opens in May' },
  { name: 'Builders', price: 'from $399', date: 'Opens in June' },
]

const FAQ_ITEMS = [
  {
    q: 'Who can apply for a discounted ticket?',
    a: 'Discounted tickets are available through applications for students, builders, and ecosystem contributors. Each category has its own eligibility criteria and pricing. Applications are reviewed and tickets are limited per round.',
  },
]

const APPLY_HREF = 'https://esp.ethereum.foundation/applicants/rfp/rtd8_india_academic/apply'
const CONTACT_EMAIL = 'university@ethereum.foundation'

export default function AcademicProgramPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title="Academic Program"
        navigation={NAV_LINKS}
      />

      <div className={cn(css['landing'], 'section')}>
        {/* ── Hero Content ─────────────────────────────── */}
        <section id="about" className={cn(css['hero-content-section'], css['scroll-anchor'], 'expand')}>
          <div className={css['jaali-left']} aria-hidden="true">
            <JaaliPattern />
          </div>
          <div className={css['jaali-right']} aria-hidden="true">
            <JaaliPattern />
          </div>
          <div className={css['jaali-bottom']} aria-hidden="true">
            <JaaliBottom />
          </div>

          <div className={css['hero-text-block']}>
            <h2 className={css['heading-2']}>
              Bring Ethereum to your campus
              <br />
              ahead of Devcon 8
            </h2>
            <p className={css['body']}>
              Shape the next generation of Ethereum builders at your campus and bring your community to Devcon in
              Mumbai this November.
            </p>
          </div>

          <div className={css['hero-cta-block']}>
            <Link to={APPLY_HREF} className={css['btn-primary']}>
              Apply now
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </section>

        {/* ── Community Banner ──────────────────────────── */}
        <section className={cn(css['community-banner'], 'expand')}>
          <Image src={CommunityBannerBg} alt="" className={css['community-banner-bg']} fill sizes="100vw" />
          <p className={css['community-banner-text']}>
            The <strong>Road to Devcon</strong> starts here, on <strong>your campus</strong>.
          </p>
        </section>

        {/* ── Why Join ──────────────────────────────────── */}
        <section id="why-join" className={cn(css['scroll-anchor'], 'py-8 md:py-12 lg:py-16')}>
          <div className="bg-white rounded-2xl p-6 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-12 items-start lg:items-center">
            <h3 className="text-xl md:text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] leading-[1.2] lg:w-[280px] shrink-0">
              Why join the Devcon 8 Academic Program?
            </h3>
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 w-full">
              {WHY_JOIN.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex flex-col gap-3 md:gap-4 flex-1">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-[#7235ed]" strokeWidth={1.5} />
                  <div className="flex flex-col gap-2 md:gap-3">
                    <p className="text-base md:text-lg font-extrabold text-[#1a0d33] tracking-[-0.25px] leading-tight">
                      {title}
                    </p>
                    <p className="text-sm text-[#214] leading-5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Overview ──────────────────────────────────── */}
        <section className={css['overview-section']}>
          {/* Image scroller */}
          <div className={css['image-scroller-wrapper']}>
            <div className={css['image-scroller']}>
              {[...SCROLLER_PHOTOS, ...SCROLLER_PHOTOS].map((photo, i) => (
                <div key={i} className={css['scroller-item']}>
                  <Image
                    src={photo}
                    alt={`Academic event photo ${(i % SCROLLER_PHOTOS.length) + 1}`}
                    className={css['scroller-image']}
                    fill
                    sizes="455px"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Who can apply / What you can receive */}
          <div id="who-can-apply" className={cn(css['two-col'], css['scroll-anchor'])}>
            <div className={css['col']}>
              <h3 className={css['heading-3']}>Who can apply</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>
                  We support initiatives such as <strong>introductory talks</strong>, <strong>technical workshops</strong>,{' '}
                  <strong>panel discussions</strong>, <strong>research presentations</strong>, <strong>hackathons</strong>, or{' '}
                  <strong>meetups</strong> that:
                </p>
                <ul className={css['detail-list']}>
                  <li>
                    Align with Ethereum&apos;s core values, including censorship resistance, open source, privacy, and
                    security
                  </li>
                  <li>Contribute to the Ethereum ecosystem&apos;s growth</li>
                  <li>Take place between 15 May and 15 October, 2026</li>
                </ul>
              </div>
            </div>

            <div id="what-you-can-receive" className={cn(css['col'], css['scroll-anchor'])}>
              <h3 className={css['heading-3']}>What you can receive</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>
                  <strong>Support may include:</strong>
                </p>
                <ul className={css['detail-list']}>
                  <li>
                    Up to <strong>$300 USD</strong> in financial support per event
                  </li>
                  <li>
                    <strong>Devcon tickets (free or discounted)</strong> for faculty and top student applicants
                  </li>
                  <li>Amplification of your event through Devcon channels</li>
                  <li>Non-financial support (connections, guidance, coordination)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What we support tags */}
          <div className={css['support-tags-section']}>
            <p className={css['support-tags-label']}>What we support</p>
            <div className={css['support-tags']}>
              {SUPPORT_TAGS.map(tag => (
                <div key={tag.label} className={css['support-tag']} style={{ background: tag.color }}>
                  {tag.label}
                </div>
              ))}
            </div>
          </div>

          {/* Apply now pill + Follow us */}
          <div id="apply" className={cn(css['scroll-anchor'], 'flex flex-col gap-6 md:gap-8 items-center w-full')}>
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="bg-white border border-[#decffb] rounded-3xl md:rounded-full px-4 md:pl-6 md:pr-4 py-4 md:py-3 flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto max-w-full">
                <p className="text-base font-bold text-[#214] leading-6 text-center md:text-left">
                  Bring the Road to Devcon to your campus!
                </p>
                <Link to={APPLY_HREF} className={css['btn-primary']}>
                  Apply now
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
              <p className="text-sm text-[#594d73] text-center leading-5 px-4">
                We review applications on a rolling basis and will get back to you <strong>within 15 days</strong>.
                <br className="hidden sm:block" />
                {' '}Got a question? Contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#7235ed] hover:underline break-all">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── Art with Text Overlay ─────────────────────── */}
        <section className={cn(css['art-overlay'], 'expand')}>
          <Image src={HeroBackground} alt="" className={css['art-overlay-bg']} fill sizes="100vw" />
          <div className={cn(css['art-overlay-inner'], 'section')}>
            <div className={css['art-overlay-text']} aria-label="Road to Devcon India">
              <ArtOverlayText />
            </div>
          </div>
        </section>

        {/* ── Other Support (Discount applications) ─────── */}
        <section className={cn(css['other-support'], 'expand')}>
          <div className={css['other-support-left']}>
            <div className={css['other-support-text']}>
              <p className={css['section-tag']}>Other support</p>
              <h3 className={css['heading-3']}>Discount applications</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>
                  Ticket support is intended to <strong>enable participation at Devcon</strong>, reward meaningful
                  contributions, and support initiatives with clear ecosystem impact.
                </p>
                <ul className={css['detail-list']} style={{ marginBottom: 16 }}>
                  <li>
                    All ticket requests are <strong>curated and limited per round</strong>
                  </li>
                  <li>
                    Discounted prices increase over time. Applying earlier gives access to{' '}
                    <strong>lower price tiers</strong>, subject to availability and review.
                  </li>
                </ul>
                <p>
                  Ticket options unlock on different dates and have limited spots per round. Please check availability
                  and release dates.
                </p>
              </div>
            </div>
            <Link to="/tickets" className={css['btn-secondary']}>
              View all tickets
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>

          <div className={css['other-support-right']}>
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

            <div className={css['faq-accordion']}>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={css['faq-item']}>
                  <button
                    type="button"
                    className={css['faq-trigger']}
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
                  {i < FAQ_ITEMS.length - 1 && <div className={css['faq-border']} />}
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
