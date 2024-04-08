import React, { useRef, useState, useEffect } from 'react'
import { pageHOC } from 'context/pageHOC'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import css from './road-to-devcon.module.scss'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesQuery, PagesIndex, PagesRoad_To_Devcon } from '../../tina/__generated__/types'
import themes from './themes.module.scss'
import { PageHero } from 'components/common/page-hero'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import GirlSchematics from 'components/domain/road/images/girl-schematics.png'
import BoyDoge from 'components/domain/road/images/boy-doge.png'
import RichText from 'lib/components/tina-cms/RichText'
import DevaGlobe from 'components/domain/road/images/deva-globe.png'
import WonkaFont from 'components/domain/road/images/wonka-font.png'
import SoutheastAsia from 'components/domain/road/images/southeast-asia.png'
import DevaSignature from 'components/domain/road/images/deva-signature.png'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import { motion, useInView, useTransform, useMotionValue } from 'framer-motion'
import { Fireflies } from 'components/domain/index/hero/dc7/fireflies'
import { Table, TableColumn } from 'components/common/table/Table'
import { SortVariation } from 'components/common/sort'
import { RoadToDevconGrants } from 'pages'
import useKeyBinding from 'lib/useKeyBinding'
import CircleArrowRightIcon from 'assets/icons/circle_arrow_right.svg'
import IconChevronRight from 'assets/icons/chevron_right.svg'
import IconChevronLeft from 'assets/icons/chevron_left.svg'
import { Link } from 'components/common/link'
import { Button } from 'lib/components/button'
import getNotionDatabase from 'components/domain/devcon-week/getNotionDatabase'
import moment from 'moment'
import { Carousel } from 'components/common/carousel'
import Gal1 from 'components/domain/road/images/gallery/gal1.jpg'
import Gal2 from 'components/domain/road/images/gallery/gal2.jpg'
import Gal3 from 'components/domain/road/images/gallery/gal3.jpg'
import Gal4 from 'components/domain/road/images/gallery/gal4.jpg'
import Gal5 from 'components/domain/road/images/gallery/gal5.jpg'
import Gal6 from 'components/domain/road/images/gallery/gal6.jpg'
import Gal7 from 'components/domain/road/images/gallery/gal7.jpg'
import Gal8 from 'components/domain/road/images/gallery/gal8.jpg'
import Gal9 from 'components/domain/road/images/gallery/gal9.jpg'
import Gal10 from 'components/domain/road/images/gallery/gal10.jpg'
import Gal11 from 'components/domain/road/images/gallery/gal11.jpg'

import Lyra from 'components/domain/road/images/rtd/lyra.png'
import LyraClouds from 'components/domain/road/images/rtd/lyra-clouds.png'
import Aria from 'components/domain/road/images/rtd/aria.png'
import AriaClouds from 'components/domain/road/images/rtd/aria-clouds.png'
import Deva from 'components/domain/road/images/rtd/deva.png'
import Globe from 'components/domain/road/images/rtd/deva-globe-2.png'

// Custom hook to observe resize events and update a CSS variable
const useWindowWidth = (cssVariableName: string) => {
  useEffect(() => {
    // Function to update the CSS variable, ignoring the scrollbar width
    const updateWidthVariable = () => {
      const width = document.documentElement.clientWidth // Changed to clientWidth
      document.documentElement.style.setProperty(`--${cssVariableName}`, `${width}px`)
    }

    // Update the variable initially and whenever the window is resized
    window.addEventListener('resize', updateWidthVariable)
    updateWidthVariable() // Initial update

    // Cleanup function to remove the event listener
    return () => window.removeEventListener('resize', updateWidthVariable)
  }, [cssVariableName])
}

