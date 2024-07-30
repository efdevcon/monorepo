import React, { useRef, useState } from 'react'
import { BlogReel } from 'components/domain/blog-overview'
import { pageHOC } from 'context/pageHOC'
import { GetBlogs } from 'services/blogs'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import { News } from 'components/domain/news'
import getNews from 'services/news'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Hero } from 'components/domain/index/hero'
import css from './index.module.scss'
import TrackList from 'components/domain/index/track-list'
import About from 'components/domain/index/about'
import FeaturedSpeakers from 'components/domain/index/featured-speakers'
import CallsToAction from 'components/domain/index/ctas'
import Image from 'next/legacy/image'
import themes from './themes.module.scss'
import ImageNew from 'next/image'
import CircleBackground from 'assets/images/background-circles.png'
// import TriangleBackground from 'assets/images/background-triangles.png'
import { GetContentSections } from 'services/page'
// import TestExternalRepo from 'lib/components/lib-import'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesQuery, PagesIndex, PagesFaq_General } from '../../tina/__generated__/types'
import TitleDevcon from 'assets/images/devcon-title.svg'
import LogoFlowers from 'assets/images/dc-7/logo-flowers.png'
import InfiniteScroller from 'lib/components/infinite-scroll'
import StatsAnimation from 'components/domain/index/hero/stats-anim'
import RTDGrants from 'assets/images/dc-7/rtd-grants.png'
import ArchiveBackground from 'assets/images/archive/archive-logo.png'
import { motion, useInView } from 'framer-motion'
import { Button } from 'lib/components/button'
import { Link } from 'components/common/link'
import RichText from 'lib/components/tina-cms/RichText'
import TextMorph from 'lib/components/text-morph/TextMorph'
import BangkokVenue from 'assets/images/dc-7/venue.png'
import AddCalendarIcon from 'assets/icons/calendar.svg'
import { generateCalendarExport } from 'lib/components/add-to-calendar'
import { Modal, ModalContent } from 'lib/components/modal'
import CalendarExport from 'lib/assets/images/modal-export.png'
import moment from 'moment'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import DC7OverlayRight from './images/dc-7/overlay-right-dc7.png'
import Petals from 'assets/icons/petals.svg'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import { useDraggableLink } from 'components/domain/devcon-week/schedule'

const videos = [
  {
    url: 'lgTMm7J0t7c',
    title: 'Devcon VI Bogota Recap Video',
    devcon: 6,
  },
  {
    url: 'noXPewi5qOk',
    title: 'Executing with Subtraction in the Infinite Garden',
    author: 'Aya Miyaguchi',
    devcon: 6,
  },
  {
    url: 'UihMqcj-cqc',
    title: 'Ethereum in 30 minutes by Vitalik Buterin | Devcon Bogotá',
    author: 'Vitalik Buterin',
    devcon: 6,
  },
  {
    url: '-AEnRzzFpBE',
    title: "Publisher's Denial of Digital Ownership vs Decentralization",
    author: 'Brewster Kahle',
    devcon: 6,
  },
  {
    url: 'oLGZdLpHl1w',
    title: 'A Conversation with Stewart Brand (Devcon4)',
    author: 'Stewart Brand',
    devcon: 4,
  },
  {
    url: 'nzeracgPYis',
    title: 'The Value of Cryptocurrencies in Supporting Human Rights',
    author: 'Kurt Opsahl',
    devcon: 6,
  },
]

export const RoadToDevconGrants = ({ pages, down }: any) => {
  return (
    <div className="flex-col md:flex-row flex relative pt-12 gap-8 items-center" data-type="rtd-container">
      <div
        className={`${css['scrolling-text-background']} ${down ? '' : css['alternate']}`}
        data-type="scrolling-background"
      >
        <InfiniteScroller nDuplications={2} reverse speed="150s">
          <p className="bold rotate-x-180">ROAD TO DEVCON&nbsp;</p>
        </InfiniteScroller>
      </div>

      <div className="md:basis-[800px] shrink">
        <RichText content={pages.section3?.body}></RichText>
      </div>
      <div className="flex grow shrink-0 items-center justify-center self-center">
        <Link to={pages.section3?.graphic_url}>
          <div className={css['tilt-hover-image']}>
            <ImageNew src={RTDGrants} alt="Devcon RTD Grants" className="max-w-[300px]" />
          </div>
        </Link>
      </div>
    </div>
  )
}

