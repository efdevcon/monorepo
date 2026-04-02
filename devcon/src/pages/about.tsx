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

const videos = [
  {
    title: 'Ethereum in 30 Minutes',
    description: "Vitalik Buterin opens Devcon with a comprehensive overview of Ethereum's evolution as a decentralized world computer, explaining its layer 1 trust machine and layer 2 scaling solutions.",
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
    description: "Roger Dingledine shares lessons from Tor's twenty years as free software fighting for privacy and human rights, covering distributed trust and privacy by design.",
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
    description: 'Argentina is uniquely positioned to capitalize on the technological and economic opportunities of this century. This talk presents a compelling case for the creation of a Special Economic Zone.',
    youtubeUrl: 'https://youtu.be/xiCG85_ChsM',
    archiveUrl: 'https://archive.devcon.org/devcon-7/argentinas-opportunity-and-the-case-for-a-special-economic-zone/?tab=YouTube',
    duration: 520,
    expertise: 'Beginner',
    type: 'Lightning Talk',
    tags: ['Society and Systems'],
    speakers: ['Maria Milagros Santamaria'],
    edition: 7,
  },
  {
    title: 'Blockchain for Humanitarian Aid Disbursements',
    description: 'Learnings from pilots in Nepal with Rahat, a blockchain-based platform for underbanked and unbanked communities, including use of stablecoins for aid.',
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
    description: 'An exploration of Thai culture through the lens of technology, combining beats, cities, and dances with creative hacking.',
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

export default function AboutPage() {
  return (
    <Page theme={themes['about']} withHero darkFooter>
      <PageHero
        className={`${heroCss['hero-no-side-gradient']} !mb-0`}
        titleClassName={heroCss['hero-title']}
        title="About"
        heroBackground={HeroBackground}
        path={[]}
        navigation={[
          { title: 'Devcon', to: '#intro' },
          { title: 'For Builders', to: '#builders' },
          { title: 'Communities', to: '#communities' },
          { title: 'Why Devcon India', to: '#why-india' },
          { title: 'Get Involved', to: '#get-involved' },
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
          background: 'radial-gradient(ellipse at center bottom, rgba(255,194,153,0.3) 0%, rgba(253,222,203,0.15) 40%, transparent 80%)',
        }}
      >
        <div className="two-columns" style={{ gap: '2rem' }}>
          <div className="left">
            <h2 style={{ fontWeight: 800, fontSize: 32, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
              What is Devcon?
            </h2>
            <p style={{ fontSize: 20, lineHeight: '28.8px', color: '#1a0d33', letterSpacing: '-0.25px', marginBottom: 16 }}>
              Devcon is the Ethereum conference that brings decentralized protocols, tools, and culture to the world.
            </p>
            <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 24 }}>
              An intensive introduction for new Ethereum explorers and a global family reunion for those already a part of our ecosystem; programming covers content ranging from the deeply technical to the profoundly human.
            </p>
            <Link to="/past-events" className="flex items-center justify-center gap-2 bg-[#7235ed] text-white font-bold text-base rounded-full px-8 py-3 w-full lg:w-fit hover:scale-[1.02] transition-transform">
              View Past Events
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="right">
            <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 24 }}>
              By the numbers
            </h3>
            <Snapshot
              items={[
                { Icon: Clock4, title: 'DEVCON 0', right: <span style={{ color: '#FF6600', fontWeight: 700 }}>2014</span> },
                { Icon: Sun, title: 'DEVCON 7', right: <span style={{ color: '#FF6600', fontWeight: 700 }}>2024</span> },
                { Icon: History, title: 'PAST EDITIONS', right: <span style={{ color: '#FF6600', fontWeight: 700 }}>8</span> },
                { Icon: Globe, title: 'CONTINENTS', right: <span style={{ color: '#FF6600', fontWeight: 700 }}>4</span> },
                { Icon: CirclePlay, title: 'ARCHIVED VIDEOS', right: <span style={{ color: '#FF6600', fontWeight: 700 }}>727</span> },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Why Devcon India */}
      <div id="why-india" className="section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <h2 style={{ fontWeight: 800, fontSize: 32, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 32 }}>
          Why Devcon India?
        </h2>
        <div className="two-columns" style={{ gap: '2rem', marginBottom: 32 }}>
          <div className="left">
            <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
              India is where Ethereum is being built for the world
            </h3>
            <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>
              {`India has one of the world's most extraordinary concentrations of engineering talent — and its fastest-growing Ethereum developer community. The work happening here is not peripheral to Ethereum's development. Infrastructure, ZK identity systems, and coordination layers built in India power Ethereum globally.`}
            </p>
          </div>
          <div className="right">
            <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
              Where sovereignty is built at scale
            </h3>
            <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>
              {`India is the home of engineers who didn't wait for permission, in a country that leapfrogged the entire technological generation. Building at scale creates innovation at scale. Devcon isn't coming to Mumbai to introduce Ethereum to India. Devcon 8 is in Mumbai to recognize and champion what India is already building.`}
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
          {[
            { number: 1, prefix: '# ', suffix: '', decimals: 0, desc: 'India leads in new crypto developer onboarding', source: 'Electric Capital', url: 'https://www.electriccapital.com/' },
            { number: 17, prefix: '', suffix: '%', decimals: 0, desc: 'Of all new global crypto developers in 2024', source: 'Electric Capital', url: 'https://www.electriccapital.com/' },
            { number: 2.55, prefix: '', suffix: 'M', decimals: 2, desc: 'STEM graduates per year - 2nd globally', source: 'Airswift', url: 'https://www.airswift.com/' },
            { number: 564, prefix: '$', suffix: 'M', decimals: 0, desc: 'Web3 funding raised in 2024 (up 109% YoY)', source: 'Hashed Emergent', url: 'https://www.hashedem.com/' },
          ].map(item => (
            <div key={item.desc} className="flex-1 min-w-full md:min-w-[200px]">
              <p style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px' }}>
                <CountingNumber number={item.number} prefix={item.prefix} suffix={item.suffix} decimalPlaces={item.decimals} />
              </p>
              <p style={{ fontSize: 16, lineHeight: '24px', color: '#1a0d33', marginTop: 4 }}>{item.desc}</p>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-2 text-xs text-[#7235ed] underline">
                {item.source} <ExternalLink size={12} />
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
          title="Creating Global Communities"
          marqueeClassName="!h-full"
          images={[
            { alt: 'About 1', src: About1 },
            { alt: 'About 2', src: About2 },
            { alt: 'About 3', src: About3 },
            { alt: 'About 4', src: About4 },
          ]}
        />
      </div>

      {/* Section 4: For Builders */}
      <div id="builders" className="section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="two-columns lg:items-center" style={{ gap: '2rem' }}>
          <div className="left">
            <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
              Devcon is for builders of all kind
            </h3>
            <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 16 }}>
              {`Devcon always had a heavy technical focus to it, and this will remain true this year and into the future (it's the DEVelopers CONference after all!). Though Ethereum is a technological breakthrough in its own right, its applications reach much further, into digital economy, research, community, art, and beyond.`}
            </p>
            <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>
              Devcon is not only for developers, it is for builders of all kinds: engineers, designers, researchers, infrastructure operators, community organizers, social economists, artists, and more. So we want to invite everyone who is looking to build and create to improve our existing world using Ethereum and decentralized systems.
            </p>
          </div>
          <div className="right" style={{ marginTop: 0 }}>
            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                {videos.filter(v => ['Ethereum in 30 Minutes', 'Lessons Learned from Tor'].includes(v.title)).map(v => (
                  <div key={v.title} style={{ width: 300, flexShrink: 0 }}>
                    <VideoCard className="!bg-white rounded-2xl" video={{ ...v, slug: v.archiveUrl }} />
                  </div>
                ))}
              </div>
            </SwipeToScroll>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid rgba(34, 17, 68, 0.1)', margin: '3rem 0' }} />

        {/* Growing global communities */}
        <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
          Growing global communities
        </h3>
        <div className="two-columns" style={{ gap: '0rem', marginBottom: 24 }}>
          <div className="left">
            <p style={{ fontSize: 20, lineHeight: '28.8px', color: '#221144', letterSpacing: '-0.25px', marginBottom: 16 }}>
              {`We could host Devcon in the same place every year, sure! But we're working toward achieving a goal of bringing Ethereum to communities around the world, and to places where it can have real impact today.`}
            </p>
            <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144' }}>
              <em>{`"The difference between Argentina and some of the wealthier countries is that in wealthier places, there are people who are excited about crypto ideas and theory, but people here deeply understand that crypto is solving real problems."`}</em>
              <br />— Vitalik Buterin
            </p>
          </div>
          <div className={`right ${css['community']}`}>
            <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 16 }}>
              {`Ethereum isn't merely a technical solution, but a community. While blockchain communities in Europe and North America are already strong and vivid, we can have a big impact today in newly developing communities.`}
            </p>
            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className={css['videos']}>
                {videos.filter(v => ["Argentina\u2019s Opportunity & the Case for a Special Economic Zone", 'Blockchain for Humanitarian Aid Disbursements', 'Hacking Thai Beats, Cities & Dances'].includes(v.title)).map(v => (
                  <VideoCard compact key={v.title} className="!bg-white rounded-2xl" video={{ ...v, slug: v.archiveUrl }} />
                ))}
              </div>
            </SwipeToScroll>
          </div>
        </div>
        <Link
          to="https://archive.devcon.org"
          className="flex items-center gap-2 bg-[rgba(255,255,255,0.8)] border border-[rgba(34,17,68,0.1)] text-[#1a0d33] font-bold text-base rounded-full px-8 py-3 w-fit hover:scale-[1.02] transition-transform"
        >
          Devcon Archive
          <ArrowUpRight size={16} />
        </Link>
      </div>

      </div>{/* end bg gradient wrapper */}

      {/* Section 5: Share your ideas (DIPs) */}
      <div
        id="get-involved"
        style={{ background: '#fff0e6', padding: '3rem 0' }}
      >
        <div className="section">
          <h3 style={{ fontWeight: 800, fontSize: 24, color: '#160b2b', letterSpacing: '-0.5px', marginBottom: 16 }}>
            Share your ideas &amp; improve Devcon
          </h3>
          <p style={{ fontSize: 16, lineHeight: '24px', color: '#221144', marginBottom: 24 }}>
            {`We're always striving to improve Devcon for everyone, and we love dogfooding Ethereum projects. `}
            <strong>{`'Devcon Improvement Proposals' (DIPs)`}</strong>
            {` are your opportunity to share your ideas and `}
            <Link to="/dips" style={{ color: '#7235ed', textDecoration: 'underline' }}>make a proposal on how to improve Devcon!</Link>
          </p>
          <Link
            to="/dips"
            className="flex items-center gap-2 bg-[rgba(255,255,255,0.8)] border border-[rgba(34,17,68,0.1)] text-[#1a0d33] font-bold text-base rounded-full px-8 py-3 w-fit hover:scale-[1.02] transition-transform"
          >
            Learn more
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
