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

import Lyra from 'components/domain/road/images/rtd/lyra.png'
import LyraClouds from 'components/domain/road/images/rtd/lyra-clouds.png'
import Aria from 'components/domain/road/images/rtd/aria.png'
import AriaClouds from 'components/domain/road/images/rtd/aria-clouds.png'
import Deva from 'components/domain/road/images/rtd/deva.png'
import Globe from 'components/domain/road/images/rtd/deva-globe-2.png'
// import useGetElementHeight from 'hooks/useGetElementHeight'

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
  {
    title: 'Link',
    key: 'Link',
    // sort: SortVariation.basic,
    render: item => {
      if (!item.Link) return null

      return (
        <Link className="bolda" to={item.Link} indicateExternal>
          {item.Link}
        </Link>
      )
    },
  },
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
  const { controlsRef, sections, goToSection } = props

  useWindowWidth('window-width')

  const firstParallax = useHorizontalParallax(progress => {})

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
        <div className="absolute left-0 h-full pointer-events-none w-[var(--window-width)]" ref={sections[0].ref} />
        <div className={`${css['horizontal-container']} pt-20 lg:pt-0 flex no-wrap h-full w-content relative`}>
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
                  <p className="text-slate-100 mt-8 text-lg">
                    Hey there, I'm Deva, the Devcon unicorn. Since the dawn of Devcon I have been a guiding light to the
                    wonderstruck wanderers of Ethereum's vast universe, supporting them to find their tribe and
                    community.
                  </p>
                  <p className="text-slate-100 mt-4">
                    And now, the Road to Devcon calls again, inviting a diverse array of mavericks, just like you.
                  </p>
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

                <motion.div
                  className={`flex relative `}
                  initial={{ x: 50 }}
                  whileInView={{ x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                >
                  <Image
                    priority
                    src={DevaGlobe}
                    alt="Deva flying across globe"
                    className="object-contain object-bottom min-h-[70%]"
                  />

                  {/* <Image className="object-contain object-bottom w-full" src={Globe} alt="hahaha" />
      <Image
        className="absolute top-0 left-auto right-auto object-contain w-[70%]"
        src={Deva}
        ref={targetRef}
        alt="hahaha"
      /> */}
                </motion.div>
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
              <p className="text-slate-100">
                Hey there, I'm Deva, the Devcon unicorn. Since the dawn of Devcon I have been a guiding light to the
                wonderstruck wanderers of Ethereum's vast universe, supporting them to find their tribe and community.
              </p>
              <p className="text-slate-100 mt-4">
                And now, the Road to Devcon calls again, inviting a diverse array of mavericks, just like you.
              </p>
              <p className="text-slate-100 mt-4">Follow me, and join the journey. 🦄✨</p>
            </div>

            <Image src={DevaSignature} alt="Deva's signature" className="max-w-[115px] mt-4" />
          </div>

          <div className="lg:hidden flex w-[50vw] justify-center items-end relative">
            <motion.div
              className={`flex ${css['deva-mobile']} relative left-[-60%] w-[200%] md:w-[175%] shrink-0`}
              // initial={{ x: 50 }}
              // whileInView={{ x: 0 }}
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
            <div className={css['glass-wrapper']}>
              <p className="text-slate-100 text-base bold lg:text-xl">Why Devcon is for You</p>
              <p className="text-slate-100 mt-4 text-lg" ref={sections[1].ref}>
                Devcon is the Ethereum conference for developers, thinkers, and makers. You’ll meet the smartest and
                kindest people in the Ethereum ecosystem IRL, and gain insight into a unique culture that is challenging
                to fully understand just online.
              </p>
              <p className="text-slate-100 mt-4 text-sm">
                At Devcon, we explore Ethereum together through fiery dialogues, workshops, and peer-to-peer
                interactions. It’s where you are welcomed by a tribe that nurtures your growth, and where you build new
                relationships and networks.
              </p>

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
              className={`flex relative ${css['mask-image']} left-[20%] lg:left-0 items-end ww-[275%] lg:w-[60vw] shrink-0 mr-4 lg:mr-20 lg:pr-0`}
              // initial={{ opacity: 0, x: 100 }}
              // whileInView={{ opacity: 1, x: 0 }}
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
                className=" w-full lg:w-[100vw] absolute top-0 h-full pointer-events-none"
              ></div>
            </motion.div>
          </div>

          <div className="flex flex-col min-[1024px]:justify-center h-full w-[600px] max-w-[100vw] px-4 lg:px-0 z-10">
            <div className={css['glass-wrapper']}>
              <p className="text-slate-100 text-base bold lg:text-xl">What is the Road to Devcon?</p>

              <p className="text-slate-100 mt-4 text-lg" ref={sections[2].ref}>
                The Road to Devcon (RTD) is a series of Ethereum events and educational initiatives leading up to
                Devcon, organized by the active local communities in Southeast Asia.
              </p>
              <p className="text-slate-100 mt-4 text-sm">
                Explorers like you are shaping the road together, diving into workshops and talks, empowered by
                Ethereum’s promises and the motivation to bring this innovation to local communities, creating
                opportunities to learn and connect.
              </p>
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
            <div className={css['glass-wrapper']}>
              <p className="text-slate-100 text-base bold lg:text-xl">
                Become a leader: Organize an event or start a community
              </p>

              <p className="text-slate-100 mt-4 lg:text-lg" ref={sections[3].ref}>
                If you're in SEA, community-driven, and passionate about Ethereum's positive impact, we're here to
                support you! This is your call to adventure, to be part of something bigger, something wilder.
              </p>
              <p className="text-slate-100 mt-4 text-sm">
                Imagine organizing events within your community to showcase Ethereum, or starting a new grassroots
                community through meetups and other educational initiatives focused on Ethereum.
              </p>
              <p className="text-slate-100 mt-4 text-sm">
                If a fire is ignited within you, now is the time to apply for the RTD grants and be a part of building
                our empowered, decentralized future. 🦄✨
              </p>

              <Link to="https://esp.ethereum.foundation/devcon-grants">
                <Button fat color="purple-1" className="mt-8" fill>
                  Apply For a Grant →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </SwipeToScroll>
    </div>
  )
}

