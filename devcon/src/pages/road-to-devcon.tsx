import React, { useRef, useState, useEffect } from 'react'
import { pageHOC } from 'context/pageHOC'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import css from './road-to-devcon.module.scss'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesQuery, PagesIndex, PagesRoad_To_Devcon } from '../../tina/__generated__/types'
import themes from './themes.module.scss'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { PageHero } from 'components/common/page-hero'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import GirlSchematics from 'components/domain/road/images/girl-schematics.png'
import BoyDoge from 'components/domain/road/images/boy-doge.png'
import DevaGlobe from 'components/domain/road/images/deva-globe.png'
import WonkaFont from 'components/domain/road/images/wonka-font.png'
import SoutheastAsia from 'components/domain/road/images/southeast-asia.png'
import DevaSignature from 'components/domain/road/images/deva-signature.png'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import { motion, useInView, useTransform, useMotionValue, MotionValue } from 'framer-motion'
import { Fireflies } from 'components/domain/index/hero/dc7/fireflies'
import { Table, TableColumn } from 'components/common/table/Table'
import { SortVariation } from 'components/common/sort'
import { RoadToDevconGrants } from 'pages'
import useKeyBinding from 'lib/useKeybinding'

// https://codesandbox.io/p/sandbox/framer-motion-parallax-i9gwuc?file=%2Fsrc%2FApp.tsx%3A13%2C16-13%2C61&from-embed=

function useParallax(value: number, distance: number) {
  const motionValue = useMotionValue(value)

  // Update the motion value whenever `value` changes
  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  // Apply the transformation based on the updated motion value
  return useTransform(motionValue, [0, 1], [-distance, distance])
}

const useIntersectionRatio = (options?: any) => {
  const [intersectionRatio, setIntersectionRatio] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observerOptions = {
      root: document.getElementById(options.root) || null,
      rootMargin: options.rootMargin || '0px',
      threshold: options.threshold || new Array(101).fill(0).map((_, index) => index * 0.01),
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        setIntersectionRatio(entry.intersectionRatio)
      })
    }, observerOptions)

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [options.root, options.rootMargin, options.threshold])

  return { ref, intersectionRatio } as any
}

const items = [
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
  {
    date: '5th feb',
    location: '5th feb',
    event: '5th feb',
    organizer: '5th feb',
    social: '5th feb',
    website: '5th feb',
  },
]

const tableColumns: Array<TableColumn> = [
  {
    title: 'Date',
    key: 'date',
    className: css['index-column'],
    sort: SortVariation.basic,
    render: item => {
      return <p>Helloooo</p>
    },
  },
  {
    title: 'Location',
    key: 'location',
    className: css['location-column'],
    sort: SortVariation.basic,
    render: item => {
      return <p>Helloooo</p>
    },
  },
  {
    title: 'Event',
    key: 'event',
    className: css['name-column'],
    sort: SortVariation.basic,
    render: item => {
      return <p>Hellooo2</p>
    },
  },
  {
    title: 'Organizer',
    key: 'organizer',
    className: css['name-column'],
    sort: SortVariation.basic,
    render: item => {
      return <p>Hellooo2</p>
    },
  },
  {
    title: 'Social',
    key: 'social',
    className: css['name-column'],
    sort: SortVariation.basic,
    render: item => {
      return <p>Hellooo2</p>
    },
  },
  {
    title: 'Website',
    key: 'website',
    className: css['name-column'],
    sort: SortVariation.basic,
    render: item => {
      return <p>Hellooo2</p>
    },
  },
]

