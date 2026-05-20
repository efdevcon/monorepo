import React from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { ArrowRight, Handshake, Compass, Wrench, Github, Twitter, MessageSquare } from 'lucide-react'
import InfiniteScroll from 'lib/components/infinite-scroll'
import { WritingText } from 'components/domain/landing-page/WritingText'
import themes from '../themes.module.scss'
import HeroBackground from './hero-bg.png'
import JaaliPattern from 'assets/images/pages/ecosystem-jaali-left.svg'
import JaaliBottom from 'assets/images/pages/ecosystem-jaali-bottom.svg'
import ImpactGlyph from 'assets/images/pages/supporters-impact-glyph.svg'
import CommunityBannerBg from './community-banner.png'
import css from './supporters.module.scss'
import cn from 'classnames'
import { useTranslations } from 'next-intl'

// Past-supporter logos — raw source assets exported from the Figma design
// (4283:5510..5572). PNGs for the simple wordmarks; the two composites
// (Espresso = mark + text, Self) are inlined as SVG React components via svgr.
import LogoArbitrum from 'assets/images/supporters-page/figma-logos/arbitrum.png'
import LogoGnosis from 'assets/images/supporters-page/figma-logos/gnosis.png'
import LogoAave from 'assets/images/supporters-page/figma-logos/aave.png'
import LogoEns from 'assets/images/supporters-page/figma-logos/ens.png'
import LogoNethermind from 'assets/images/supporters-page/figma-logos/nethermind.png'
import LogoStarkware from 'assets/images/supporters-page/figma-logos/starkware.png'
import LogoAztec from 'assets/images/supporters-page/figma-logos/aztec.png'
import LogoCelo from 'assets/images/supporters-page/figma-logos/celo.png'
import LogoRailgun from 'assets/images/supporters-page/figma-logos/railgun.png'
import LogoXmtp from 'assets/images/supporters-page/figma-logos/xmtp.png'
import LogoGitcoin from 'assets/images/supporters-page/figma-logos/gitcoin.png'
import LogoTheGraph from 'assets/images/supporters-page/figma-logos/the-graph.png'
import LogoObol from 'assets/images/supporters-page/figma-logos/obol.png'
import LogoMorpho from 'assets/images/supporters-page/figma-logos/morpho.png'
import LogoCowSwap from 'assets/images/supporters-page/figma-logos/cow-swap.png'
import LogoFarcaster from 'assets/images/supporters-page/figma-logos/farcaster.png'
import LogoRadicle from 'assets/images/supporters-page/figma-logos/radicle.png'
import LogoRotki from 'assets/images/supporters-page/figma-logos/rotki.png'
import LogoSelf from 'assets/images/supporters-page/figma-logos/self.png'
import EspressoMark from 'assets/images/pages/supporters-logos/espresso-mark.svg'
import EspressoText from 'assets/images/pages/supporters-logos/espresso-text.svg'

const APPLY_URL = '/form/supporter-application'

// Order matches the Figma's two rows (top row 4283:5385 scrolls right,
// bottom row 4283:5420 scrolls left). Each entry renders its own logo —
// most are PNG <Image> but Espresso and Self are composite SVGs.
function EspressoLogo() {
  // Mark on the left, "espresso" wordmark to the right of it.
  return (
    <div className={css['logo-composite']}>
      <EspressoMark className={css['logo-svg']} style={{ height: '100%' }} />
      <EspressoText className={css['logo-svg-text']} />
    </div>
  )
}

const SUPPORTER_LOGOS_ROW_1: React.ReactNode[] = [
  <Image key="arbitrum" src={LogoArbitrum} alt="Arbitrum" className={css['logo-img']} />,
  <Image key="gnosis" src={LogoGnosis} alt="Gnosis" className={css['logo-img']} />,
  <Image key="aave" src={LogoAave} alt="Aave" className={css['logo-img']} />,
  <Image key="ens" src={LogoEns} alt="ENS" className={css['logo-img']} />,
  <Image key="nethermind" src={LogoNethermind} alt="Nethermind" className={css['logo-img']} />,
  <Image key="starkware" src={LogoStarkware} alt="Starkware" className={css['logo-img']} />,
  <EspressoLogo key="espresso" />,
  <Image key="aztec" src={LogoAztec} alt="Aztec" className={css['logo-img']} />,
  <Image key="celo" src={LogoCelo} alt="Celo" className={css['logo-img']} />,
  <Image key="railgun" src={LogoRailgun} alt="Railgun" className={css['logo-img']} />,
]

