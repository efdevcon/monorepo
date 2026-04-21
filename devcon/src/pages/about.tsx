import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import heroCss from './tickets/tickets-landing.module.scss'
import { Carousel } from 'components/common/carousel'
import { Snapshot } from 'components/common/snapshot'
import css from './about.module.scss'
import About1 from 'assets/images/carousel/about/about-1.jpg'
import About2 from 'assets/images/carousel/about/about-2.jpg'
import About3 from 'assets/images/carousel/about/about-3.jpg'
import About4 from 'assets/images/carousel/about/about-4.jpg'
import HeroBackground from './past-events-hero.png'
import { Link } from 'components/common/link'
import { LargeCallout } from 'components/domain/landing-page/LargeCallout'
import { VideoCard } from 'components/common/card/VideoCard'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll-native/SwipeToScroll'
import { Clock4, Sun, History, Globe, CirclePlay, ExternalLink, ArrowRight, ArrowUpRight } from 'lucide-react'
import { CountingNumber } from 'components/common/counting-number/CountingNumber'
import { useTranslations } from 'next-intl'

const videos = [
  {
    title: 'Ethereum in 30 Minutes',
    description:
      "Vitalik Buterin opens Devcon with a comprehensive overview of Ethereum's evolution as a decentralized world computer, explaining its layer 1 trust machine and layer 2 scaling solutions.",
    youtubeUrl: 'https://youtu.be/ei3tDRMjw6k',
    archiveUrl: 'https://archive.devcon.org/devcon-7/keynote-ethereum-in-30-minutes/?tab=YouTube',
    duration: 1800,
    expertise: 'Beginner',
    type: 'Keynote',
    tags: ['Devcon'],
    speakers: ['Vitalik Buterin'],
    edition: 7,
  },
  {
    title: 'Lessons Learned from Tor',
    description:
      "Roger Dingledine shares lessons from Tor's twenty years as free software fighting for privacy and human rights, covering distributed trust and privacy by design.",
    youtubeUrl: 'https://youtu.be/o302oKXbdK8',
    archiveUrl: 'https://archive.devcon.org/devcon-7/keynote-lessons-learned-from-tor/?tab=YouTube',
    duration: 1911,
    expertise: 'Beginner',
    type: 'Keynote',
    tags: ['Society and Systems'],
    speakers: ['Roger Dingledine'],
    edition: 7,
  },
  {
    title: "Argentina\u2019s Opportunity & the Case for a Special Economic Zone",
    description:
      'Argentina is uniquely positioned to capitalize on the technological and economic opportunities of this century. This talk presents a compelling case for the creation of a Special Economic Zone.',
    youtubeUrl: 'https://youtu.be/xiCG85_ChsM',
    archiveUrl:
      'https://archive.devcon.org/devcon-7/argentinas-opportunity-and-the-case-for-a-special-economic-zone/?tab=YouTube',
    duration: 520,
    expertise: 'Beginner',
    type: 'Lightning Talk',
    tags: ['Society and Systems'],
    speakers: ['Maria Milagros Santamaria'],
    edition: 7,
  },
  {
    title: 'Blockchain for Humanitarian Aid Disbursements',
    description:
      'Learnings from pilots in Nepal with Rahat, a blockchain-based platform for underbanked and unbanked communities, including use of stablecoins for aid.',
    youtubeUrl: 'https://youtu.be/tEWzrI83fgg',
    archiveUrl: 'https://archive.devcon.org/devcon-7/blockchain-for-humanitarian-aid-disbursements/?tab=YouTube',
    duration: 550,
    expertise: 'Beginner',
    type: 'Lightning Talk',
    tags: ['Society and Systems'],
    speakers: ['Rumee Singh', 'Arun Maharajan'],
    edition: 7,
  },
  {
    title: 'Hacking Thai Beats, Cities & Dances',
    description:
      'An exploration of Thai culture through the lens of technology, combining beats, cities, and dances with creative hacking.',
    youtubeUrl: 'https://youtu.be/WrWIehDVA8E',
    archiveUrl: 'https://archive.devcon.org/devcon-7/hacking-thai-beats-cities-and-dances/?tab=YouTube',
    duration: 522,
    expertise: 'Beginner',
    type: 'Talk',
    tags: ['Society and Systems'],
    speakers: ['Phoomparin Mano'],
    edition: 7,
  },
]

const STAT_META = [
  { number: 1, prefix: '# ', suffix: '', decimals: 0, source: 'Electric Capital', url: 'https://www.electriccapital.com/' },
  { number: 17, prefix: '', suffix: '%', decimals: 0, source: 'Electric Capital', url: 'https://www.electriccapital.com/' },
  { number: 2.55, prefix: '', suffix: 'M', decimals: 2, source: 'Airswift', url: 'https://www.airswift.com/' },
  { number: 564, prefix: '$', suffix: 'M', decimals: 0, source: 'Hashed Emergent', url: 'https://www.hashedem.com/' },
]

