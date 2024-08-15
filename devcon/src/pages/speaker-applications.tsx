import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import HeroBackground from 'assets/images/pages/hero-bgs/programming.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesProgramming, PagesSpeaker_Applications, PagesQuery } from '../../tina/__generated__/types'
import SpeakersBackground from 'assets/images/pages/program.svg'
import CallToAction from 'components/common/card/CallToActionCard'
import RichText from 'lib/components/tina-cms/RichText'
import cn from 'classnames'
import InfiniteScroller from 'lib/components/infinite-scroll'
import TrackList from 'components/domain/index/track-list'
import css from './speaker-applications.module.scss'
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
import SwipeToScroll from 'components/common/swipe-to-scroll'
import { Snapshot } from 'components/common/snapshot'
import SpeakerProcessImage from 'assets/images/dc-7/speaker-process.png'
import PencilIcon from 'assets/icons/pencil.svg'
import CalendarIcon from 'assets/icons/calendar.svg'
import VotingIcon from 'assets/icons/man-desk.svg'
import speaker_applications from '../../tina/templates/speaker_applications'
import Image from 'next/image'
import List from 'components/common/list'

export default pageHOC(function Programming(props: any) {
  const { data: dataSpeakers } = useTina<PagesQuery>(props.cmsSpeakers)
  const { data: dataProgramming } = useTina<PagesQuery>(props.cmsProgramming)
  const speakers = dataSpeakers.pages as PagesSpeaker_Applications
  const programming = dataProgramming.pages as PagesProgramming
  const [expandReviewCriteria, setExpandReviewCriteria] = React.useState(false)

  const steps = [
    speakers.who_can_apply,
    speakers.what_to_talk_about,
    speakers.which_session_types || {},
    speakers.application_timeline,
    speakers.review_process,
    speakers.decision,
    speakers.alternative_contributions,
  ]

  // const faq = pages.faq
  // const [openFAQ, setOpenFAQ] = React.useState<string | null>(null)

  const formattedTracks = (() => {
    const tracks = programming.track_descriptions

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
        title="Apply to Speak"
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Program</span> }, { text: 'Apply to Speak' }]}
        navigation={[
          {
            title: 'Overview',
            to: '#overview',
          },
          {
            title: 'Process',
            to: '#process',
          },
          {
            title: 'Guidelines',
            to: '#guidelines',
          },
          {
            title: 'FAQ',
            to: '#faq',
          },
        ]}
      />

      <div className="section" id="overview">
        <div className={cn('flex relative justify-between gap-8 border-bottom flex-col lg:flex-row mb-8 pb-8')}>
          <div className={`${indexCss['scrolling-text-background']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">SPEAKER APPLICATIONS&nbsp;</p>
            </InfiniteScroller>
          </div>
          <div className="grow">{speakers.apply_to_speak && <RichText content={speakers.apply_to_speak} />}</div>
          <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[550px]">
            <p className="text-lg bold mb-4">Important Dates</p>
            <Snapshot
              // @ts-ignore
              items={speakers.important_dates.snapshot.map(({ left, right }: any, index: number) => {
                let icon

                // TODO: Icon support in CMS
                if (index === 0) {
                  icon = PencilIcon
                }
                if (index === 1) {
                  icon = CalendarIcon
                }
                if (index === 2) {
                  icon = VotingIcon
                }

                return {
                  id: index,
                  Icon: icon,
                  left: left,
                  right: right,
                }
              })}
            />
          </div>
        </div>
      </div>

      <div className="section overflow-hidden" id="process">
        <div className="flex justify-between items-center">
          <p className="h2 bold">Process</p>
          <p className="uppercase text-xs opacity-70 bold">Scroll for more →</p>
        </div>
        <div className="expand-right flex relative my-4">
          <div className={css['mask']}></div>
          <SwipeToScroll noBounds>
            <div className="flex no-wrap w-[1897px] h-[333px] lg:w-[2508px] lg:h-[444px] pr-[64px]">
              <Image src={SpeakerProcessImage} className="max-w-none object-cover" alt="Speaker Application Process" />
            </div>
          </SwipeToScroll>
        </div>
      </div>

      <div className="section mb-4 overflow-hidden" id="guidelines">
        <div className="h2 bold py-8 mt-4 border-top">Application Guidelines</div>

        {/* <TrackList isThailand tracks={formattedTracks || props.tracks} title="Hover over cards to read more" /> */}

        <div className="flex flex-col gap-4">
          {steps.map(({ title, body }: any, index: number) => {
            // @ts-ignore
            const isLast = steps.length - 1 === index

            return (
              <div
                className={cn('flex flex-col relative', css['timeline-item'], { 'border-bottom pb-8': !isLast })}
                key={index}
              >
                <div className="flex items-center mb-4">
                  <button className={cn(css['round-button'], 'mr-3 shrink-0')}>
                    <span>{index + 1}</span>
                  </button>
                  <div className="bold h5 flex items-center justify-center">{title}</div>
                </div>

                <div className="text">
                  {index === 3 && (
                    <>
                      <div
                        className={`${indexCss['scrolling-text-background']} ${css['fade-color']} ${indexCss['alternate']} !top-[-16px]`}
                      >
                        <InfiniteScroller nDuplications={2} speed="120s">
                          <p className="bold">APPLICATION TIMELINE&nbsp;</p>
                        </InfiniteScroller>
                      </div>
                      <List
                        connectedItems
                        items={[
                          {
                            id: '1',
                            title: (
                              <div className="flex justify-between w-full max-w-[700px] text-base">
                                <div className="flex relative items-center">
                                  <div>Applications Open</div>
                                  {/* <div className="label purple rounded-lg !border-2 bold !text-xs ghost ml-2 !bg-white">
                                    live
                                  </div> */}
                                </div>
                                <div className="bold">July 9th</div>
                              </div>
                            ),
                            indent: false,
                            active: true,
                            body: '',
                          },
                          {
                            id: '2',
                            title: (
                              <div className="flex justify-between w-full max-w-[700px] text-base">
                                <div>Applications Close</div>
                                <div className="bold">August 4, 23:59 UTC</div>
                              </div>
                            ),
                            indent: false,
                            active: true,
                            body: '',
                          },
                        ]}
                      />
                      <div className="mt-4"></div>
                    </>
                  )}
                  {index !== 2 && <RichText content={body}></RichText>}

                  {index === 1 && (
                    <div>
                      <TrackList isThailand tracks={formattedTracks || props.tracks} title="Tracks" />
                      <div className="mt-6"></div>
                      {speakers.what_to_talk_about_second_part && (
                        <RichText content={speakers.what_to_talk_about_second_part.body}></RichText>
                      )}
                    </div>
                  )}

                  {index === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mt-4">
                      {speakers.which_session_types?.session_types &&
                        speakers.which_session_types.session_types.map(({ title, body }: any) => {
                          return (
                            <div className="flex flex-col gap-2 p-4 bg-[#F8F9FE] rounded-xl shadow" key={title}>
                              <p className="text-lg font-secondary bold">{title}</p>
                              <RichText content={body}></RichText>
                            </div>
                          )
                        })}
                    </div>
                  )}

                  {index === 4 && (
                    <>
                      <div
                        className="mt-6 bold cursor-pointer inline-flex select-none"
                        onClick={() => setExpandReviewCriteria(!expandReviewCriteria)}
                      >
                        Review Criteria <span className={cn('ml-1', { 'rotate-180': expandReviewCriteria })}>▼</span>
                      </div>
                      {expandReviewCriteria && speakers.review_criteria && (
                        <div className="mt-4">
                          <RichText content={speakers.review_criteria.body}></RichText>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="section" id="faq">
        <div className="mt-5 border-top pt-6 mb-8">
          {programming?.additional_questions && <RichText content={programming.additional_questions} />}
        </div>
      </div>

      {/* <div className="section" id="tracks">
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
      </div> */}
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  // await GetPage('terms-of-service', context.locale)

  const cmsProgramming = await client.queries.pages({ relativePath: 'programming.mdx' })
  const cmsSpeakers = await client.queries.pages({ relativePath: 'speaker_applications.mdx' })

  return {
    props: {
      ...globalData,
      page: {},
      cmsSpeakers: cmsSpeakers,
      cmsProgramming: cmsProgramming,
    },
  }
}