const SUPPORTER_LOGOS_ROW_2: React.ReactNode[] = [
  <Image key="xmtp" src={LogoXmtp} alt="XMTP" className={css['logo-img']} />,
  <Image key="gitcoin" src={LogoGitcoin} alt="Gitcoin" className={css['logo-img']} />,
  <Image key="thegraph" src={LogoTheGraph} alt="The Graph" className={css['logo-img']} />,
  <Image key="obol" src={LogoObol} alt="Obol" className={css['logo-img']} />,
  <Image key="morpho" src={LogoMorpho} alt="Morpho" className={css['logo-img']} />,
  <Image key="cowswap" src={LogoCowSwap} alt="Cow Swap" className={css['logo-img']} />,
  <Image key="farcaster" src={LogoFarcaster} alt="Farcaster" className={css['logo-img']} />,
  <Image key="radicle" src={LogoRadicle} alt="Radicle" className={css['logo-img']} />,
  <Image key="rotki" src={LogoRotki} alt="Rotki" className={css['logo-img']} />,
  <Image key="self" src={LogoSelf} alt="Self" className={css['logo-img']} />,
]

const WHY_SUPPORT_ICONS = [Handshake, Compass, Wrench] as const

function ApplyButton({ label, className }: { label: string; className?: string }) {
  return (
    <Link to={APPLY_URL} className={cn(css['btn-primary'], className)}>
      {label}
      <ArrowRight size={16} strokeWidth={2} />
    </Link>
  )
}

