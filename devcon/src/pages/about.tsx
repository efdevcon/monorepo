import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { Carousel } from 'components/common/carousel'
import { Snapshot } from 'components/common/snapshot'
import IconCovid from 'assets/icons/covid.svg'
import IconClock from 'assets/icons/icon_clock.svg'
import IconGlobe from 'assets/icons/icon_globe.svg'
import IconManAtDesk from 'assets/icons/man-desk.svg'
import IconYoutube from 'assets/icons/youtube.svg'
import css from './about.module.scss'
import { VideoCard } from 'components/common/card/VideoCard'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import About1 from 'assets/images/carousel/about/about-1.jpg'
import About2 from 'assets/images/carousel/about/about-2.jpg'
import About3 from 'assets/images/carousel/about/about-3.jpg'
import About4 from 'assets/images/carousel/about/about-4.jpg'
import RichText from 'lib/components/tina-cms/RichText'
import HeroBackground from 'assets/images/pages/hero-bgs/about.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesAbout, PagesQuery } from '../../tina/__generated__/types'
import InfiniteScroller from 'lib/components/infinite-scroll'
import indexCss from './index.module.scss'
import cn from 'classnames'

const videos = [
  {
    edition: 4,
    title: 'The Web We Want',
    description:
      "Brewster Kahle discusses the Internet Archive's history & attempt at decentralization, the technology that's currently in place, and what's needed from the community. He also discusses the benefits of decentralization, the steps that will need to be taken to get there, and the challenges we'll need to overcome on the way. The presentation is followed by a Q&A session.",
    youtubeUrl: 'https://youtu.be/rkdFko6wNuc',
    ipfsHash: 'QmaG5FABdzx7F1FYvUKc47QSVs3L33WrUCXopY5KFwV9Eq',
    image: '../../../../../../static/assets/uploads/videos/brewster-kahle.png',
    archiveUrl: 'https://archive.devcon.org/archive/watch/4/the-web-we-want/?tab=YouTube',
    imageUrl: '/assets/uploads/videos/brewster-kahle.png',
    duration: 2265,
    expertise: 'Beginner',
    type: 'Talk',
    track: 'Society and Systems',
    keywords: ['web3', 'internet', 'privacy'],
    tags: ['Society and Systems'],
    speakers: ['Brewster Kahle'],
  },
  {
    edition: 4,
    title: 'Ethereum Foundation Values',
    description:
      'Aya Miyaguchi, Executive Director of the Ethereum Foundation, discusses the values, philosophy, structure & purpose of the EF, as well as her history & thoughts on decentralization, and urges us to remember why we continue to build Ethereum.',
    youtubeUrl: 'https://youtu.be/R7FjX0GEiAM',
    image: '../../../../../../static/assets/uploads/videos/aya-miyaguchi.png',
    archiveUrl: 'https://archive.devcon.org/archive/watch/4/ethereum-foundation-values/',
    imageUrl: '/assets/uploads/videos/aya-miyaguchi.png',
    ipfsHash: 'QmRVkynx93Hxyyp8FxzN5gzp3RoL7AmVkfEkzE1PF7nky1',
    duration: 1097,
    expertise: 'Beginner',
    type: 'Talk',
    track: 'Devcon',
    keywords: ['EF', 'updates'],
    tags: ['Devcon'],
    speakers: ['Aya Miyaguchi'],
  },
  {
    edition: 4,
    title: 'Money is the killer Ðapp: crypto in Venezuela',
    description:
      "We want to talk about real-world cryptocurrency use in avoiding forex controls, preserving one's wealth while fleeing an authoritarian regime, and escaping hyperinflation. Venezuela is in a deep economic crisis of its own making: relentless money printing and disastrous fiscal policies have brought the country to the edge of collapse. Eduardo will tell his own story of people using cryptocurrency as an unstoppable store of value and medium of exchange. Alejandro will recount how the crypto community, including projects like Zcash, BitcoinVenezuela.com, and MakerDAO, are researching how to allow Venezuelans to gain access to open money that, unlike the dying bolívar, will not consistently depreciate 50%+ each month, and that anybody could use.",
    youtubeUrl: 'https://youtu.be/aHe8xJK2lb0',
    ipfsHash: 'QmdrbJ8m49vx895xcfAFzcrbxVzRRBHjASUR4rcnwPaNg6',
    archiveUrl: 'https://archive.devcon.org/archive/watch/4/money-is-the-killer-dapp-crypto-in-venezuela/?tab=YouTube',
    duration: 1543,
    expertise: 'Beginner',
    type: 'Talk',
    track: 'Society and Systems',
    keywords: ['wealth', 'hyperinflation', 'economics', 'policy', 'store of value', 'currency'],
    tags: ['Society and Systems'],
    speakers: ['Alejandro Machado', 'Eduardo Gomez'],
  },
  {
    edition: 5,
    title: 'Money At The Edge: How People Stay Afloat in Venezuela',
    description:
      "The Open Money Initiative has gone into the field to understand how Venezuelans survive in the midst of heavy capital controls, criminalization of free markets, and hyperinflation. We'll share stories from places like Cúcuta, where worthless bills are used as art and home decor, and Caracas, where individuals are saving in bitcoin, trading it for local currency only at times of essential purchases. We'll discuss concepts for products and services in places where regimes have a tight grip on society, and how they relate to cryptocurrency.",
    youtubeUrl: 'https://youtu.be/EKhPppYixDs',
    ipfsHash: 'QmcptKr3evwmNKX6NKECoS3V6HfrLn2miB3RofCGfHTvMX',
    archiveUrl:
      'https://archive.devcon.org/archive/watch/5/money-at-the-edge-how-people-stay-afloat-in-venezuela/?tab=YouTube',
    duration: 1255,
    expertise: 'Beginner',
    type: 'Talk',
    track: 'Society and Systems',
    keywords: ['open money initiative', 'venezuela', 'general'],
    tags: ['Society and Systems'],
    speakers: ['Alejandro Machado'],
  },
  {
    edition: 5,
    title: 'Living On Defi',
    description:
      "Living in Argentina but getting paid in Dai, I can access financial systems that are usually not available to us. I want to show how Ethereum's DeFi movement has been working fine for the last 2 years, by leveraging Dai and secondary lending platforms, and how that is changing the financial reality for people in developing economies. Someone in South America getting paid in crypto can access more stable currencies than their local ones, with better interest rates, and this is all happening right now, and scaling right now.",
    youtubeUrl: 'https://youtu.be/hHji4x5C1q0',
    ipfsHash: 'QmZwoszpv2V5BoWR4RLseB2nhHH5uqz8NQybaULLfM9ZjJ',
    archiveUrl: 'https://archive.devcon.org/archive/watch/5/living-on-defi/?tab=YouTube',
    duration: 1177,
    expertise: 'Beginner',
    type: 'Talk',
    track: 'Society and Systems',
    keywords: ['DeFi', 'general'],
    tags: ['Society and Systems'],
    speakers: ['Mariano Conti'],
  },
]

