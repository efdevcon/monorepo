import React, { useRef, useState } from 'react'
import { BlogReel } from 'components/domain/blog-overview'
import { CLSReel } from 'components/domain/index/community-led-sessions/CLS'
import { GetBlogs } from 'services/blogs'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Hero } from 'components/common/dc-8/hero/hero'
import css from './index.module.scss'
import TrackList from 'components/domain/index/track-list'
import themes from './themes.module.scss'
import ImageNew from 'next/image'
import CircleBackground from 'assets/images/background-circles.png'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesQuery, PagesIndex, PagesFaq_General, PagesProgramming } from '../../tina/__generated__/types'
import InfiniteScroller from 'lib/components/infinite-scroll'
import RTDGrants from 'assets/images/dc-7/rtd-grants.png'
import ArchiveBackground from 'assets/images/archive/archive-logo.png'
import { motion, useInView } from 'framer-motion'
import { Button } from 'lib/components/button'
import { Link } from 'components/common/link'
import RichText from 'lib/components/tina-cms/RichText'
import { generateCalendarExport } from 'lib/components/add-to-calendar'
import moment from 'moment'
import { useDraggableLink } from 'components/domain/devcon-week/schedule'
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
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const videos = [
  {
    url: 'YyK8i2-0aPk',
    title: 'This Year in Ethereum',
    author: 'Josh Stark',
    devcon: 7,
  },
  {
    url: 'SE15rsPVHz0',
    title: 'Redefining boundaries in the Infinite Garden',
    author: 'Aya Miyaguchi',
    devcon: 7,
  },
  {
    url: 'ei3tDRMjw6k',
    title: 'Ethereum in 30 minutes',
    author: 'Vitalik Buterin',
    devcon: 7,
  },
  {
    url: 'n3R4ze2hesk',
    title: 'Keynote: ⿻ Infinite Diversity in Infinite Combinations',
    author: 'Audrey Tang',
    devcon: 7,
  },
  {
    url: '7LRbiZ_FiSg',
    title: 'Keynote: Glass Houses and Tornados',
    author: 'Peter Van Valkenburgh',
    devcon: 7,
  },
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
  // {
  //   url: 'UihMqcj-cqc',
  //   title: 'Ethereum in 30 minutes by Vitalik Buterin | Devcon Bogotá',
  //   author: 'Vitalik Buterin',
  //   devcon: 6,
  // },
  {
    url: '-AEnRzzFpBE',
    title: "Publisher's Denial of Digital Ownership vs Decentralization",
    author: 'Brewster Kahle',
    devcon: 6,
  },
  {
    url: 'oLGZdLpHl1w',
    title: 'A Conversation with Stewart Brand',
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

export default function Index(props: any) {
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
  const gradientRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (gradientRef.current) {
      gsap.to(gradientRef.current, {
        opacity: 0.95,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: `+=${window.innerHeight * 0.7}`,
          scrub: true,
        },
      })
    }
  }, [])

  const { data: programmingData } = useTina<PagesQuery>(props.programming)
  const programming = programmingData.pages as PagesProgramming

  const formattedTracks =
    (() => {
      const tracks = programming.track_descriptions

      return tracks?.map((track: any) => {
        let trackLogo = CoreProtocol
        let url = ''

        if (track.id === 'core-protocol') {
          trackLogo = CoreProtocol
          url = 'https://archive.devcon.org/archive/watch?tags=Core Protocol'
        }
        if (track.id === 'cypherpunk') {
          trackLogo = Cypherpunk
          url = 'https://archive.devcon.org/archive/watch?tags=Cypherpunk'
        }
        if (track.id === 'usability') {
          trackLogo = Usability
          url = 'https://archive.devcon.org/archive/watch?tags=Usability'
        }
        if (track.id === 'real-world-ethereum') {
          trackLogo = RealWorldEthereum
          url = 'https://archive.devcon.org/archive/watch?tags=Real World Ethereum'
        }
        if (track.id === 'applied-cryptography') {
          trackLogo = AppliedCryptography
          url = 'https://archive.devcon.org/archive/watch?tags=Applied Cryptography'
        }
        if (track.id === 'crypto-economics') {
          trackLogo = CryptoEconomics
          url = 'https://archive.devcon.org/archive/watch?tags=Cryptoeconomics'
        }
        if (track.id === 'coordination') {
          trackLogo = Coordination
          url = 'https://archive.devcon.org/archive/watch?tags=Coordination'
        }
        if (track.id === 'developer-experience') {
          trackLogo = DeveloperExperience
          url = 'https://archive.devcon.org/archive/watch?tags=Developer Experience'
        }
        if (track.id === 'security') {
          trackLogo = Security
          url = 'https://archive.devcon.org/archive/watch?tags=Security'
        }
        if (track.id === 'layer-2s') {
          trackLogo = Layer2
          url = 'https://archive.devcon.org/archive/watch?tags=Layer 2s'
        }

        return {
          id: track.id,
          title: track.name,
          body: track.description,
          tags: track.tags,
          logo: trackLogo,
          url,
        }
      })
    })() || []

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
    <div className={`${css['layout-default']} ${themes['index']} overflow-hidden`}>
      <Header withStrip withHero />
      <Hero />

      <style jsx global>{`
        body {
          overflow: hidden;
        }
        @media (max-width: 768px) {
          [data-type='devcon-header-logo'] * {
            fill: black;
          }
        }
      `}</style>

      {/* <DevconnectHighlight /> */}

      <div className="text-[rgba(255,255,255,0.8)] z-[11] overflow-hidden w-full relative translate-y-[-200px] pt-[200px]">
        <div
          ref={gradientRef}
          className="bg-gradient-to-b from-[#1F296C] to-[#101537] absolute inset-0 w-full h-full -z-10 opacity-0"
          data-type="gradient-background"
          style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 200px)' }}
        ></div>
        {/* <ImageNew
          src={CircleBackground}
          alt="Circle background"
          className="max-w-[700px] absolute right-[-100px] -top-[350px] rotate-180 -z-10 opacity-10"
        /> */}

        <div className="section">
          <div className="flex flex-col justify-center gap-2 border-bottom mt-8 pb-8">
            <div className="text-2xl font-semibold">What is Devcon?</div>
            <div>Devcon is the gathering for the global Ethereum community to build and use decentralized systems.</div>
            <div>
              It's a conference for builders of all kinds, with content ranging from the deeply technical to the
              profoundly human. Each edition moves to a new region and brings together developers, researchers,
              community organizers, students, and creators from around the world
            </div>
            {/* <div className="grow">
              <RichText content={pages.section1?.body}></RichText>
            </div> */}
          </div>
        </div>

        <div className="section">
          <div className="relative pt-9">
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

          <div className="relative border-bottom !border-gray-400 pb-8">
            <TrackList title="Devcon Tracks" tracks={formattedTracks} />

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

        {/* <div className="section mt-4">
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
        </div> */}

        <div className="mb-8"></div>

        <Footer />
      </div>
    </div>
  )
}

export async function getStaticProps(context: any) {
  const content = await client.queries.pages({ relativePath: 'index.mdx' })
  const faq = await client.queries.pages({ relativePath: 'faq.mdx' })
  const programming = await client.queries.pages({ relativePath: 'programming.mdx' })

  return {
    props: {
      blogs: await GetBlogs(),
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
      programming: {
        variables: programming.variables,
        data: programming.data,
        query: programming.query,
      },
    },
    revalidate: 1 * 60 * 30,
  }
}