const useIntersectionRatio = (ref: any, options?: any) => {
  const [intersectionRatio, setIntersectionRatio] = useState(0)
  // const ref = useRef(null)

  useEffect(() => {
    const observerOptions = {
      root: document.getElementById(options.root) || null,
      rootMargin: options.rootMargin || '0px',
      threshold: options.threshold || new Array(11).fill(0).map((_, index) => index * 0.1),
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

function formatHumanReadableDate(startDate: string, endDate: string) {
  const start = moment(startDate)
  const end = moment(endDate)

  if (start.isSame(end)) {
    // If start and end date are the same, format as "Feb 3, 2024"
    return start.format('MMM D, YYYY')
  } else {
    // If the start and end year are the same, include the year at the end.
    // Format as "Feb 3 - March 5, 2024" or include the year in both dates if they are different
    if (start.year() === end.year()) {
      return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
    } else {
      return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`
    }
  }
}

const tableColumns: Array<TableColumn> = [
  {
    title: 'Date',
    key: 'Date',
    sort: (a: any, b: any) => {
      const { startDate: startDate1 } = a
      const { startDate: startDate2 } = b

      const start1 = moment(startDate1)
      const start2 = moment(startDate2)

      // if (a.eventHasPassed && !b.eventHasPassed) {
      //   return 1
      // } else if (b.eventHasPassed && !a.eventHasPassed) {
      //   return -1
      // }

      if (start1.isAfter(start2)) {
        // if (a.eventHasPassed && b.eventHasPassed) return -1
        return 1
      } else if (start1.isBefore(start2)) {
        // if (a.eventHasPassed && b.eventHasPassed) return 1
        return -1
      }

      return 0
    },
    render: item => {
      return (
        <p className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}>
          {formatHumanReadableDate(item.Date.startDate, item.Date.endDate)}
        </p>
      )
    },
  },
  {
    title: 'Name',
    key: 'Name',
    sort: SortVariation.basic,
    render: item => {
      if (item.Link) {
        return (
          <Link className="bold" to={item.Link} indicateExternal>
            {item.Name}
          </Link>
        )
      }

      return <p className={`bold`}>{item.Name}</p>
    },
  },
  {
    title: 'Location',
    key: 'Location',
    className: '!hidden md:!flex',
    sort: SortVariation.basic,
    render: item => {
      return <p className="bolda">{item.Location}</p>
    },
  },
  {
    title: 'Type of Event',
    key: 'Type of Event',
    className: '!hidden md:!flex',
    sort: SortVariation.basic,
    render: item => {
      return <p className="bolda">{item['Type of Event']}</p>
    },
  },
  {
    title: 'Team',
    key: 'Team',
    sort: SortVariation.basic,
    className: '!hidden md:!flex',
    render: item => {
      return <p className={`${css['team-col']}`}>{item.Team}</p>
    },
  },
  // {
  //   title: 'Link',
  //   key: 'Link',
  //   // sort: SortVariation.basic,
  //   render: item => {
  //     if (!item.Link) return null

  //     return (
  //       <Link className="bolda" to={item.Link} indicateExternal>
  //         {item.Link}
  //       </Link>
  //     )
  //   },
  // },
  {
    title: 'Social',
    key: 'Social',
    className: '!hidden lg:!flex',
    // sort: SortVariation.basic,
    render: item => {
      if (!item.Social) return null

      return (
        <Link className="bolda" to={item.Social} indicateExternal>
          {item.Social}
        </Link>
      )
    },
  },
]

const useHorizontalParallax = (onChange: (progress: number) => void) => {
  const targetRef = useRef<any>(null)
  const anchorRef = useRef<any>(null)

  const observerCallback = (entries: any) => {
    entries.forEach((entry: any) => {
      const { boundingClientRect, rootBounds } = entry

      if (!rootBounds) return

      const ratio = entry.intersectionRatio

      // Calculate midpoint of the viewport
      const viewportMidpoint = rootBounds.width / 2
      // Calculate the midpoint of the element
      const elementMidpoint = boundingClientRect.left + boundingClientRect.width / 2

      // Determine if the element is past the midpoint of the viewport
      const intersectionRatioDecreasing = viewportMidpoint >= elementMidpoint
      let progressAlongAnchor

      if (intersectionRatioDecreasing) {
        const ratioPastMidpoint = (1 - ratio) / 2 + 0.5

        progressAlongAnchor = ratioPastMidpoint * 100
      } else {
        progressAlongAnchor = (ratio * 100) / 2
      }

      onChange(progressAlongAnchor)
    })
  }

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      threshold: new Array(101).fill(0).map((_, i) => i * 0.01),
    })

    if (anchorRef.current) {
      observer.observe(anchorRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return {
    targetRef,
    anchorRef,
  }
}

const Hero = (props: any) => {
  const { controlsRef, sectionRefs, goToSection, pages } = props

  useWindowWidth('window-width')

  const firstParallaxGlobe = useRef<any>()
  const firstParallax = useHorizontalParallax(progress => {
    firstParallaxGlobe.current.style.transform = `scale(${110 - progress / 3}%) translateY(5%)`
    firstParallax.targetRef.current.style.transform = `scale(${100 - progress / 3}%) translateX(${
      progress / 1.5
    }%) translateY(${progress / 8}%)`
  })

  const secondParallaxCloud = useRef<any>()
  const secondParallax = useHorizontalParallax(progress => {
    secondParallaxCloud.current.style.transform = `scale(${80 + progress / 5}%) translateX(${
      progress / 10
    }%) translateY(14%)`
    secondParallax.targetRef.current.style.transform = `scale(${
      90 + progress / 5
    }%) translateX(-${progress}%) translateY(10%)`
  })

  const thirdParallaxCloud = useRef<any>()
  const thirdParallax = useHorizontalParallax(progress => {
    thirdParallaxCloud.current.style.transform = `scale(${80 + progress / 5}%) translateX(${
      progress / 10
    }%) translateY(15%)`
    thirdParallax.targetRef.current.style.transform = `scale(${80 + progress / 5}%) translateX(-${
      progress / 1.5
    }%) translateY(10%)`
  })

  return (
    <div
      className={`${css['position-container']} absolute top-0 right-0 left-0 w-full h-full bottom-0 z-0`}
      id="intersection-root"
    >
      <div className="hidden md:block absolute top-0 left-0 bottom-0 right-0 pointer-events-none">
        <Fireflies id="road" />
      </div>

      <SwipeToScroll slideControls={controlsRef}>
        <div className="absolute left-0 h-full pointer-events-none w-[var(--window-width)]" ref={sectionRefs[0]} />
        <div className={`${css['horizontal-container']} pt-16 lg:pt-0 flex no-wrap h-full w-content relative`}>
          {/* Desktop version first slide */}
          <div className="relative hidden lg:block lg:w-[var(--window-width)] h-full">
            <div className="section h-full pt-4">
              <div className="flex no-wrap relative">
                <div className="relative flex flex-col justify-center h-full">
                  <Image
                    src={WonkaFont}
                    alt="Colorful road to devcon header"
                    className="z-1 max-w-[150px] md:max-w-[220px] mb-4"
                  />
                  <Image src={SoutheastAsia} alt="Southeast Asia" className="max-w-[150px] md:max-w-[215px]" />

                  <div className="mt-6">
                    <RichText content={pages.journey.section_one}></RichText>
                  </div>

                  <p className="text-slate-100 mt-4 text-sm">
                    {' '}
                    <span className="text-underline cursor-pointer" onClick={() => goToSection(1)}>
                      Follow me
                    </span>
                    , and join the journey. 🦄✨
                  </p>

                  <Image src={DevaSignature} alt="Deva's signature" className="max-w-[115px] mt-4" />

                  <motion.div
                    className={`${css['drag-to-continue']} bg-slate-700 text-sm rounded shadow py-2 px-4 mt-6 self-start`}
                    animate={{
                      opacity: props.showDragIndicator ? '100%' : '0%',
                      x: props.showDragIndicator ? '0%' : '-10%',
                    }}
                    transition={{ bounceDamping: 100, duration: 0.8, type: 'tween' }}
                  >
                    <p className="pr-1">
                      <span>Drag or use arrow keys to continue</span>
                      <span>Swipe to continue</span>
                    </p>
                    <CircleArrowRightIcon className={`icon ${css['circle-arrow-right-icon']}`} />
                  </motion.div>
                </div>

                <div className={`flex relative justify-center items-end`}>
                  <Image
                    className="object-contain object-bottom w-full"
                    ref={firstParallaxGlobe}
                    src={Globe}
                    alt="Globe with Ethereum logos"
                  />
                  <Image
                    className="absolute bottom-[12%] xl:bottom-[17%] left-auto right-auto object-contain w-2/3"
                    src={Deva}
                    ref={firstParallax.targetRef}
                    alt="Deva"
                  />

                  {/* Safari is weird... */}
                  <div className="opacity-0">a</div>

                  <div
                    ref={firstParallax.anchorRef}
                    className="w-[100vw] absolute left-full bottom-0 h-[1px] pointer-events-none"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mbbile version first slide */}
          <div className="lg:hidden flex flex-col lg:justify-center align-start h-full w-[600px] max-w-[100vw] px-[16px] min-[768px]:px-[64px] z-10">
            <Image
              src={WonkaFont}
              alt="Colorful road to devcon header"
              className="z-1 max-w-[170px] md:max-w-[220px] mb-4"
            />
            <Image src={SoutheastAsia} alt="Southeast Asia" className="max-w-[150px] md:max-w-[215px] mb-8" />
            <div className={css['glass-wrapper']}>
              <RichText content={pages.journey.section_one}></RichText>

              <p className="text-slate-100 mt-4">Follow me, and join the journey. 🦄✨</p>
            </div>

            <Image src={DevaSignature} alt="Deva's signature" className="max-w-[115px] mt-4" />
          </div>

          <div className="lg:hidden flex w-[50vw] justify-center items-end relative">
            <motion.div
              className={`flex ${css['deva-mobile']} relative left-[-60%] w-[200%] md:w-[175%] shrink-0`}
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

          <div className="flex flex-col min-[1024px]:justify-center h-full w-[600px] max-w-[100vw] px-4 lg:px-0 z-10">
            <div className="h-[1px] w-full" ref={sectionRefs[1]}></div>
            <div className={css['glass-wrapper']}>
              <RichText content={pages.journey.section_two}></RichText>

              <p className="text-slate-100 mt-4 text-sm">
                Explore{' '}
                <Link to="/" className="text-underline">
                  Devcon
                </Link>
                , or{' '}
                <span onClick={() => goToSection(2)} className="text-underline cursor-pointer">
                  keep following me for more
                </span>
                . 🦄✨
              </p>
            </div>
          </div>

          <div className="flex w-[60vw] justify-center relative lg:contents">
            <motion.div
              className={`flex relative ${css['mask-image']} left-[20%] lg:left-0 items-end lg:w-[70vw] shrink-0 mr-4 lg:mr-20 lg:pr-0`}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <Image
                src={AriaClouds}
                priority
                alt="Clouds"
                ref={secondParallaxCloud}
                className="object-contain object-bottom h-full max-h-[80%] max-w-[90%] lg:max-w-none translate-y-[12%]"
              />
              <Image
                className="absolute bottom-[-5%] left-[20%] max-h-full object-contain w-[37%]"
                src={Aria}
                ref={secondParallax.targetRef}
                alt="Aria and cat"
              />
              <div
                ref={secondParallax.anchorRef}
                className="w-[70vw] lg:w-[100vw] absolute right-0 h-full pointer-events-none"
              ></div>
            </motion.div>
          </div>

          <div className="flex flex-col min-[1024px]:justify-center h-full w-[600px] max-w-[100vw] px-4 lg:px-0 z-10">
            <div className="h-[1px] w-full" ref={sectionRefs[2]}></div>
            <div className={css['glass-wrapper']}>
              <RichText content={pages.journey.section_three}></RichText>

              <p className="text-slate-100 mt-4 text-sm">
                <Link to="#events" className="text-underline">
                  Find the event that vibes with you
                </Link>
                . Or if you’re missing something…{' '}
                <span className="text-underline cursor-pointer" onClick={() => goToSection(3)}>
                  follow me!
                </span>{' '}
                🦄✨
              </p>
            </div>
          </div>

          <div className="flex w-[60vw] justify-center relative lg:contents">
            <motion.div
              className={`flex relative ${css['mask-image']} items-end ww-[255%] lg:w-[60vw] shrink-0 mr-4 lg:mr-20 lg:pr-0`}
              // initial={{ opacity: 0, x: 100 }}
              // whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <Image
                src={LyraClouds}
                priority
                ref={thirdParallaxCloud}
                alt="Ethereum themed boy and dog"
                className="object-contain object-bottom max-h-[80%] h-full max-w-[90%] lg:max-w-none translate-y-[12%]"
              />
              <Image
                className="absolute bottom-[-5%] right-0 max-h-full object-contain w-[35%]"
                src={Lyra}
                ref={thirdParallax.targetRef}
                alt="Lyra and dog"
              />
              <div ref={thirdParallax.anchorRef} className="w-[100vw] absolute top-0 h-full pointer-events-none"></div>
            </motion.div>
          </div>

          <div className="flex flex-col min-[1024px]:justify-center h-full w-[600px] max-w-[100vw] px-4 lg:px-0 lg:mr-20 z-10">
            <div className="h-[1px] w-full" ref={sectionRefs[3]}></div>
            <div className={css['glass-wrapper']}>
              <RichText content={pages.journey.section_four}></RichText>
            </div>
          </div>
        </div>
      </SwipeToScroll>
    </div>
  )
}

const EventsTable = React.memo(({ events, pages }: any) => {
  const [includePastEvents, setIncludePastEvents] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const formattedEvents = events.map((event: any) => {
    const end = moment(event.Date.endDate).add(1, 'days')
    const now = moment()

    const eventHasPassed = now.isAfter(end)

    return {
      ...event,
      _key: event.Name + event.Location,
      eventHasPassed,
    }
  })

  const filteredEvents = formattedEvents.filter((event: any) => {
    if (!includePastEvents && event.eventHasPassed) {
      return false
    }

    if (search.length > 0) {
      return Object.keys(event).some(key => {
        const value = event[key]
        // Check if the property's value is a string and includes the search term
        // This comparison is case-insensitive
        return typeof value === 'string' && value.toLowerCase().includes(search.toLowerCase())
      })
    }

    return true
  })

  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-2">
        <p className="h2">RTD Events</p>
        <input
          className={`${css['input']} rounded-full p-1.5 text-base lg:text-sm px-4 border-solid border border-slate-300`}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Events"
        />
      </div>

      <div className="mb-4">
        <RichText content={pages.events_table}></RichText>
      </div>

      <div className="flex border-b border-solid border-[#b9b9b9]">
        <p
          className={`no-select  cursor-pointer border-b border-solid border-[#b9b9b9] translate-y-[1px] hover:font-bold px-2 md:px-4 py-2 ${
            !includePastEvents ? 'font-bold border-black ' : ''
          }`}
          onClick={() => {
            setIncludePastEvents(false)
          }}
        >
          Upcoming Events
        </p>

        <p
          className={`no-select cursor-pointer border-b border-solid border-[#b9b9b9] translate-y-[1px] hover:font-bold px-2 md:px-4 py-2 ${
            includePastEvents ? 'font-bold border-black' : ''
          }`}
          onClick={() => {
            setIncludePastEvents(!includePastEvents)
          }}
        >
          All Events
        </p>
      </div>

      <div className="text-sm">
        <Table itemKey="_key" items={filteredEvents} columns={tableColumns} initialSort={0} />
      </div>
    </>
  )
})

const Gallery = React.memo(() => {
  return (
    <div id="communities" className="expand py-8">
      <Carousel
        speed={150}
        marqueeClassName="h-[19rem]"
        images={[
          {
            alt: 'Community 1',
            src: Gal1,
          },
          {
            alt: 'Community 2',
            src: Gal2,
          },
          {
            alt: 'Community 3',
            src: Gal3,
          },
          {
            alt: 'Community 4',
            src: Gal4,
          },
          {
            alt: 'Community 5',
            src: Gal5,
          },
          {
            alt: 'Community 6',
            src: Gal6,
          },
          {
            alt: 'Community 7',
            src: Gal7,
          },
          {
            alt: 'Community 8',
            src: Gal8,
          },
          {
            alt: 'Community 9',
            src: Gal9,
          },
          {
            alt: 'Community 10',
            src: Gal10,
          },
          {
            alt: 'Community 11',
            src: Gal11,
          },
        ]}
      />
    </div>
  )
})

const SlideControls = ({ sectionRefs, controlsRef, goToSection }: any) => {
  const [showDragIndicator, setShowDragIndicator] = React.useState(true)

  const sections: any[] = sectionRefs.map((ref: any) => {
    // eslint-disable-next-line
    return useIntersectionRatio(ref, {
      root: 'intersection-root',
    })
  })

  useEffect(() => {
    controlsRef.current.subscribeX((x: any) => {
      if (x > 100) {
        setShowDragIndicator(false)
      } else {
        setShowDragIndicator(true)
      }
    })
  }, [controlsRef.current])

  const ratios = sections.map(section => parseFloat(section.intersectionRatio))
  const highestRatio = Math.max(...ratios)
  const currentSlide =
    highestRatio === 0 ? -1 : sections.findIndex(section => section.intersectionRatio === highestRatio)

  useKeyBinding(() => goToSection(currentSlide - 1), ['ArrowLeft'])
  useKeyBinding(() => goToSection(currentSlide + 1), ['ArrowRight'])

  return (
    <div className="section py-2 flex w-full relative z-10">
      <div className="flex justify-between items-center lg:justify-center">
        <div className="flex items-center justify-center bg-slate-700 lg:bg-opacity-30 rounded shadow lg:hover:bg-opacity-100 transition-all select-none">
          <div
            className={`text-xs cursor-pointer px-2 py-2 pr-3 ${currentSlide === 0 && 'opacity-20'}`}
            onClick={() => goToSection(currentSlide - 1)}
          >
            <IconChevronLeft />
          </div>

          <p className="text-sm lg:text-base">
            <span className="bold">0{currentSlide + 1}</span> / 0{sections.length}
          </p>

          <div
            className={`text-xs cursor-pointer px-2 py-2 pl-3 ${currentSlide === sections.length - 1 && 'opacity-20'}`}
            onClick={() => goToSection(currentSlide + 1)}
          >
            <IconChevronRight />
          </div>
        </div>

        <motion.div
          className={`lg:!hidden ${css['drag-to-continue']} bg-slate-700 text-sm rounded shadow py-1 px-4 self-end lg:self-start`}
          animate={{ opacity: showDragIndicator ? '100%' : '0%', x: showDragIndicator ? '0%' : '-10%' }}
          transition={{ bounceDamping: 100, duration: 0.8, type: 'tween' }}
        >
          <p className="pr-1">
            <span>Drag or use arrow keys to continue</span>
            <span>Swipe to continue</span>
          </p>
          <CircleArrowRightIcon className={`icon ${css['circle-arrow-right-icon']}`} />
        </motion.div>
      </div>
    </div>
  )
}

export default pageHOC(function RoadToDevcon(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const { data: grantsData } = useTina<PagesQuery>(props.grantsCms)
  const pages = data.pages as PagesRoad_To_Devcon
  const grantsPages = grantsData.pages as PagesIndex
  const controlsRef = useRef<any>()
  const sections: any = [useRef(), useRef(), useRef(), useRef()]

  const goToSection = React.useMemo(() => {
    return (index: number) => {
      if (!sections[index]) return

      window.scrollTo(0, 0)

      // We need to know how far the element is from the side of the screen to align with the rest of the content
      // The calculations are quite complicated so we'll left curve it and look at a piece of content that respects the layout and match its padding to the side
      const padding = (() => {
        const randomBoundedElement = document.getElementById('dont-remove-me-the-hero-needs-me')

        return randomBoundedElement?.offsetLeft || 0
      })()

      const offsetLeft = sections[index].current.offsetLeft

      controlsRef.current.setX(offsetLeft - padding)
    }
  }, [])

  const showDragIndicator = true

  const SlideControlsMemo = React.useMemo(() => {
    return () => <SlideControls sectionRefs={sections} controlsRef={controlsRef} goToSection={goToSection} />
  }, [...sections])

  return (
    <>
      <div className="" id="journey"></div>
      <Page theme={themes['index']}>
        <PageHero
          className={css['page-hero']}
          path={[{ text: <span className="bold">Get Involved</span> }, { text: 'Road To Devcon' }]}
          renderCustomNavigation={SlideControlsMemo}
          navigation={[
            {
              title: 'Journey',
              to: '#journey',
            },
            // {
            //   key: 'journey-indicator',
            //   title: (
            //     <span>
            //       {sections.map((section, index) => {
            //         if (index === currentSlide) {
            //           return (
            //             <span key={index} onClick={() => goToSection(index)} className="cursor-pointer text-red-500">
            //               •
            //             </span>
            //           )
            //         }

            //         return (
            //           <span className="cursor-pointer" key={index} onClick={() => goToSection(index)}>
            //             •
            //           </span>
            //         )
            //       })}
            //     </span>
            //   ),
            // },
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
        >
          <Hero
            controlsRef={controlsRef}
            sectionRefs={sections}
            showDragIndicator={showDragIndicator}
            goToSection={goToSection}
            pages={pages}
          />
        </PageHero>

        <div className={`section ${css['content']}`} id="events">
          <div className="" id="dont-remove-me-the-hero-needs-me"></div>

          <EventsTable events={props.events} pages={pages} />

          <Gallery />

          {/* <div className="border-t border-solid border-bottom border-[#b9b9b9] pb-4" id="grants"> */}
          <div className="border-t border-solid border-[#b9b9b9] pb-4" id="grants">
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

  const notionID = '5199f81539da498f9e2137c3928f6e93'

  return {
    props: {
      ...globalData,
      page: DEFAULT_APP_PAGE,
      events: await getNotionDatabase('en', notionID),
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
