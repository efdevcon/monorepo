import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { GetPage, GetTracks } from 'services/page'
import { usePageContext } from 'context/page-context'
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

export default pageHOC(function Programming(props: any) {
  const pageContext = usePageContext()
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesProgramming
  const faq = pages.faq
  const [openFAQ, setOpenFAQ] = React.useState<string | null>(null)

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
          <div className="flex-0 shrink-0 max-w-[100%] w-[600px]">
            <CallToAction
              color="purple"
              title={'Speaker Applications'}
              tag="Coming Soon"
              BackgroundSvg={SpeakersBackground}
              link={pages.overview?.button?.link}
              linkText={pages.overview?.button?.text}
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

      <div className="section">
        <TrackList tracks={props.tracks} />
      </div>

      <div className="section mt-8" id="rfp">
        <div className={cn('flex flex-col justify-between gap-4 pb-8 pt-8 border-top border-bottom relative')}>
          <div className={`${indexCss['scrolling-text-background']} ${indexCss['alternate']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">REQUESTS FOR PROPOSALS&nbsp;</p>
            </InfiniteScroller>
          </div>

          {pages?.rfp?.description && <RichText content={pages.rfp?.description} />}

          <div className="flex flex-col gap-4">
            {pages.rfp?.steps?.map(({ title, answer }: any, index: number) => {
              return (
                <div className="flex flex-row" key={index}>
                  <button className={cn(css['round-button'], 'mr-4 shrink-0')}>
                    <span>{index + 1}</span>
                  </button>
                  <div className="flex flex-col">
                    <div className="bold mb-4 h5">{title}</div>
                    <div className="text-sm">
                      <RichText content={answer}></RichText>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Link to={pages.rfp?.button?.link} className="self-start">
            <Button fat fill color="purple-1" className="mt-4">
              {pages.rfp?.button?.text}
            </Button>
          </Link>
        </div>
      </div>

      <div className="section" id="faq">
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
        <div className="flex flex-col border-top mt-8 pt-8 mb-16">
          <div className="grow">{pages?.supporters_tickets && <RichText content={pages.supporters_tickets} />}</div>
        </div>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  // await GetPage('terms-of-service', context.locale)

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
      tracks: GetTracks(context.locale),
    },
  }
}
