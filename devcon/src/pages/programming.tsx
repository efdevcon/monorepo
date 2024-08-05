import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import HeroBackground from 'assets/images/pages/hero-bgs/programming.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesProgramming, PagesQuery } from '../../tina/__generated__/types'
import SpeakersBackground from 'assets/images/pages/program.svg'
import CallToAction from 'components/common/card/CallToActionCard'
import RichText from 'lib/components/tina-cms/RichText'
import cn from 'classnames'
import InfiniteScroller from 'lib/components/infinite-scroll'
import TrackList from 'components/domain/index/track-list'
import css from './programming.module.scss'
import indexCss from './index.module.scss'
import { motion } from 'framer-motion'
import { Link } from 'components/common/link'
import { Button } from 'lib/components/button'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'

import CoreProtocol from 'assets/images/programming/CoreProtocol.png'
import Cypherpunk from 'assets/images/programming/Cypherpunk.png'
import Usability from 'assets/images/programming/Usability.png'
import RealWorldEthereum from 'assets/images/programming/RealWorldEthereum.png'
import AppliedCryptography from 'assets/images/programming/AppliedCryptography.png'
import CryptoEconomics from 'assets/images/programming/CryptoEconomics.png'
import Coordination from 'assets/images/programming/Coordination.png'
import DeveloperExperience from 'assets/images/programming/DeveloperExperience.png'
import Security from 'assets/images/programming/Security.png'
import Layer2 from 'assets/images/programming/Layer2.png'

export default pageHOC(function Programming(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesProgramming
  const faq = pages.faq
  const [openFAQ, setOpenFAQ] = React.useState<string | null>(null)

  const formattedTracks = (() => {
    const tracks = pages.track_descriptions

    return tracks?.map((track: any) => {
      let trackLogo = CoreProtocol

      if (track.id === 'core-protocol') {
        trackLogo = CoreProtocol
      }
      if (track.id === 'cypherpunk') {
        trackLogo = Cypherpunk
      }
      if (track.id === 'usability') {
        trackLogo = Usability
      }
      if (track.id === 'real-world-ethereum') {
        trackLogo = RealWorldEthereum
      }
      if (track.id === 'applied-cryptography') {
        trackLogo = AppliedCryptography
      }
      if (track.id === 'crypto-economics') {
        trackLogo = CryptoEconomics
      }
      if (track.id === 'coordination') {
        trackLogo = Coordination
      }
      if (track.id === 'developer-experience') {
        trackLogo = DeveloperExperience
      }
      if (track.id === 'security') {
        trackLogo = Security
      }
      if (track.id === 'layer-2s') {
        trackLogo = Layer2
      }

      return {
        id: track.id,
        title: track.name,
        body: track.description,
        tags: track.tags,
        logo: trackLogo,
      }
    })
  })()

  return (
    <Page theme={themes['purple']}>
      <PageHero
        title="Program"
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Event</span> }, { text: 'Programming' }]}
        navigation={[
          {
            title: 'Overview',
            to: '#overview',
          },
          {
            title: 'Tracks',
            to: '#tracks',
          },
          {
            title: 'RFP',
            to: '#rfp',
          },
          {
            title: 'FAQ',
            to: '#faq',
          },
        ]}
      />

      <div className="section" id="overview">
        <div className={cn('flex justify-between gap-8 flex-col lg:flex-row mb-8')}>
          <div className="grow">{pages?.overview?.intro && <RichText content={pages.overview.intro} />}</div>
          <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[550px]">
            <CallToAction
              color="purple"
              title={'Speaker Applications'}
              tag="Applications Closed"
              BackgroundSvg={SpeakersBackground}
              // link={pages.overview?.button?.link}
              // linkText={pages.overview?.button?.text}
              meta=""
            >
              {pages?.overview?.speaker_applications && <RichText content={pages.overview.speaker_applications} />}
            </CallToAction>
          </div>
        </div>
      </div>

      <div className="section" id="tracks">
        <div
          className={cn('flex justify-between gap-8 flex-col pb-24 pt-8 lg:flex-row border-top border-bottom relative')}
        >
          <div className="grow">{pages?.tracks && <RichText content={pages.tracks} />}</div>
          <div className={`${indexCss['scrolling-text-background']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">TRACKS OVERVIEW&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>
      </div>

      <div className="section relative max-w-[100vw] overflow-hidden">
        <TrackList isThailand tracks={formattedTracks || props.tracks} title="Hover over cards to read more" />

        <div className="pb-4"></div>
      </div>

      <div className="section mt-8" id="rfp">
        <div className={cn('flex flex-col justify-between gap-4 pb-8 pt-8 border-top border-bottom relative')}>
          <div className={`${indexCss['scrolling-text-background']} ${indexCss['alternate']} ${css['fade-color']}`}>
            <InfiniteScroller nDuplications={2} speed="120s" reverse>
              <p className="bold">REQUEST FOR PROPOSALS&nbsp;</p>
            </InfiniteScroller>
          </div>

          {pages?.rfp?.description && <RichText content={pages.rfp?.description} />}

          <div className="flex flex-col gap-4">
            {pages.rfp?.steps?.map(({ title, answer }: any, index: number) => {
              // @ts-ignore
              const isLast = pages.rfp.steps.length - 1 === index

              return (
                <div className={cn('flex flex-col', { 'border-bottom pb-8': !isLast })} key={index}>
                  <div className="flex items-center mb-4">
                    <button className={cn(css['round-button'], 'mr-3 shrink-0')}>
                      <span>{index + 1}</span>
                    </button>
                    <div className="bold h5 flex items-center justify-center">{title}</div>
                  </div>

                  <div className="text">
                    <RichText content={answer}></RichText>
                  </div>
                </div>
              )
            })}
          </div>

          <Link to={pages.rfp?.button?.link} className="self-start mt-3">
            <Button fat fill color="purple-1">
              {pages.rfp?.button?.text}
            </Button>
          </Link>
        </div>
      </div>

      <div className="section relative">
        <div className="anchor absolute -top-20" id="faq"></div>
        <div className="mt-8 h2 bold mb-6">Frequently Asked</div>
        <div className="flex flex-col">
          {faq?.map(({ question, answer }: any) => {
            const open = question === openFAQ

            return (
              <div key={question} className="w-full border-[#E2E3FF] bg-[#F8F9FE] rounded-xl shadow mb-4 ">
                <div
                  className="w-full p-4 bold cursor-pointer select-none hover:opacity-70 flex justify-between items-center"
                  onClick={() => setOpenFAQ(open ? null : question)}
                >
                  {question}
                  <div className="flex opacity-60">{open ? <ChevronUp /> : <ChevronDown />}</div>
                </div>

                {open && (
                  <motion.div
                    initial={{ y: '-20%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 100 }}
                    className="w-full p-4 pt-2"
                  >
                    <RichText content={answer}></RichText>
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>

        <div className="grow mt-4">
          {pages?.additional_questions && <RichText content={pages.additional_questions} />}
        </div>
      </div>

      <div className="section" id="overview">
        <div className="flex border-top mt-8 pt-8 mb-12">
          <div className="grow">{pages?.supporters_tickets && <RichText content={pages.supporters_tickets} />}</div>
        </div>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const content = await client.queries.pages({ relativePath: 'programming.mdx' })

  return {
    props: {
      ...globalData,
      page: {},
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}
