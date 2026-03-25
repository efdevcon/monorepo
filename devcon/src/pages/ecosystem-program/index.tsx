import React, { useState } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import themes from '../themes.module.scss'
import HeroBackground from './hero-bg.png'
import JaaliPattern from 'assets/images/pages/ecosystem-jaali-left.svg'
import JaaliBottom from 'assets/images/pages/ecosystem-jaali-bottom.svg'
import CommunityBannerBg from './community-banner.png'
import ArtOverlayText from 'assets/images/pages/ecosystem-art-overlay-text.svg'
import Photo1 from './photo-1.png'
import Photo2 from './photo-2.png'
import Photo3 from './photo-3.png'
import Photo4 from './photo-4.png'
import Photo5 from './photo-5.png'
import Photo6 from './photo-6.png'
import css from './ecosystem-program.module.scss'
import cn from 'classnames'

const NAV_LINKS = [
  { title: 'ABOUT', to: '#about' },
  { title: 'ECOSYSTEM NEEDS', to: '#ecosystem-needs' },
  { title: 'WHO CAN APPLY', to: '#who-can-apply' },
  { title: 'WHAT YOU CAN RECEIVE', to: '#what-you-can-receive' },
  { title: 'APPLY', to: '#apply' },
]

const SCROLLER_PHOTOS = [Photo1, Photo2, Photo3, Photo4, Photo5, Photo6]

const SUPPORT_TAGS = [
  { label: 'Meetups', color: '#ffe0cc' },
  { label: 'Activations', color: '#f0d7f4' },
  { label: 'Bootcamps', color: '#d6d5f6' },
  { label: 'Roundtables', color: '#cddff4' },
  { label: 'Academic Collabs', color: '#cdf4d7' },
]

const APPLICATION_ROWS = [
  { name: 'Student Discount', price: '$25', date: 'Opens in May' },
  { name: 'Builder Discount', price: 'from $299', date: 'Opens in May' },
]

const FAQ_ITEMS = [
  {
    q: 'Who can apply for a discounted ticket?',
    a: 'Discounted tickets are available through applications for students, builders, and ecosystem contributors. Each category has its own eligibility criteria and pricing. Applications are reviewed and tickets are limited per round.',
  },
]