const EventsTable = React.memo(({ events }: any) => {
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

      <p className="mb-4">
        The Road to Devcon (RTD) is a series of Ethereum events and educational initiatives leading up to Devcon,
        organized by the local communities in and near Southeast Asia.
      </p>

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
          Show Past Events
        </p>
      </div>

      <div className="text-sm">
        <Table itemKey="_key" items={filteredEvents} columns={tableColumns} initialSort={0} />
      </div>
    </>
  )
})

export default pageHOC(function RoadToDevcon(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const { data: grantsData } = useTina<PagesQuery>(props.grantsCms)
  const pages = data.pages as PagesRoad_To_Devcon
  const grantsPages = grantsData.pages as PagesIndex
  const controlsRef = useRef<any>()
  const [showDragIndicator, setShowDragIndicator] = React.useState(true)

  useEffect(() => {
    controlsRef.current.subscribeX((x: any) => {
      if (x > 100) {
        setShowDragIndicator(false)
      } else {
        setShowDragIndicator(true)
      }
    })
  }, [controlsRef.current])

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

    // We need to know how far the element is from the side of the screen to align with the rest of the content
    // The calculations are quite complicated so we'll left curve it and look at a piece of content that respects the layout and match its padding to the side
    const padding = (() => {
      const randomBoundedElement = document.getElementById('dont-remove-me-the-hero-needs-me')

      return randomBoundedElement?.offsetLeft || 0
    })()

    const offsetLeft = sections[index].ref.current.offsetLeft

    controlsRef.current.setX(offsetLeft - padding)
  }

  useKeyBinding(() => goToSection(currentSlide - 1), ['ArrowLeft'])
  useKeyBinding(() => goToSection(currentSlide + 1), ['ArrowRight'])

  return (
    <>
      <div className="" id="journey"></div>
      <Page theme={themes['index']}>
        <PageHero
          className={css['page-hero']}
          path={[{ text: <span className="bold">Get Involved</span> }, { text: 'Road To Devcon' }]}
          renderCustomNavigation={() => {
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
                      className={`text-xs cursor-pointer px-2 py-2 pl-3 ${
                        currentSlide === sections.length - 1 && 'opacity-20'
                      }`}
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
          }}
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
            sections={sections}
            showDragIndicator={showDragIndicator}
            goToSection={goToSection}
          />
        </PageHero>

        <div className={`section ${css['content']}`} id="events">
          <div className="" id="dont-remove-me-the-hero-needs-me"></div>

          <EventsTable events={props.events} />

          <div className="border-t border-solid border-[#b9b9b9]" id="grants">
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