export default pageHOC(function Index(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesIndex
  const { data: faqData } = useTina<PagesQuery>(props.faq)
  const faq = faqData.pages as PagesFaq_General
  const scrollRef = useRef<any>(null)
  const isInView = useInView(scrollRef, { once: true, margin: '40% 0px -20% 0px' })
  const [video, setVideo] = React.useState(videos[0])
  const [calendarModalOpen, setCalendarModalOpen] = React.useState(false)
  const [openFAQ, setOpenFAQ] = React.useState<string | null>(null)
  const [cal, setCal] = React.useState<any>(null)
  const draggableLinkAttributes = useDraggableLink()

  React.useEffect(() => {
    setCal(
      generateCalendarExport({
        timezone: 'Asia/Bangkok',
        PRODID: 'devcon.org',
        icsFileName: 'Devcon 7',
        entries: [
          {
            start: moment.utc('2024-11-12'),
            end: moment.utc('2024-11-16'),
            description: 'Devcon - The Ethereum Developer Conference',
            title: 'Devcon 7',
            location: {
              url: 'https://devcon.org',
              text: 'QNSCC — Queen Sirikit National Convention Center',
            },
          },
        ],
      })
    )
  }, [])

  return (
    <div className={`${css['layout-default']} ${themes['index']}`}>
      <Header withStrip withHero />
      <Hero />

      <div className="bg-white z-10 overflow-hidden w-full relative z<">
        <ImageNew
          src={CircleBackground}
          alt="Circle background"
          className="max-w-[700px] absolute right-[-100px] -top-[350px] rotate-180 -z-10 opacity-10"
        />

        <div className="section">
          <div className="border border-solid border-neutral-100 shadow-lg mt-6 bg-[#f6edff] rounded">
            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className="flex justify-between items-center no-wrap ">
                <Petals className="icon grow-0 shrink-0 mx-8 text-3xl" style={{ '--color-icon': '#7958A5' }} />
                {pages?.index_ctas &&
                  pages?.index_ctas.map(({ url, title, text }: any) => {
                    if (!url) return null

                    return (
                      <Link
                        key={title}
                        {...draggableLinkAttributes}
                        to={url}
                        className="grow shrink-0 mt-[2px] [&:not(:last-child)]:pr-8 h-full flex justify-center flex-col cursor-pointer"
                      >
                        <motion.div
                          whileHover={{ borderColor: '#7958A5' }}
                          className="border-[#f6edff] border-b-[3px] py-4 border-solid cursor-pointer"
                        >
                          <p className="text-lg bold">{title}</p>
                          <p className="text-sm">{text}</p>
                        </motion.div>
                      </Link>
                    )
                  })}
              </div>
            </SwipeToScroll>
          </div>
          <div className="flex flex-col justify-center lg:flex-row gap-8 border-bottom mt-10 mb-8 pb-8">
            <div className="grow">
              {/* <TitleDevcon className="hidden lg:block" /> */}
              {/* <div className="lg:mt-6"> */}
              <RichText content={pages.section1?.body}></RichText>
              {/* </div> */}
            </div>
            <div className="flex w-full flex-col grow shrink-0 max-w-[410px] lg:grow-0 relative">
              <div className="flex justify-between w-full gap-4">
                <ImageNew src={BangkokVenue} alt="Devcon 7 Bangkok Venue" className="max-w-[162px]" />
                <p className="text-lg font-secondary text-[#8B6BBB] bold">
                  QSNCC —<br className="hidden lg:inline-block" /> Queen Sirikit National{' '}
                  <br className="hidden lg:inline-block" />
                  Convention Center
                </p>
              </div>
              <p className="mt-4 mb-3">
                60 Queen Sirikit National Convention Center, Ratchadaphisek Road, Khlong Toei Sub-district, Khlong Toei
                District, <b>Bangkok, Thailand</b>
              </p>
              <Link
                className="text-underline font-secondary text-sm self-start bold"
                indicateExternal
                to="https://maps.app.goo.gl/XLGaN7B9zViAe3DB6"
              >
                Venue Direction
              </Link>
              {/* <div className="hidden lg:block border-bottom my-6"></div>
              <div className="block lg:hidden my-2"></div> */}
            </div>
          </div>

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-center mb-8 pb-8 border-bottom gap-8 xl:gap-16">
            <RichText content={pages.devcon_week?.body}></RichText>
            <div className="flex lg:justify-between items-center shrink-0 grow gap-8">
              <div className="font-secondary">
                <p className="uppercase bold leading-tight lg:text-xl">BANGKOK, THAILAND</p>
                <p className="text-xl leading-tight">
                  <span className="text-[#B1ABFE] bold">12—15</span> Nov, 2024
                </p>
              </div>

              <Button fat color="purple-1" onClick={() => setCalendarModalOpen(true)}>
                <span className="mr-2">Add to Calendar</span>
                <AddCalendarIcon className="icon" />
              </Button>

              {cal && (
                <Modal open={calendarModalOpen} close={() => setCalendarModalOpen(false)}>
                  <ModalContent
                    className="border-solid border-[#8B6BBB] border-t-4 w-[560px]"
                    close={() => setCalendarModalOpen(false)}
                  >
                    <div className="relative">
                      <ImageNew src={CalendarExport} alt="Calendar Share" className="w-full h-auto"></ImageNew>
                      <p className="absolute text-xs font-bold top-4 left-4 text-uppercase">Add To Calendar</p>
                    </div>
                    <div className="p-4">
                      <p className="font-bold">Add Devcon to your calendar!</p>

                      <p className="text-sm">Download the .ics file to upload to your favorite calendar app.</p>

                      <div className="flex mt-4 flex-row gap-4 items-center">
                        <a {...cal.icsAttributes}>
                          <Button fat color="purple-1">
                            <span className="mr-2">Download (.ics)</span>
                            <AddCalendarIcon className="icon" />
                          </Button>
                        </a>
                        <Link to={cal.googleCalUrl} className="h-full">
                          <Button fat color="purple-1" fill>
                            Google Calendar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </ModalContent>
                </Modal>
              )}
            </div>
          </div>

          <div className="relative flex flex-col items-start pb-20 border-bottom gap-8 xl:gap-6">
            <div className={`${css['scrolling-text-background']}`}>
              <InfiniteScroller nDuplications={2} speed="120s">
                <p className="bold">SOUTHEAST ASIA&nbsp;</p>
              </InfiniteScroller>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr] gap-8">
              <div>
                <RichText content={pages.section2?.top}></RichText>
              </div>

              <div className="flex flex-col items-center justify-center">
                <ImageNew
                  src={LogoFlowers}
                  alt="Devcon 7 Logo"
                  className="w-[85%] max-w-[250px] lg:w-auto lg:max-w-[315px]"
                />

                <div className="mt-2 lg:mt-2 flex flex-col justify-center items-center w-full">
                  <TitleDevcon className="md:block max-w-[124px] md:max-w-auto md:w-[124px]" />
                  {/* <p className={`${css['rainbow-text']} text-3xl`}>เอเชียตะวันออกเฉียงใต้</p> */}
                  <div className="uppercase">
                    <TextMorph
                      texts={[
                        'Southeast Asia',
                        'เอเชียตะวันออกเฉียงใต้',
                        'Timog-silangang Asya',
                        'អាស៊ី​អា​គ្នេ​យ៏',
                        'Sudeste da Ásia',
                        'အရှေ့တောင်အာရှ',
                        'Đông Nam Á',
                        'தென்கிழக்கு ஆசியா',
                        'Asia Tenggara',
                        'ఆగ్నేయ ఆసియా',
                        '东南亚',
                        'ອາຊີຕາເວັນອອກສ່ຽງໃຕ້',
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* <div className="flex flex-col md:flex-row gap-8">
              <RichText content={pages.section2?.left}></RichText>

              <RichText content={pages.section2?.right}></RichText>
            </div>

            <Link to={pages.section2?.button_info?.link}>
              <Button fat color="purple-1" fill href="">
                {pages.section2?.button_info?.text}
              </Button>
            </Link> */}
          </div>

          <div className="mb-4">
            <RoadToDevconGrants pages={pages} />
          </div>
          {/* <div className="flex-col md:flex-row flex relative pt-12 mb-8 pb-8 gap-8 border-bottom items-center">
            <div className={`${css['scrolling-text-background']} ${css['alternate']}`}>
              <InfiniteScroller nDuplications={2} reverse speed="150s">
                <p className="bold rotate-x-180">ROAD TO DEVCON&nbsp;</p>
              </InfiniteScroller>
            </div>

            <div className="md:basis-[800px] shrink">
              <RichText content={pages.section3?.body}></RichText>

              <Link to="https://esp.ethereum.foundation/devcon-grants">
                <Button fat color="purple-1" className="mt-8" fill>
                  {pages.section3?.button}
                </Button>
              </Link>
            </div>
            <div className="flex grow shrink-0 items-center justify-center">
              <Link to="https://esp.ethereum.foundation/devcon-grants">
                <div className={css['tilt-hover-image']}>
                  <ImageNew src={RTDGrants} alt="Devcon RTD Grants" className="max-w-[300px]" />
                </div>
              </Link>
            </div>
          </div> */}

          <div className="relative flex flex-col items-start border-bottom gap-8 pt-8 border-top pointer-events-none">
            <div className={`z-10 ${css['background-text']}`}>
              <RichText content={pages.section4?.body}></RichText>
            </div>

            <div className="sm:h-[300px] h-[350px] relative w-full z-0 pointer-events-auto" ref={scrollRef}>
              {isInView && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                  <StatsAnimation />
                </motion.div>
              )}
            </div>
          </div>
        </div>
        {/* <About content={props.sections['devcon-about']} /> */}

        {/* <div className={`${css['background-container']} section`}>
          <div className={`${css['circle-background']} expand`}>
            <Image src={CircleBackground} alt="Circles" />
          </div>
        </div> */}

        {/* <About recap content={props.sections['devcon-recap']} /> */}

        {/* <FeaturedSpeakers /> */}

        {/* <CallsToAction
        scholarApplications={props.sections['cta-scholar-applications']}
        // speakerApplications={props.sections['cta-speaker-applications']}
        // ticketPresale={props.sections['cta-ticket-presale']}
        ticketsOnSale={props.sections['tickets-on-sale-now']}
      /> */}

        {/* <News data={props.news} /> */}

        {/* <div className="clear-bottom border-bottom"></div> */}

        <div className="section">
          <div className="relative pt-9">
            <div className={`${css['scrolling-text-background']} ${css['alternate']}`}>
              {/* <InfiniteScroller nDuplications={2} speed="150s">
                <p className="bold rotate-x-180">ROAD TO DEVCON&nbsp;</p>
              </InfiniteScroller> */}
            </div>

            <div className="mb-7">
              <RichText content={pages.section5?.title}></RichText>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 w-full mt-4 mb-4">
              <div className="basis-[51%] relative">
                <div className="aspect shadow-lg">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${video.url}`}
                    className="rounded-xl"
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
              <div className="h-[30vh] lg:h-auto relative grow shrink-0 border-solid border border-[#E2E3FF] bg-[#F8F9FE] rounded-xl overflow-hidden shadow-lg">
                <div className="absolute top-0 w-full h-full opacity-15 flex justify-end">
                  <ImageNew src={ArchiveBackground} alt="Devcon RTD Grants" className="h-[120%] object-cover" />
                </div>
                <div
                  className={`absolute top-0 w-full h-full flex flex-col overflow-auto no-scrollbar ${css['archive-list']}`}
                >
                  {(() => {
                    return videos.map(videoEntry => {
                      return (
                        <div
                          className={`flex flex-col first:mt-2 mb-2 mx-4 py-2 border-[#E2E3FF] shrink-0 border-solid border-b last:border-none cursor-pointer ${css['video']}`}
                          key={videoEntry.title}
                          onClick={() => setVideo(videoEntry)}
                        >
                          <p className="text-xs bold">DEVCON {videoEntry.devcon}</p>
                          <p className="bold">{videoEntry.title}</p>
                          <p className="text-xs opacity-0.5">{videoEntry.author}</p>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>

            <RichText content={pages.section5?.body}></RichText>
          </div>

          <div className="relative border-bottom pb-8">
            <TrackList title='Devcon 6 Playlists' />

            <Link to={pages.section5?.button_info?.link}>
              <Button fat color="purple-1" fill className="mt-8">
                {pages.section5?.button_info?.text}
              </Button>
            </Link>

            <div className={`${css['scrolling-text-background']}`}>
              <InfiniteScroller nDuplications={2} speed="70s">
                <p className="bold">DEVCON ARCHIVE&nbsp;</p>
              </InfiniteScroller>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className={`${css['scrolling-text-background']} ${css['alternate']}`}>
            <InfiniteScroller nDuplications={2} reverse speed="100s">
              <p className="bold">BLOG POSTS&nbsp;</p>
            </InfiniteScroller>
          </div>
          <BlogReel blogs={props.blogs} />
        </div>

        <div className="section mt-4">
          <div className="my-4 h2">Frequently Asked</div>
          <div className="flex flex-col">
            {faq?.questions?.map(({ question, answer }: any) => {
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
        </div>

        <div className="mb-8"></div>

        <Footer />
      </div>
    </div>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const sections = await GetContentSections(
    [
      'devcon-about',
      'road-to-devcon-grants',
      'devcon-recap',
      'cta-speaker-applications',
      'cta-ticket-presale',
      'cta-scholar-applications',
      'tickets-on-sale-now',
    ],
    context.locale
  )

  const content = await client.queries.pages({ relativePath: 'index.mdx' })
  const faq = await client.queries.pages({ relativePath: 'faq.mdx' })

  return {
    props: {
      ...globalData,
      page: DEFAULT_APP_PAGE,
      news: await getNews(context.locale),
      blogs: await GetBlogs(),
      sections,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
      faq: {
        variables: faq.variables,
        data: faq.data,
        query: faq.query,
      },
    },
    revalidate: 1 * 60 * 30,
  }
}
