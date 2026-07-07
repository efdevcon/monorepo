import React from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { SEO } from 'components/domain/seo'
import { ArrowRight, ArrowUpRight, CircleCheckBig, LockKeyholeOpen, MoveUp, Users } from 'lucide-react'
import StackingCards, { StackingCardItem } from 'components/common/stacking-cards'
import { motion, useScroll, useTransform } from 'framer-motion'
import themes from '../themes.module.scss'
import HeroBackground from 'components/common/dc-8/hero/images/devcon-8-india-bg.png'
import JaaliPattern from 'assets/images/pages/ecosystem-jaali-left.svg'
import JaaliBottom from 'assets/images/pages/ecosystem-jaali-bottom.svg'
import MoonBg from 'assets/icons/dc8-moon-bg.svg'
import LeftCircles from './images/left-circles.png'
import RightCircles from './images/right-circles.png'
import TrackIconsFaded from './images/tracks/track-icons-faded.png'
import LightningTalkImg from './images/formats/lightning-talk.jpg'
import TalkImg from './images/formats/talk.jpg'
import MixedFormatImg from './images/formats/mixed-format.jpg'
import WorkshopImg from './images/formats/workshop.jpg'
import TrackCoreProtocol from './images/tracks/track-core-protocol.png'
import TrackPrivacyConsent from './images/tracks/track-privacy-consent.png'
import TrackSecurity from './images/tracks/track-security.png'
import TrackFuturesWorthBuilding from './images/tracks/track-futures-worth-building.png'
import TrackRightsFreedomsGovernance from './images/tracks/track-rights-freedoms-governance.png'
import TrackPermissionlessNetworks from './images/tracks/track-permissionless-networks.png'
import TrackUsersBuildersAgents from './images/tracks/track-users-builders-agents.png'
import TrackAppliedCryptography from './images/tracks/track-applied-cryptography.png'
import TrackOpenVerifiableStack from './images/tracks/track-open-verifiable-stack.png'
import Process1 from './images/process/speaker-process-01.jpg'
import Process2 from './images/process/speaker-process-02.jpg'
import Process3 from './images/process/speaker-process-03.jpg'
import Process4 from './images/process/speaker-process-04.jpg'
import Process5 from './images/process/speaker-process-05.jpg'
import Process6 from './images/process/speaker-process-06.jpg'
import css from './speaker-applications.module.scss'
import cn from 'classnames'
import { useTranslations } from 'next-intl'
import { getMessages } from 'utils/intl'
import type { GetStaticPropsContext } from 'next'

const APPLY_URL = 'https://mum.speakat.xyz/devcon8/cfp'
const WISHLIST_URL = 'https://ef-events.notion.site/devcon-8-talks-wishlist'
const GUIDELINES_URL = '/application-guidelines'
// Anchor id comes from application-guidelines.tsx's SECTION_KEYS (underscores → hyphens)
const REVIEW_CRITERIA_URL = '/application-guidelines#review-criteria'

const WHY_SPEAK_ICONS = [Users, LockKeyholeOpen, CircleCheckBig]

const FORMAT_IMAGES = [LightningTalkImg, TalkImg, MixedFormatImg, WorkshopImg]

// Visual order matches the Figma grid, row by row
const TRACK_IMAGES = [
  TrackCoreProtocol,
  TrackPrivacyConsent,
  TrackSecurity,
  TrackFuturesWorthBuilding,
  TrackRightsFreedomsGovernance,
  TrackPermissionlessNetworks,
  TrackUsersBuildersAgents,
  TrackAppliedCryptography,
  TrackOpenVerifiableStack,
]

// Back-face tints from Figma, same order as TRACK_IMAGES
const TRACK_BACK_COLORS = [
  '#f4e2f8', // Core Protocol
  '#f2f1f3', // Privacy & Consent
  '#fAf3Ea', // Security
  '#fffadb', // Futures Worth Building
  '#e9e5f6', // Rights, Freedoms & Governance
  '#f0f3ff', // Permissionless Networks
  '#ffe5e6', // Users, Builders & Agents
  '#e7f0f9', // Applied Cryptography
  '#ebfffb', // Open & Verifiable Stack
]

const PROCESS_IMAGES = [Process1, Process2, Process3, Process4, Process5, Process6]

