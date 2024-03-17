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

// https://codesandbox.io/p/sandbox/framer-motion-parallax-i9gwuc?file=%2Fsrc%2FApp.tsx%3A13%2C16-13%2C61&from-embed=

// function useParallax(value: number, distance: number) {
//   const motionValue = useMotionValue(value)

//   // Update the motion value whenever `value` changes
//   useEffect(() => {
//     motionValue.set(value)
//   }, [value, motionValue])

//   // Apply the transformation based on the updated motion value
//   return useTransform(motionValue, [0, 1], [-distance, distance])
// }

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

const items = [
  {
    _key: '1',
    date: 'Sort testaaa',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '2',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '3',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '4',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '5',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '6',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '7',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '8',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '9',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '10',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '11',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
  {
    _key: '12',
    date: '5th feb',
    location: '6th feb',
    event: '7th feb',
    organizer: '8th feb',
    social: '9th feb',
    website: '10th feb',
  },
]

const tableColumns: Array<TableColumn> = [
  {
    title: 'Date',
    key: 'date',
    sort: SortVariation.basic,
    render: item => {
      return <p>{item.date}</p>
    },
  },
  {
    title: 'Location',
    key: 'location',
    className: '!hidden md:!flex',
    sort: SortVariation.basic,
    render: item => {
      return <p>{item.location}</p>
    },
  },
  {
    title: 'Event',
    key: 'event',
    sort: SortVariation.basic,
    render: item => {
      return <p>{item.event}</p>
    },
  },
  {
    title: 'Organizer',
    key: 'organizer',
    className: '!hidden lg:!flex',
    sort: SortVariation.basic,
    render: item => {
      return <p>{item.organizer}</p>
    },
  },
  {
    title: 'Social',
    key: 'social',
    className: '!hidden lg:!flex',
    sort: SortVariation.basic,
    render: item => {
      return <p>{item.social}</p>
    },
  },
  {
    title: 'Website',
    key: 'website',
    sort: SortVariation.basic,
    render: item => {
      return <p>{item.website}</p>
    },
  },
]

const Hero = (props: any) => {
  const { controlsRef, sections } = props
  // const [showDragIndicator, setShowDragIndicator] = React.useState(true)

  // useEffect(() => {
  //   controlsRef.current.subscribeX((x: any) => {
  //     if (x > 100) {
  //       setShowDragIndicator(false)
  //     } else {
  //       setShowDragIndicator(true)
  //     }
  //   })
  // }, [controlsRef.current])

  useWindowWidth('window-width')

  return (
    <div
      className={`${css['position-container']} absolute top-0 right-0 left-0 w-full h-full bottom-0 z-0`}
      id="intersection-root"
    >
      <div className="absolute top-0 left-0 bottom-0 right-0 pointer-events-none">
        <Fireflies id="road" />
      </div>

      <SwipeToScroll slideControls={controlsRef}>
        <div
          className={`${css['horizontal-container']} pt-20 lg:pt-0 flex no-wrap h-full w-content relative`}
          ref={sections[0].ref}
        >
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
                  <p className="text-slate-100 mt-8">
                    Hey there, I'm Deva, the Devcon unicorn, a guiding light to the wonderstruck wanderers of Ethereum's
                    vast universe.
                  </p>
                  <p className="text-slate-100 mt-4">
                    Since the dawn of Devcon, I have been the beacon for young explorers, guiding them to find their
                    tribe. And now, once again, the Road to Devcon calls, beckoning a new generation of mavericks, just
                    like you.
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
                  className={`flex relative`}
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
                </motion.div>
              </div>
            </div>
          </div>

          <div className="lg:hidden flex flex-col lg:justify-center align-start h-full w-[600px] max-w-[100vw] px-[16px] xl:px-[64px] z-10">
            <Image
              src={WonkaFont}
              alt="Colorful road to devcon header"
              className="z-1 max-w-[170px] md:max-w-[220px] mb-4"
            />
            <Image src={SoutheastAsia} alt="Southeast Asia" className="max-w-[150px] md:max-w-[215px]" />
            <p className="text-slate-100 mt-8">
              Hey there, I'm Deva, the Devcon unicorn, a guiding light to the wonderstruck wanderers of Ethereum's vast
              universe.
            </p>
            <p className="text-slate-100 mt-4">
              Since the dawn of Devcon, I have been the beacon for young explorers, guiding them to find their tribe.
              And now, once again, the Road to Devcon calls, beckoning a new generation of mavericks, just like you.
            </p>

            <Image src={DevaSignature} alt="Deva's signature" className="max-w-[115px] mt-4" />
          </div>

          <div className="lg:hidden flex w-[50vw] justify-center relative">
            <motion.div
              className={`flex relative ${css['image']} w-[200%] shrink-0`}
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

          <div className="flex flex-col lg:justify-center h-full w-[600px] max-w-[100vw] px-4 lg:px-0 z-10">
            <p className="text-slate-100 text-base bold lg:text-lg" ref={sections[1].ref}>
              Journey on the Road to Devcon
            </p>
            <p className="text-slate-100 mt-2 lg:mt-6 text-sm lg:text-base">
              You, who resonate with the tales of coders who hack with relentless passion, community leaders who
              envisioned radical unity, artists who paint their dreams with the colors of the wild unknown, and
              economists who slice through the new-age economy. But these adventurers often feel held back by too much
              control that stifles their creativity and independence. They long for freedom, for a place where they can
              fully express their values, where innovation isn't just a buzzword but the very essence. Each of them in
              their own way, is itching for a revolution, for a platform that can transform their wild visions into
              reality.
            </p>

            <p className="text-slate-100 mt-4 text-sm">
              That's where Ethereum comes in, a network that promises independence, no central control, and unbridled
              innovation. But let's face it, diving into{' '}
              <Link
                indicateExternal
                to="https://vitalik.eth.limo/general/2023/12/28/cypherpunk.html"
                className="text-underline"
              >
                Ethereum's values and technological vision
              </Link>{' '}
              is like jumping into a wild ocean of complexity. It's easy to feel lost, adrift in a sea of technical
              jargon and knowledge gaps.{' '}
            </p>
          </div>

          <div className="flex w-[50vw] justify-center relative lg:contents">
            <motion.div
              className={`flex relative ${css['mask-image']} w-[220%] lg:w-[55vw] shrink-0`}
              // initial={{ opacity: 0, x: 100 }}
              // whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <Image
                src={GirlSchematics}
                priority
                alt="Girl holding Ethereum schematics"
                className="object-contain object-bottom h-full"
              />
            </motion.div>
          </div>

          <div className="flex flex-col items-center lg:justify-center h-full w-[600px] max-w-[100vw] px-4 lg:px-0 z-10">
            <p className="text-slate-100 text-sm lg:text-base" ref={sections[2].ref}>
              Here's where my role begins. It&apos;s my mission to lead you down the Road to Devcon, the ultimate
              gathering of Ethereum's wild hearts and passionate community. At Devcon, you are welcomed by a tribe that
              nurtures your growth. Through fiery dialogues, hands-on workshops, and interactions with our peers,
              together we untangle Ethereum's mysteries, forming bonds and friendships that stand the test of time.
            </p>
            <p className="text-slate-100 mt-8 text-sm lg:text-base">
              This year, the Road to Devcon winds through the vibrant landscapes of Southeast Asia, a region pulsating
              with the energy of innovation and change. This road is more than just a path leading to a destination,
              it's a journey of discovery, a melting pot of diverse minds. It's here that new explorers like you are
              shaping the road together, organizing events where we delve deep to untangle Ethereum's mysteries.
            </p>
          </div>

          <div className="flex w-[50vw] justify-center relative lg:contents">
            <motion.div
              className={`flex relative ${css['mask-image']} w-[325%] lg:w-[50vw] shrink-0 mr-4 lg:mr-20 lg:pr-0`}
              // initial={{ opacity: 0, x: 100 }}
              // whileInView={{ opacity: 1, x: 0 }}
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

          <div
            className="flex flex-col items-center justify-center h-full w-[600px] max-w-[100vw] px-4 lg:px-0 lg:mr-20 z-10"
            // ref={sections[3].ref}
          >
            <p className="text-slate-100 text-sm md:text-base text-center lg:text-left" ref={sections[3].ref}>
              So, to all you curious spirits out there, I say: Embrace your wild side and join us on the Road to Devcon.
              Together, we're shaping a bold and empowered future. This is your call to adventure, to be part of
              something bigger, something wilder. Let's make this journey an opportunity to tap into your untamed
              potential to shape your decentralized and empowered future.
            </p>

            <Link to="https://esp.ethereum.foundation/devcon-grants">
              <Button fat color="purple-1" className="mt-8" fill>
                Learn about RTD Grants →
              </Button>
            </Link>
          </div>
        </div>
      </SwipeToScroll>
    </div>
  )
}

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
      <Page theme={themes['teal']}>
        <PageHero
          className={css['page-hero']}
          path={[{ text: <span className="bold">Get Involved</span> }, { text: 'Road To Devcon' }]}
          renderCustomNavigation={() => {
            return (
              <div className="section py-2 flexw-full relative z-10">
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
          <Hero controlsRef={controlsRef} sections={sections} showDragIndicator={showDragIndicator} />
        </PageHero>

        <div className={`section ${css['content']}`} id="events">
          <div className="flex justify-between items-center mb-6" id="dont-remove-me-the-hero-needs-me">
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
            <p className="cursor-pointer hover:font-bold px-2 md:px-4 py-2 font-bold">All</p>
            <p className="cursor-pointer hover:font-bold px-2 md:px-4 py-2">Meetups</p>
            <p className="cursor-pointer hover:font-bold px-2 md:px-4 py-2">Past Events</p>
          </div>

          <Table itemKey="_key" items={items} columns={tableColumns} />

          <div className="mt-4 border-solid" id="grants">
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