export default pageHOC(function RoadToDevcon(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const { data: grantsData } = useTina<PagesQuery>(props.grantsCms)
  const pages = data.pages as PagesRoad_To_Devcon
  const grantsPages = grantsData.pages as PagesIndex
  const controlsRef = useRef<any>()

  const sections = [
    useIntersectionRatio({
      root: 'intersection-root',
    }),
    useIntersectionRatio({
      root: 'intersection-root',
    }),
    useIntersectionRatio({
      root: 'intersection-root',
    }),
    useIntersectionRatio({
      root: 'intersection-root',
    }),
  ]

  const ratios = sections.map(section => parseFloat(section.intersectionRatio))
  const highestRatio = Math.max(...ratios)
  const currentSlide =
    highestRatio === 0 ? -1 : sections.findIndex(section => section.intersectionRatio === highestRatio)

  const goToSection = (index: number) => {
    if (!sections[index]) return

    window.scrollTo(0, 0)

    const offsetLeft = sections[index].ref.current.offsetLeft

    controlsRef.current.setX(offsetLeft)
  }

  useKeyBinding(() => goToSection(currentSlide - 1), ['ArrowLeft'])
  useKeyBinding(() => goToSection(currentSlide + 1), ['ArrowRight'])

  return (
    <>
      <div className="" id="journey"></div>
      <Page theme={themes['teal']}>
        <PageHero
          className={css['page-hero']}
          path={[{ text: <span className="bold">Get Involved</span> }, { text: 'Road To Devcon' }]}
          navigation={[
            {
              title: 'Journey',
              to: '#journey',
            },
            {
              title: (
                <span>
                  {sections.map((section, index) => {
                    if (index === currentSlide) {
                      return (
                        <span key={index} onClick={() => goToSection(index)} className="text-red-500">
                          •
                        </span>
                      )
                    }

                    return (
                      <span key={index} onClick={() => goToSection(index)}>
                        •
                      </span>
                    )
                  })}
                </span>
              ),
            },
            {
              title: 'Events',
              to: '#events',
            },
            {
              title: 'Grants',
              to: '#grants',
            },
            // {
            //   title: 'Communities',
            //   to: '#communities',
            // },
          ]}
          // renderNavigationRight={() => {
          //   return 'hello'
          // }}
        >
          <div
            className={`${css['position-container']} absolute top-0 right-0 left-0 w-full h-full bottom-0 z-0`}
            id="intersection-root"
          >
            {/* <div className="z-100 absolute top-0 bottom-0 w-[1000px] h-full bg-slate-900"></div> */}
            <div className="absolute top-0 left-0 bottom-0 right-0 pointer-events-none">
              <Fireflies id="road" />
            </div>
            <SwipeToScroll slideControls={controlsRef}>
              <div className={`${css['horizontal-container']} flex no-wrap h-full w-content relative`}>
                <div className="relative shrink-0 min-w-[100vw] h-full" ref={sections[0].ref}>
                  <div className="section h-full my-4">
                    <div className="z-10 flex no-wrap">
                      <div className="relative flex flex-col justify-center h-full max-w-[90vw]">
                        <Image
                          src={WonkaFont}
                          alt="Colorful road to devcon header"
                          className="z-1 max-w-[220px] mb-4"
                        />
                        <Image src={SoutheastAsia} alt="Southeast Asia" className="max-w-[215px]" />
                        <p className="text-slate-100 mt-8">
                          Hey there, I'm Deva, the Devcon unicorn, a guiding light to the wonderstruck wanderers of
                          Ethereum's vast universe.
                        </p>
                        <p className="text-slate-100 mt-8">
                          Since the dawn of Devcon, I have been the beacon for young explorers, guiding them to find
                          their tribe. And now, once again, the Road to Devcon calls, beckoning a new generation of
                          mavericks, just like you.
                        </p>

                        <p className="text-slate-400 text-sm mt-4">
                          DRAG to embark on the journey on the road to devcon →{' '}
                        </p>

                        <Image src={DevaSignature} alt="Deva's signature" className="max-w-[115px] mt-4" />
                      </div>
                      <motion.div
                        className="flex"
                        // style={{ transform: `translateX(${intersectionRatio * 300}px)` }}
                        initial={{ opacity: 0, x: 100 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                      >
                        <Image
                          priority
                          src={DevaGlobe}
                          alt="Deva flying across globe"
                          className="object-contain object-bottom min-h-[70%]"
                        />
                      </motion.div>
                    </div>
                  </div>
                </div>
                <div className="relative h-full flex justify-center" ref={sections[1].ref}>
                  <div className="flex no-wrap">
                    <div className="flex flex-col self-center justify-center h-full max-w-[40vw]">
                      <p className="text-slate-100 mt-8">
                        You, who resonate with the tales of coders who hack with relentless passion, community leaders
                        who envisioned radical unity, artists who paint their dreams with the colors of the wild
                        unknown, and economists who slice through the new-age economy.
                      </p>
                      <p className="text-slate-100 mt-8">
                        But these adventurers often feel held back by too much control that stifles their creativity and
                        independence. They long for freedom, for a place where they can fully express their values,
                        where innovation isn't just a buzzword but the very essence. Each of them in their own way, is
                        itching for a revolution, for a platform that can transform their wild visions into reality.
                      </p>

                      <p className="text-slate-100 mt-4">
                        {' '}
                        That's where Ethereum comes in, a network that promises independence, no central control, and
                        unbridled innovation. But let's face it, diving into Ethereum's values and technological vision
                        is like jumping into a wild ocean of complexity. It's easy to feel lost, adrift in a sea of
                        technical jargon and knowledge gaps.{' '}
                      </p>
                    </div>
                    <motion.div
                      className="flex max-w-[65vw] self-end"
                      // style={{ transform: `translateX(${intersectionRatio * 300}px)` }}
                      initial={{ opacity: 0, x: 100 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2 }}
                    >
                      <Image
                        src={GirlSchematics}
                        priority
                        alt="Girl holding Ethereum schematics"
                        className="object-contain object-bottom h-full"
                      />
                    </motion.div>
                  </div>
                </div>
                <div className="relative shrink-0 min-w-[80vw] h-full" ref={sections[2].ref}>
                  <div className="section h-full">
                    <div className="flex no-wrap">
                      <div className="flex flex-col justify-center h-full">
                        <p className="text-slate-100 mt-8">
                          Hey there, I'm Deva, the Devcon unicorn, a guiding light to the wonderstruck wanderers of
                          Ethereum's vast universe.
                        </p>
                        <p className="text-slate-100 mt-8">
                          Since the dawn of Devcon, I have been the beacon for young explorers, guiding them to find
                          their tribe. And now, once again, the Road to Devcon calls, beckoning a new generation of
                          mavericks, just like you.
                        </p>

                        <p className="text-slate-100 mt-4">DRAG to embark on the journey on the road to devcon → </p>
                      </div>
                      <motion.div
                        className="flex"
                        // style={{ transform: `translateX(${intersectionRatio * 300}px)` }}
                        initial={{ opacity: 0, x: 100 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                      >
                        <Image
                          src={BoyDoge}
                          priority
                          alt="Ethereum themed boy and dog"
                          className="object-contain object-bottom h-full"
                        />
                      </motion.div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 min-w-[20vw] max-w-[600px] flex" ref={sections[3].ref}>
                  <div className="section">
                    <div className="flex flex-col justify-center  h-full">
                      <p className="text-slate-100 mt-8">
                        Hey there, I'm Deva, the Devcon unicorn, a guiding light to the wonderstruck wanderers of
                        Ethereum's vast universe.
                      </p>
                      <p className="text-slate-100 mt-8">
                        Since the dawn of Devcon, I have been the beacon for young explorers, guiding them to find their
                        tribe. And now, once again, the Road to Devcon calls, beckoning a new generation of mavericks,
                        just like you.
                      </p>

                      <p className="text-slate-100 mt-4">DRAG to embark on the journey on the road to devcon → </p>
                    </div>
                  </div>
                </div>
              </div>
            </SwipeToScroll>
          </div>
        </PageHero>

        <div className={`section ${css['content']}`} id="events">
          <div className="flex justify-between items-center mb-6">
            <p className="h2">RTD Events</p>
            <motion.input
              className={`${css['input']} rounded-full p-2.5 px-5 border-solid border border-slate-300`}
              type="email"
              name="email"
              whileFocus={{ boxShadow: '0px 0px 4px 0px black' }}
              placeholder="Search"
              // {...emailField}
            />
          </div>

          <div className="flex border-b border-solid border-[#b9b9b9]">
            <p className="cursor-pointer hover:font-bold px-4 py-2 font-bold">All</p>
            <p className="cursor-pointer hover:font-bold px-4 py-2">Meetups</p>
            <p className="cursor-pointer hover:font-bold px-4 py-2">Past Events</p>
          </div>

          <Table itemKey="number" items={items} columns={tableColumns} />

          <div className="" id="grants">
            <RoadToDevconGrants pages={grantsPages} />
          </div>
        </div>
      </Page>
    </>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const content = await client.queries.pages({ relativePath: 'road_to_devcon.mdx' })
  const grantContent = await client.queries.pages({ relativePath: 'index.mdx' })

  return {
    props: {
      ...globalData,
      page: DEFAULT_APP_PAGE,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
      grantsCms: {
        variables: grantContent.variables,
        data: grantContent.data,
        query: grantContent.query,
      },
    },
    revalidate: 1 * 60 * 30,
  }
}