export default function SupportersProgramPage() {
  const t = useTranslations('supporters_program')

  const navLinks = [
    { title: t('nav.about'), to: '#about' },
    { title: t('nav.why_support'), to: '#why-support' },
    { title: t('nav.past_supporters'), to: '#past-supporters' },
    { title: t('nav.what_is'), to: '#what-is' },
    { title: t('nav.impact_booths'), to: '#impact' },
    { title: t('nav.values'), to: '#values' },
    { title: t('nav.apply'), to: '#apply' },
  ]

  const whySupportPoints = t.raw('why_support.points') as Array<{ title: string; body: string }>
  const cropsPillars = t.raw('values.pillars') as string[]

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
            <p className={css['body']}>
              {t('hero.body_line_1')}
              <br />
              {t('hero.body_line_2')}
              <br />
              <br />
              <strong>{t('hero.body_tagline')}</strong>
            </p>
          </div>

          <div className={css['hero-cta-block']}>
            <ApplyButton label={t('hero.cta')} />
          </div>
        </section>

        {/* ── Community Message Banner ──────────────────────────── */}
        <section className={cn(css['community-banner'], 'expand')}>
          <Image src={CommunityBannerBg} alt="" className={css['community-banner-bg']} fill sizes="100vw" />
          <p className={css['community-banner-text']}>
            {t('community_banner.prefix')}
            <strong>{t('community_banner.strong')}</strong>
            {t('community_banner.suffix')}
          </p>
        </section>

        {/* ── Why support DC8 India? — 3-icon card ─────────────── */}
        <section id="why-support" className={cn(css['why-support-section'], css['scroll-anchor'])}>
          <div className={css['why-support-card']}>
            <h3 className={css['why-support-heading']}>
              {t('why_support.heading_line_1')}
              <br />
              {t('why_support.heading_line_2')}
            </h3>
            <div className={css['why-support-points']}>
              {whySupportPoints.map((point, i) => {
                const Icon = WHY_SUPPORT_ICONS[i] ?? Handshake
                return (
                  <div key={i} className={css['why-support-point']}>
                    <Icon size={32} strokeWidth={1.6} className={css['why-support-icon']} />
                    <div className={css['why-support-point-copy']}>
                      <p className={css['why-support-point-title']}>{point.title}</p>
                      <p className={css['why-support-point-body']}>{point.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Past Supporters scroller ─────────────────────────── */}
        <section id="past-supporters" className={cn(css['past-supporters'], css['scroll-anchor'], 'expand')}>
          <p className={css['section-label']}>{t('past_supporters_label')}</p>
          <div className={css['logo-row']}>
            <InfiniteScroll speed="80s" nDuplications={3} unpadded>
              <div className={css['logo-track']}>
                {SUPPORTER_LOGOS_ROW_1.map((logo, i) => (
                  <div key={i} className={css['logo-item']}>
                    {logo}
                  </div>
                ))}
              </div>
            </InfiniteScroll>
          </div>
          <div className={css['logo-row']}>
            <InfiniteScroll speed="80s" nDuplications={3} reverse unpadded>
              <div className={css['logo-track']}>
                {SUPPORTER_LOGOS_ROW_2.map((logo, i) => (
                  <div key={i} className={css['logo-item']}>
                    {logo}
                  </div>
                ))}
              </div>
            </InfiniteScroll>
          </div>
        </section>

        {/* ── What is / Who can — two columns ──────────────────── */}
        <section id="what-is" className={cn(css['details-two-col'], css['scroll-anchor'])}>
          <div className={css['details-col']}>
            <h3 className={css['heading-3']}>{t('what_is.heading')}</h3>
            <p className={css['details-lead']}>{t('what_is.body_p1')}</p>
            <p className={css['body']}>
              <strong>{t('what_is.body_p2_strong')}</strong>
              {t('what_is.body_p2_rest')}
            </p>
          </div>
          <div className={css['details-col']}>
            <h3 className={css['heading-3']}>{t('who_can.heading')}</h3>
            <p className={css['details-lead']}>
              {t('who_can.body_p1_prefix')}
              <a
                href={t('who_can.body_p1_url')}
                target="_blank"
                rel="noopener noreferrer"
                className={css['inline-link']}
              >
                <strong>{t('who_can.body_p1_link')}</strong>
              </a>
              {t('who_can.body_p1_suffix')}
            </p>
            <p className={css['body']}>
              {t('who_can.body_p2_prefix')}
              <strong>{t('who_can.body_p2_acronym')}</strong>
              {t('who_can.body_p2_middle')}
              <strong>{t('who_can.body_p2_pillars')}</strong>
              {t('who_can.body_p2_and')}
              <strong>{t('who_can.body_p2_security')}</strong>
              {t('who_can.body_p2_suffix')}
            </p>
          </div>
        </section>

        {/* ── Impact Booths ────────────────────────────────────── */}
        <section id="impact" className={cn(css['impact-section'], css['scroll-anchor'])}>
          <div className={css['impact-text']}>
            <p className={css['eyebrow']}>{t('impact.eyebrow')}</p>
            <h3 className={css['heading-3']}>{t('impact.heading')}</h3>
            <p className={css['details-lead-bold']}>{t('impact.body_strong')}</p>
            <p className={css['body']}>{t('impact.body_intro')}</p>
            <ul className={css['impact-tracks']}>
              {(t.raw('impact.tracks') as Array<{ strong: string; body: string }>).map((track, i) => (
                <li key={i}>
                  <strong>{track.strong}</strong>
                  {track.body}
                </li>
              ))}
            </ul>
          </div>
          <div className={css['impact-cta-wrap']}>
            <div className={css['impact-glyph']} aria-hidden="true">
              <ImpactGlyph />
            </div>
            <Link to={APPLY_URL} className={css['btn-outline']}>
              {t('impact.cta')}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </section>

        {/* ── CROPS values ─────────────────────────────────────── */}
        <section id="values" className={cn(css['values-section'], css['scroll-anchor'])}>
          <p className={css['section-label']}>{t('values.label')}</p>
          <div className={css['crops-display']} aria-hidden="true">
            <div className={css['crops-watermark']}>{t('values.watermark')}</div>
            <div className={css['crops-pillars']}>
              {cropsPillars.map((p, i) => (
                <WritingText
                  key={p}
                  text={p}
                  triggerOnScroll
                  delay={i * 0.18}
                  stagger={0.06}
                  stiffness={150}
                  damping={18}
                />
              ))}
            </div>
          </div>
          <p className={css['sr-only']}>
            {t('values.watermark')}: {cropsPillars.join(', ')}.
          </p>
        </section>

        {/* ── Apply Now pill + contact note ────────────────────── */}
        <section id="apply" className={cn(css['apply-section'], css['scroll-anchor'])}>
          <div className={css['apply-pill']}>
            <span className={css['apply-pill-label']}>{t('apply.label')}</span>
            <ApplyButton label={t('apply.cta')} className={css['apply-pill-btn']} />
          </div>
          <p className={css['contact-note']}>
            {t('apply.review_prefix')}
            <strong>{t('apply.review_strong')}</strong>
            {t('apply.review_suffix')}
            <br />
            {t('apply.contact_prefix')}
            <a href={`mailto:${t('apply.contact_email')}`} className={css['inline-link']}>
              <strong>{t('apply.contact_email')}</strong>
            </a>
          </p>
        </section>

        {/* ── Socials ──────────────────────────────────────────── */}
        <section className={css['socials-section']}>
          <p className={css['socials-label']}>{t('socials_label')}</p>
          <div className={css['social-icons']}>
            <a
              href="https://x.com/efdevcon"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className={css['social-icon']}
            >
              <Twitter size={16} strokeWidth={1.6} />
            </a>
            <a
              href="https://github.com/efdevcon"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className={css['social-icon']}
            >
              <Github size={16} strokeWidth={1.6} />
            </a>
            <a
              href="https://forum.devcon.org"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Forum"
              className={css['social-icon']}
            >
              <MessageSquare size={16} strokeWidth={1.6} />
            </a>
          </div>
        </section>

        {/* ── Art outro band ───────────────────────────────────── */}
        <section className={cn(css['art-overlay'], 'expand')}>
          <Image src={HeroBackground} alt="" className={css['art-overlay-bg']} fill sizes="100vw" />
        </section>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return { props: {} }
}