// Mobile stacking-card backgrounds from Figma, same order as PROCESS_IMAGES
const PROCESS_STACK_COLORS = [
  '#ffc299', // marigold 200
  '#fecbcc', // red 100
  '#ffcce3', // kamala 100
  '#d3bff9', // purple 100
  '#dbdbef', // indigo 100
  '#aaeaba', // harit 200
]

export default function SpeakerApplicationsPage() {
  const t = useTranslations('speaker_applications')
  const [flippedTrack, setFlippedTrack] = React.useState<number | null>(null)

  // Desktop flips via CSS :hover; the click toggle covers touch, keyboard, and AT users
  const handleTrackToggle = (i: number) => {
    setFlippedTrack(prev => (prev === i ? null : i))
  }

  // On mobile the process title is sticky through the card stack; fade it out as the
  // last card lands so it doesn't linger over the CTA while the pile scrolls away.
  // Harmless on desktop: by this progress the non-sticky title is far off-screen.
  const processHeaderRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress: processProgress } = useScroll({
    target: processHeaderRef,
    offset: ['start start', 'end end'],
  })
  const processTitleOpacity = useTransform(processProgress, [0.93, 0.99], [1, 0])

  const navLinks = [
    { title: t('nav.about'), to: '#about' },
    { title: t('nav.why_speak'), to: '#why-speak' },
    { title: t('nav.sessions'), to: '#sessions' },
    { title: t('nav.tracks'), to: '#tracks' },
    { title: t('nav.process'), to: '#process' },
    { title: t('nav.apply'), to: '#apply' },
  ]

  const datesBarItems = t.raw('dates_bar.items') as Array<{ label: string; value: string }>
  // Icons/images/colors are matched to these lists by position, so cap each list
  // at its visual array's length — a locale file with extra items must not
  // render an undefined image
  const whySpeakCards = (
    t.raw('why_speak.cards') as Array<{
      title: string
      p1: string
      p2?: string
      p2_prefix?: string
      p2_strong?: string
      p2_suffix?: string
    }>
  ).slice(0, WHY_SPEAK_ICONS.length)
  const formatCards = (t.raw('formats.cards') as Array<{ title: string; duration: string; description: string }>).slice(
    0,
    FORMAT_IMAGES.length
  )
  const trackItems = (
    t.raw('tracks.items') as Array<{
      title: string
      description: string
      tags: string[]
      more: string
    }>
  ).slice(0, TRACK_IMAGES.length)
  const processCards = (t.raw('process.cards') as Array<{ line_1: string; line_2: string }>).slice(
    0,
    PROCESS_IMAGES.length
  )

  const renderContactLine = (visibilityClass: string) => (
    <p className={cn(css['body'], visibilityClass)}>
      {t('final_cta.contact_prefix')}
      <a href={`mailto:${t('final_cta.contact_email')}`} className={css['text-link']}>
        {t('final_cta.contact_email')}
      </a>
    </p>
  )

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <SEO title={t('title')} />
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('title')}
        navigation={navLinks}
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
            <h2 className={css['heading-2']}>{t('hero.heading')}</h2>
            <p className={css['body']}>{t('hero.body')}</p>
            <p className={css['body']}>
              <strong>{t('hero.body_strong')}</strong>
            </p>
          </div>

          <div className={css['hero-cta-block']}>
            <Link to={APPLY_URL} className={css['btn-primary']}>
              {t('hero.apply_button')}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <Link to={GUIDELINES_URL} className={css['text-link']}>
              {t('hero.guidelines_link')}
            </Link>
          </div>
        </section>

        {/* ── Dates Bar ─────────────────────────────────────────── */}
        <section className={cn(css['dates-bar'], 'expand')}>
          {datesBarItems.map(item => (
            <p key={item.label} className={css['dates-bar-item']}>
              <strong>{item.label}</strong> {item.value}
            </p>
          ))}
        </section>

        {/* ── Main Gradient Container ───────────────────────────── */}
        <div className={cn(css['main-gradient'], 'expand')}>
          {/* ── Why Speak Section ──────────────────────────────── */}
          <section id="why-speak" className={cn(css['why-speak-section'], css['scroll-anchor'])}>
            <div className={css['why-speak-card']}>
              <Image src={TrackIconsFaded} alt="" className={css['why-speak-art']} aria-hidden="true" />
              <h2 className={css['heading-2']}>{t('why_speak.heading')}</h2>
              <div className={css['why-speak-grid']}>
                {whySpeakCards.map((card, i) => {
                  const Icon = WHY_SPEAK_ICONS[i]
                  return (
                    <div key={card.title} className={css['why-speak-item']}>
                      <div className={css['why-speak-item-header']}>
                        <Icon size={24} strokeWidth={2} />
                        <p className={css['why-speak-item-title']}>{card.title}</p>
                      </div>
                      <div className={css['why-speak-item-body']}>
                        <p>{card.p1}</p>
                        <p>
                          {card.p2 ?? (
                            <>
                              {card.p2_prefix}
                              <Link to="#tracks" className={css['track-topics-link']}>
                                <strong>{card.p2_strong}</strong>
                              </Link>
                              {card.p2_suffix}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <div className={css['main-sections']}>
            <div className={css['moon-bg']} aria-hidden="true">
              <MoonBg />
            </div>

            {/* ── Formats Section ──────────────────────────────── */}
            <section id="sessions" className={cn(css['formats-section'], css['scroll-anchor'])}>
              <div className={css['rings-left']} aria-hidden="true">
                <Image src={LeftCircles} alt="" fill sizes="409px" />
              </div>
              <div className={css['rings-right']} aria-hidden="true">
                <Image src={RightCircles} alt="" fill sizes="409px" />
              </div>

              <div className={css['formats-header']}>
                <h2 className={css['heading-2']}>{t('formats.heading')}</h2>
                <p className={css['body']}>{t('formats.intro')}</p>
              </div>

              <div className={css['formats-grid']}>
                {formatCards.map((card, i) => (
                  <div key={card.title} className={css['format-card']}>
                    <div className={css['format-card-image']}>
                      <Image src={FORMAT_IMAGES[i]} alt={card.title} fill sizes="(max-width: 640px) 100vw, 238px" />
                    </div>
                    <div className={css['format-card-copy']}>
                      <p className={css['format-card-title']}>{card.title}</p>
                      <p className={css['format-card-duration']}>{card.duration}</p>
                      <p className={css['format-card-description']}>{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className={css['muted-note']}>{t('formats.free_ticket_note')}</p>

              <div className={css['cta-stack']}>
                <p className={css['body']}>{t('formats.inspired_label')}</p>
                <Link to={APPLY_URL} className={css['btn-primary']}>
                  {t('formats.apply_button')}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </section>

            {/* ── Tracks Section ───────────────────────────────── */}
            <section id="tracks" className={cn(css['tracks-section'], css['scroll-anchor'])}>
              <div className={css['tracks-header']}>
                <h2 className={css['heading-2']}>{t('tracks.heading')}</h2>
                <p className={css['body']}>
                  {t('tracks.intro_line_1')}
                  <br />
                  {t('tracks.intro_line_2')}
                </p>
              </div>

              <div className={css['tracks-grid']}>
                {trackItems.map((item, i) => (
                  <button
                    type="button"
                    key={item.title}
                    className={css['track-card']}
                    onClick={() => handleTrackToggle(i)}
                    aria-expanded={flippedTrack === i}
                  >
                    <div className={cn(css['track-card-inner'], { [css['is-flipped']]: flippedTrack === i })}>
                      <div className={css['track-card-front']}>
                        <div className={css['track-card-icon']}>
                          <Image src={TRACK_IMAGES[i]} alt="" fill sizes="160px" />
                        </div>
                        <p className={css['track-card-title']}>{item.title}</p>
                      </div>
                      <div className={css['track-card-back']} style={{ backgroundColor: TRACK_BACK_COLORS[i] }}>
                        <div className={css['track-card-back-text']}>
                          <p className={css['track-card-back-title']}>{item.title}</p>
                          <p className={css['track-card-back-description']}>{item.description}</p>
                        </div>
                        <div className={css['track-card-tags']}>
                          {item.tags.map(tag => (
                            <span key={tag} className={css['track-card-tag']}>
                              {tag}
                            </span>
                          ))}
                          <span className={css['track-card-tag-more']}>{item.more}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className={cn(css['cta-stack'], css['tracks-cta'])}>
                <p className={css['body']}>{t('tracks.wishlist_label')}</p>
                <Link to={WISHLIST_URL} className={css['btn-secondary']}>
                  {t('tracks.wishlist_button')}
                  <ArrowUpRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </section>

            {/* ── Process Section ──────────────────────────────── */}
            <section id="process" className={cn(css['process-section'], css['scroll-anchor'])}>
              <div className={css['process-header']} ref={processHeaderRef}>
                <motion.h2 className={css['heading-2']} style={{ opacity: processTitleOpacity }}>
                  {t('process.heading')}
                </motion.h2>
                <div className={css['process-grid']}>
                  {processCards.map((card, i) => (
                    <div key={card.line_1} className={css['process-card']}>
                      <Image src={PROCESS_IMAGES[i]} alt="" fill sizes="427px" />
                      <p className={css['process-card-caption']}>
                        {card.line_1}
                        <br />
                        {card.line_2}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Mobile-only scroll-driven stack; visibility swapped with .process-grid at $breakpoints-sm */}
                <StackingCards totalCards={processCards.length} className={css['process-stack']}>
                  {processCards.map((card, i) => {
                    const isLast = i === processCards.length - 1
                    return (
                      <StackingCardItem
                        key={card.line_1}
                        index={i}
                        // Pin position and peek step are defined on .process-stack in the SCSS
                        // module (centered in the viewport, clamped below the sticky title)
                        topPosition={`calc(var(--stack-top-base) + ${i} * var(--stack-top-step))`}
                        className={css['process-stack-item']}
                      >
                        <div className={css['process-stack-card']} style={{ backgroundColor: PROCESS_STACK_COLORS[i] }}>
                          <div className={css['process-stack-title-row']}>
                            <p className={css['process-stack-label']}>{t('process.stack_label')}</p>
                            <p className={css['process-stack-counter']}>
                              {String(i + 1).padStart(2, '0')}/{String(processCards.length).padStart(2, '0')}
                            </p>
                          </div>
                          {/* No <br/> here: the mobile card is narrower than the desktop caption,
                              so the copy reflows naturally instead of forcing ragged breaks */}
                          <p className={css['process-stack-heading']}>
                            {card.line_1} {card.line_2}
                          </p>
                          <div className={css['process-stack-image']}>
                            <Image src={PROCESS_IMAGES[i]} alt="" fill sizes="100vw" />
                          </div>
                          <p className={css['process-stack-footer']}>
                            {isLast ? <CircleCheckBig size={16} strokeWidth={2} /> : <MoveUp size={16} strokeWidth={2} />}
                            {isLast ? t('process.the_end') : t('process.scroll_to_continue')}
                          </p>
                        </div>
                      </StackingCardItem>
                    )
                  })}
                  {/* Sticky items can't travel past their natural position when they're the
                      last child — this tail gives the final card room to settle on the pile
                      while the CTA (pulled up by .process-stack's margin) rises beneath it */}
                  <div className={css['process-stack-tail']} aria-hidden="true" />
                </StackingCards>
              </div>

              <div className={css['cta-stack']}>
                <p className={css['body']}>{t('process.callout')}</p>
                <Link to={REVIEW_CRITERIA_URL} className={css['btn-secondary']}>
                  {t('process.criteria_button')}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </section>

            {/* ── Final CTA Section ────────────────────────────── */}
            <section id="apply" className={cn(css['final-cta-section'], css['scroll-anchor'])}>
              <div className={css['final-cta-content']}>
                <h2 className={css['heading-2']}>{t('final_cta.heading')}</h2>
                <div className={css['final-cta-body']}>
                  <p className={css['body']}>
                    {t('final_cta.body_prefix')}
                    <strong>{t('final_cta.body_strong')}</strong>
                    {t('final_cta.body_suffix')}
                  </p>
                  <p className={css['body']}>
                    <Link to={GUIDELINES_URL} className={css['text-link']}>
                      {t('final_cta.guidelines_link')}
                    </Link>
                  </p>
                  {renderContactLine(css['contact-desktop'])}
                </div>
              </div>

              <div className={css['final-cta-pill']}>
                <div className={css['final-cta-pill-text']}>
                  <p className={css['final-cta-pill-label']}>{t('final_cta.closes_label')}</p>
                  <p className={css['final-cta-pill-date']}>{t('final_cta.closes_date')}</p>
                </div>
                <Link to={APPLY_URL} className={css['btn-primary']}>
                  {t('final_cta.apply_button')}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>

              {renderContactLine(css['contact-mobile'])}
            </section>
          </div>
        </div>
      </div>
    </Page>
  )
}

export async function getStaticProps(context: GetStaticPropsContext) {
  const locale = context.locale ?? 'en'
  const messages = await getMessages(locale)
  return { props: { messages } }
}