export default function EcosystemProgramPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title="Ecosystem Program"
        navigation={NAV_LINKS}
      />

      <div className={cn(css['landing'], 'section')}>
        {/* ── Hero Content Section ─────────────────────────────── */}
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
              Supporting grassroots builders
              <br />
              across the Ethereum ecosystem
            </h2>
            <p className={css['body']}>
              We fund local projects, events, and contributors creating spaces for learning, experimentation, and
              coordination on the road to Devcon 8 India.
            </p>
          </div>

          <div className={css['hero-cta-block']}>
            <Link to="https://forms.gle/ecosystem-program" className={css['btn-primary']}>
              Apply now
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <div className={css['hero-deadline']}>
              <span>Deadline to apply:</span>
              <strong>30 April, 2026</strong>
            </div>
          </div>
        </section>

        {/* ── Community Message Banner ──────────────────────────── */}
        <section className={cn(css['community-banner'], 'expand')}>
          <Image src={CommunityBannerBg} alt="" className={css['community-banner-bg']} fill sizes="100vw" />
          <p className={css['community-banner-text']}>
            Devcon is a space <strong>for</strong> the Ethereum community, <strong>by</strong> the Ethereum community.
            <br className={css['desktop-br']} />
            Join us, bring your ideas and let&apos;s build Devcon <strong>together</strong>!
          </p>
        </section>

        {/* ── Overview Section ──────────────────────────────────── */}
        <section id="ecosystem-needs" className={cn(css['overview-section'], css['scroll-anchor'])}>
          {/* Image scroller */}
          <div className={css['image-scroller-wrapper']}>
            <div className={css['image-scroller']}>
              {SCROLLER_PHOTOS.map((photo, i) => (
                <div key={i} className={css['scroller-item']}>
                  <Image
                    src={photo}
                    alt={`Ecosystem event photo ${i + 1}`}
                    className={css['scroller-image']}
                    fill
                    sizes="455px"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* What the Ecosystem needs */}
          <div className={css['text-section']}>
            <h3 className={css['heading-3']}>What the Ecosystem needs</h3>
            <div className={css['body-block']}>
              <p className={css['body']}>
                As Ethereum continues to grow, there is a need to make the ecosystem more accessible, connected, and
                grounded in its core values. This program responds to that need by:
              </p>
              <ul className={css['bullet-list']}>
                <li>
                  <strong>Expanding access to Ethereum</strong> for new and diverse audiences, lowering barriers to
                  entry through education, experimentation, and local initiatives
                </li>
                <li>
                  <strong>Bridging Ethereum with other industries and communities</strong>, creating spaces where its
                  infrastructure can be explored in real-world contexts
                </li>
                <li>
                  <strong>Promoting and putting into practice Ethereum&apos;s core values and CROPS</strong>: Censorship
                  Resistance, Open Source, Privacy, and Security, through hands-on experiences
                </li>
              </ul>
            </div>
          </div>

          {/* Who we support tags */}
          <div className={css['support-tags-section']}>
            <p className={css['support-tags-label']}>Who we support</p>
            <div className={css['support-tags']}>
              {SUPPORT_TAGS.map(tag => (
                <div key={tag.label} className={css['support-tag']} style={{ background: tag.color }}>
                  {tag.label}
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
                  We support initiatives such as <strong>meetups</strong>, <strong>bootcamps</strong>,{' '}
                  <strong>hackathons</strong>, <strong>roundtables</strong>, <strong>academic collaborations</strong>,
                  and other formats that:
                </p>
                <ul className={css['detail-list']}>
                  <li>
                    <strong>Bring new people into Ethereum</strong>
                  </li>
                  <li>
                    Strengthen <strong>connections across communities and industries</strong>
                  </li>
                  <li>
                    Encourage <strong>hands-on participation</strong> and knowledge sharing
                  </li>
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
                    Up to <strong>$500 USD</strong> in financial support
                  </li>
                  <li>Visibility and amplification across Devcon channels</li>
                  <li>Non-financial support (connections, guidance, coordination)</li>
                  <li>Devcon tickets (free or discounted - maximum of 5) based on contribution and availability</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Budget Note + CTA */}
          <div id="apply" className={cn(css['budget-note'], css['scroll-anchor'])}>
            <p className={css['body-small']}>
              <strong>Note:</strong> The program will run in two waves. In Wave 1, we prioritize initiatives with the
              greatest impact.
            </p>

            <div className={css['wave-cta-row']}>
              <div className={css['wave-cta-info']}>
                <span>Wave 1 - RFP Closing Date:</span>
                <span className={css['wave-cta-date']}>30 April, 2026</span>
              </div>
              <Link to="https://forms.gle/ecosystem-program" className={css['btn-primary']}>
                Apply now
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>

            <p className={css['budget-note-footer']}>
              After applying, please wait for our response &mdash;{' '}
              <strong>we&apos;ll get back to you within 7 days</strong>.
              <br />
              Our contact: <a href="mailto:ecosystem@devcon.org">ecosystem@devcon.org</a>
            </p>
          </div>
        </section>

        {/* ── Art with Text Overlay ─────────────────────────────── */}
        <section className={cn(css['art-overlay'], 'expand')}>
          <Image src={HeroBackground} alt="" className={css['art-overlay-bg']} fill sizes="100vw" />
          <div className={cn(css['art-overlay-inner'], 'section')}>
            <div className={css['art-overlay-text']} aria-label="Road to Devcon India">
              <ArtOverlayText />
            </div>
          </div>
        </section>

        {/* ── Other Support Section ─────────────────────────────── */}
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
                  Ticket options unlock on different dates and are limited spots per round. Please check availability
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