export default function AboutPage() {
  const t = useTranslations('about')

  const snapshotLabels = t.raw('intro.snapshot_labels') as {
    devcon_0: string
    devcon_7: string
    past_editions: string
    continents: string
    archived_videos: string
  }
  const whyIndiaStats = t.raw('why_india.stats') as Array<{ desc: string }>
  const carouselAlts = t.raw('communities.carousel_alts') as string[]

  return (
    <Page theme={themes['about']} withHero darkFooter>
      <PageHero
        className={`${heroCss['hero-no-side-gradient']} !mb-0`}
        titleClassName={heroCss['hero-title']}
        title={t('title')}
        heroBackground={HeroBackground}
        path={[]}
        navigation={[
          { title: t('nav.devcon'), to: '#intro' },
          { title: t('nav.for_builders'), to: '#builders' },
          { title: t('nav.communities'), to: '#communities' },
          { title: t('nav.why_india'), to: '#why-india' },
          { title: t('nav.get_involved'), to: '#get-involved' },
        ]}
      />

      <div style={{ background: 'linear-gradient(to bottom, #fbfafc 0%, #e5ebff 80%)' }}>
        {/* Section 1: What is Devcon + By the Numbers */}
        <div
          id="intro"
          className="section"
          style={{
            paddingTop: '2rem',
            paddingBottom: '2rem',
            background:
              'radial-gradient(ellipse at center bottom, rgba(255,194,153,0.3) 0%, rgba(253,222,203,0.15) 40%, transparent 80%)',
          }}
        >
          <div className="two-columns" style={{ gap: '2rem' }}>
            <div className="left">
              <h2 style={{ fontWeight: 800, fontSize: 32, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
                {t('intro.heading')}
              </h2>
              <p
                style={{
                  fontSize: 20,
                  lineHeight: '28.8px',
                  color: '#1a0d33',
                  letterSpacing: '-0.25px',
                  marginBottom: 16,
                }}
              >
                {t('intro.lead')}
              </p>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 24 }}>{t('intro.body')}</p>
              <Link
                to="/past-events"
                className="flex items-center justify-center gap-2 bg-[#7235ed] text-white font-bold text-base rounded-full px-8 py-3 w-full lg:w-fit hover:scale-[1.02] transition-transform"
              >
                {t('intro.cta')}
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="right">
              <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 24 }}>
                {t('intro.by_the_numbers_heading')}
              </h3>
              <Snapshot
                items={[
                  { Icon: Clock4, title: snapshotLabels.devcon_0, right: <span style={{ color: '#FF6600', fontWeight: 700 }}>2014</span> },
                  { Icon: Sun, title: snapshotLabels.devcon_7, right: <span style={{ color: '#FF6600', fontWeight: 700 }}>2024</span> },
                  { Icon: History, title: snapshotLabels.past_editions, right: <span style={{ color: '#FF6600', fontWeight: 700 }}>8</span> },
                  { Icon: Globe, title: snapshotLabels.continents, right: <span style={{ color: '#FF6600', fontWeight: 700 }}>4</span> },
                  { Icon: CirclePlay, title: snapshotLabels.archived_videos, right: <span style={{ color: '#FF6600', fontWeight: 700 }}>727</span> },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Why Devcon India */}
        <div id="why-india" className="section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: 32, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 32 }}>
            {t('why_india.heading')}
          </h2>
          <div className="two-columns" style={{ gap: '2rem', marginBottom: 32 }}>
            <div className="left">
              <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
                {t('why_india.subheading_1')}
              </h3>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>{t('why_india.body_1')}</p>
            </div>
            <div className="right">
              <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
                {t('why_india.subheading_2')}
              </h3>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>
                {t('why_india.body_2_prefix')}
                <strong>{t('why_india.body_2_strong')}</strong>
                {t('why_india.body_2_suffix')}
              </p>
            </div>
          </div>

          {/* Stats callout */}
          <div
            className="flex flex-col md:flex-row flex-wrap justify-between gap-8 rounded-2xl border border-[rgba(34,17,68,0.1)] px-6 md:px-16 py-8 mb-12"
            style={{
              background: 'radial-gradient(ellipse at center bottom, rgba(236,227,253,1) 0%, rgba(245,241,254,1) 100%)',
            }}
          >
            {STAT_META.map((meta, i) => (
              <div key={i} className="flex-1 min-w-full md:min-w-[200px]">
                <p style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px' }}>
                  <CountingNumber
                    number={meta.number}
                    prefix={meta.prefix}
                    suffix={meta.suffix}
                    decimalPlaces={meta.decimals}
                  />
                </p>
                <p style={{ fontSize: 16, lineHeight: '24px', color: '#1a0d33', marginTop: 4 }}>
                  {whyIndiaStats[i]?.desc}
                </p>
                <a
                  href={meta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-2 text-xs text-[#7235ed] underline"
                >
                  {meta.source} <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>

          {/* Large callout — reuse from index page */}
          <LargeCallout />
        </div>

        {/* Section 3: Creating Global Communities carousel */}
        <div id="communities" className="expand h-[50vh] lg:h-[38rem] overflow-hidden [&_[data-type=carousel]]:!h-full">
          <Carousel
            title={t('communities.carousel_title')}
            marqueeClassName="!h-full"
            images={[
              { alt: carouselAlts[0], src: About1 },
              { alt: carouselAlts[1], src: About2 },
              { alt: carouselAlts[2], src: About3 },
              { alt: carouselAlts[3], src: About4 },
            ]}
          />
        </div>

        {/* Section 4: For Builders */}
        <div id="builders" className="section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div className="two-columns lg:items-center" style={{ gap: '2rem' }}>
            <div className="left">
              <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
                {t('builders.heading')}
              </h3>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 16 }}>
                {t('builders.body_1')}
              </p>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>{t('builders.body_2')}</p>
            </div>
            <div className="right" style={{ marginTop: 0 }}>
              <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
                <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {videos
                    .filter(v => ['Ethereum in 30 Minutes', 'Lessons Learned from Tor'].includes(v.title))
                    .map(v => (
                      <div key={v.title} style={{ width: 300, flexShrink: 0 }}>
                        <VideoCard className="!bg-white rounded-2xl" video={{ ...v, slug: v.archiveUrl } as any} />
                      </div>
                    ))}
                </div>
              </SwipeToScroll>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid rgba(34, 17, 68, 0.1)', margin: '3rem 0' }} />

          {/* Growing global communities */}
          <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
            {t('builders.global_heading')}
          </h3>
          <div className="two-columns" style={{ gap: '0rem', marginBottom: 24 }}>
            <div className="left">
              <p
                style={{
                  fontSize: 20,
                  lineHeight: '28.8px',
                  color: '#221144',
                  letterSpacing: '-0.25px',
                  marginBottom: 16,
                }}
              >
                {t('builders.global_lead')}
              </p>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>
                <em>{t('builders.global_quote')}</em>
                <br />
                {t('builders.global_quote_attribution')}
              </p>
            </div>
            <div className={`right ${css['community']}`}>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 16 }}>
                {t('builders.global_right_body')}
              </p>
              <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
                <div className={css['videos']}>
                  {videos
                    .filter(v =>
                      [
                        'Argentina\u2019s Opportunity & the Case for a Special Economic Zone',
                        'Blockchain for Humanitarian Aid Disbursements',
                        'Hacking Thai Beats, Cities & Dances',
                      ].includes(v.title)
                    )
                    .map(v => (
                      <VideoCard
                        compact
                        key={v.title}
                        className="!bg-white rounded-2xl"
                        video={{ ...v, slug: v.archiveUrl } as any}
                      />
                    ))}
                </div>
              </SwipeToScroll>
            </div>
          </div>
          <Link
            to="https://archive.devcon.org"
            className="flex items-center gap-2 bg-[rgba(255,255,255,0.8)] border border-[rgba(34,17,68,0.1)] text-[#1a0d33] font-bold text-base rounded-full px-8 py-3 w-fit hover:scale-[1.02] transition-transform"
          >
            {t('builders.archive_cta')}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      {/* end bg gradient wrapper */}

      {/* Section 5: Share your ideas (DIPs) */}
      <div id="get-involved" style={{ background: '#fff0e6', padding: '3rem 0' }}>
        <div className="section">
          <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
            {t('get_involved.heading')}
          </h3>
          <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 24 }}>
            {t('get_involved.body_prefix')}
            <strong>{t('get_involved.body_strong')}</strong>
            {t('get_involved.body_middle')}
            <Link to="/dips" style={{ color: '#7235ed', textDecoration: 'underline' }}>
              {t('get_involved.body_link')}
            </Link>
          </p>
          <Link
            to="/dips"
            className="flex items-center gap-2 bg-[rgba(255,255,255,0.8)] border border-[rgba(34,17,68,0.1)] text-[#1a0d33] font-bold text-base rounded-full px-8 py-3 w-fit hover:scale-[1.02] transition-transform"
          >
            {t('get_involved.cta')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return { props: {} }
}