export default function AboutPage(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesAbout

  return (
    <Page theme={themes['about']}>
      <PageHero
        title="About"
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">About</span> }, { text: 'Devcon' }]}
        navigation={[
          {
            title: 'Devcon',
            to: '#intro',
          },
          {
            title: 'For Builders',
            to: '#builders',
          },
          {
            title: 'Communities',
            to: '#communities',
          },
          {
            title: 'Get Involved',
            to: '#get-involved',
          },
        ]}
      />

      <div className={`section ${css['about']}`}>
        <div className={`two-columns relative pb-12`}>
          <div className={`left section-markdown ${css['intro-left']}`}>
            <RichText content={pages.what_is_devcon} />
          </div>

          <div className={`right ${css['intro-right']}`}>
            <h2 className="spaced">Devcon by Numbers</h2>

            <Snapshot
              items={[
                {
                  Icon: IconClock,
                  title: 'Devcon 0',
                  right: <span className={css['theme-colored']}>2014</span>,
                },
                {
                  Icon: IconCovid,
                  title: 'Devcon 7',
                  right: <span className={css['theme-colored']}>2024</span>,
                },
                {
                  Icon: IconManAtDesk,
                  title: 'Past Editions',
                  right: <span className={css['theme-colored']}>8</span>,
                },
                {
                  Icon: IconGlobe,
                  title: 'Continents Travelled',
                  right: <span className={css['theme-colored']}>3</span>,
                },
                {
                  Icon: IconYoutube,
                  title: 'Archived Videos',
                  right: <span className={css['theme-colored']}>727</span>,
                },
              ]}
            />
          </div>

          <div className={`${indexCss['scrolling-text-background']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">DEVCON&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>

        <div className={`two-columns relative clear-bottom border-bottom margin-bottom border-top clear-top`}>
          <div className={`left section-markdown`}>
            <RichText content={pages.for_whom} />
          </div>

          <div className={`right ${css['for-builders-right']} mt-4`}>
            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className={css['videos']}>
                {videos.map((video: any) => {
                  const isMatch = ['The Web We Want', 'Ethereum Foundation Values'].includes(video.title)

                  if (!isMatch) return null

                  return <VideoCard key={video.title} video={{ ...video, url: video.archiveUrl }} />
                })}
              </div>
            </SwipeToScroll>
          </div>
        </div>

        <h2 className="spaced" id="communities">
          Growing Global Communities
        </h2>

        <div id="carousel" className="expand clear-bottom">
          <Carousel
            title="Creating Global Communities"
            images={[
              {
                alt: 'About 1',
                src: About1,
              },
              {
                alt: 'About 2',
                src: About2,
              },
              {
                alt: 'About 3',
                src: About3,
              },
              {
                alt: 'About 4',
                src: About4,
              },
            ]}
          />
        </div>

        <div className="two-columns clear-bottom border-bottom">
          <div className="left">
            <RichText content={pages.global_communities} />
          </div>
          <div className={`right ${css['community']}`}>
            <RichText content={pages.global_communities_right} />

            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className={cn(css['videos'], 'mt-6')}>
                {videos.map((video: any) => {
                  const isMatch = [
                    'Living On Defi',
                    'Money At The Edge: How People Stay Afloat in Venezuela',
                    'Money is the killer Ðapp: crypto in Venezuela',
                  ].includes(video.title)

                  if (!isMatch) return null

                  return <VideoCard compact key={video.title} video={{ ...video, url: video.archiveUrl }} />
                })}
              </div>
            </SwipeToScroll>
          </div>
        </div>

        <div className="mt-8 mb-8">{pages?.ctas && <RichText content={pages.ctas} />}</div>
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  const content = await client.queries.pages({ relativePath: 'about.mdx' })

  return {
    props: {
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}
