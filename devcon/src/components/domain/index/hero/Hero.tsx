import React from 'react'
import css from './hero.module.scss'
// import Rays from './images/Rays'
import { useTranslations } from 'next-intl'
// import { CallToAction } from './call-to-action'
// import BackgroundBogota from './images/bogota-background.png'
// import BackgroundPassport from './images/passport-background.png'
// import BackgroundLive from './images/live-background.png'
// import BackgroundDevconWeek from './images/devcon-week-background.png'
// import { Button } from 'components/common/button'
// import { Link } from 'components/common/link'
// import TitleBogota from './images/bogota-title.svg'
// import TitleDevcon from './images/devcon-title.svg'
// import LogoBogota from 'assets/images/pages/bogota.svg'
// import LogoVideo from 'assets/images/pages/archive-1.svg'
// import LogoGetInvolved from 'assets/images/pages/get-involved.svg'
// import LogoPassport from 'assets/images/pages/devcon-passport.svg'
// import DevconStats from 'assets/images/hero/devcon-stats.png'
import Image from 'next/image'
import { Router, useRouter } from 'next/router'
// import getNewsItems from 'services/news'
// import StatsAnimation from './stats-anim'
// import Background2024 from 'assets/images/hero-bg-2024.png';
// import Devcon7Logo from 'assets/images/devcon-7.svg'
// import SEA from 'assets/images/sea-2024.png'
// import SEAPattern from 'assets/images/sea-pattern-2024.png'
// import { Tags } from 'components/common/tags'
import { motion, useSpring, useScroll } from 'framer-motion'

import DC7OverlayLeft from './images/dc-7/overlay-left-dc7.png'
import DC7OverlayRight from './images/dc-7/overlay-right-dc7.png'
import DC7Logo from './images/dc-7/logo.png'
import DC7Left from './images/dc-7/left.png'
import DC7Right from './images/dc-7/right.png'
import DC7Backdrop from './images/dc-7/backdrop.png'
import { Butterflies, Butterflies2 } from './dc7/particles'
import { Fireflies } from './dc7/fireflies'

const useDraggableLink = () => {
  const dragging = React.useRef(false)

  return {
    onMouseDown: () => {
      dragging.current = false
    },
    onMouseMove: () => {
      dragging.current = true
    },
    onClick: (e: React.SyntheticEvent) => {
      e.stopPropagation()

      if (dragging.current) {
        e.preventDefault()
      }
    },
    draggable: false,
  }
}

const usePages = () => {
  const intl = useTranslations()

  return [
    // {
    //   id: 'update-2024',
    //   background: BackgroundPassport,
    //   titlePrefix: TitleDevcon,
    //   title: '2024 Update',
    //   logo: LogoPassport,
    //   imageAlt: 'Devcon logo',
    //   button: {
    //     text: 'Learn More',
    //     url: '#update-2024', // https://archive.devcon.org',
    //   },
    // },
    // {
    //   id: 'recap',
    //   background: BackgroundPassport,
    //   titlePrefix: TitleDevcon,
    //   title: intl('hero_recap_title'),
    //   logo: LogoPassport,
    //   imageAlt: 'LogoBogota',
    //   button: {
    //     text: intl('hero_recap_relive'),
    //     url: '#recap', // https://archive.devcon.org',
    //   },
    // },
    // {
    //   id: 'passport',
    //   background: BackgroundPassport,
    //   titlePrefix: TitleDevcon,
    //   title: intl('hero_passport_title'), // 'Passport',
    //   logo: LogoPassport,
    //   imageAlt: 'LogoBogota',
    //   button: {
    //     text: intl('hero_passport_cta'), //'Launch Devcon App',
    //     url: 'https://app.devcon.org',
    //   },
    // },
    // {
    //   id: 'bogota',
    //   background: BackgroundBogota,
    //   backgroundAlt: 'Deva',
    //   titlePrefix: TitleBogota,
    //   title: intl('hero_city_guide_title'),
    //   logo: LogoBogota,
    //   imageAlt: 'LogoBogota',
    //   button: {
    //     text: intl('hero_city_guide_cta'),
    //     url: '/bogota',
    //   },
    // },
    // {
    //   id: 'devcon-week',
    //   background: BackgroundDevconWeek,
    //   titlePrefix: TitleDevcon,
    //   title: intl('hero_devcon_week_title'),
    //   logo: LogoGetInvolved,
    //   imageAlt: 'LogoBogota',
    //   button: {
    //     text: intl('hero_devcon_week_cta'),
    //     url: '/devcon-week',
    //   },
    // },
    // {
    //   id: 'livestream',
    //   background: BackgroundLive,
    //   titlePrefix: TitleDevcon,
    //   title: intl('hero_live_title'),
    //   logo: LogoVideo,
    //   imageAlt: 'LogoBogota',
    //   button: {
    //     text: intl('hero_live_cta'),
    //     url: 'https://live.devcon.org',
    //   },
    // },
  ]
}

const useCursorTracker = (ref: any) => {
  const [delta, setDelta] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    const handleMouseMove = (event: any) => {
      if (ref.current) {
        const { left, top, width, height } = ref.current.getBoundingClientRect()
        const centerX = left + width / 2
        const centerY = top + height / 2
        const deltaX = event.clientX - centerX
        const deltaY = event.clientY - centerY
        setDelta({ x: deltaX, y: deltaY })
      }
    }

    const element = ref.current

    element.addEventListener('mousemove', handleMouseMove)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
    }
  }, [ref.current])

  return delta
}

export const Hero = () => {
  // const router = useRouter()
  const intl = useTranslations()
  // const draggableLinkAttributes = useDraggableLink()
  const heroEl = React.useRef(null)
  // const pages = usePages()
  // const [currentPage, setCurrentPage] = React.useState(0)
  // const [focusNextPage, setFocusNextPage] = React.useState(false)
  const backdropRef = React.useRef<any>(null)
  const { x, y } = useCursorTracker(backdropRef)
  // const { scrollY } = useScroll()
  // const scroll = useSpring(scrollY, { stiffness: 100000, damping: 40 })

  // const page = pages[currentPage]

  // const rotateNextPage = () => {
  //   setCurrentPage(currentPage === pages.length - 1 ? 0 : currentPage + 1)
  //   setFocusNextPage(true)
  // }

  // React.useEffect(() => {
  //   if (focusNextPage) {
  //     const el = document.getElementById(page.id)

  //     // Only scroll into view if not scrolled vertically, because otherwise we scroll the user back up to the top :D
  //     if (window.scrollY === 0 && el) {
  //       el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  //     }

  //     setFocusNextPage(false)
  //   }
  // }, [page, focusNextPage])

  let transformX: any = useSpring(x, { damping: 25 })
  let transformY: any = useSpring(y, { damping: 25 })
  let transformLeftX: any = useSpring(x, { damping: 25 })
  let transformLeftY: any = useSpring(y, { damping: 25 })
  let transformRightX: any = useSpring(x, { damping: 25 })
  let transformRightY: any = useSpring(y, { damping: 25 })

  React.useEffect(() => {
    const xBackdrop = -x / 15
    const yBackdrop = -y / 20

    transformX.set(xBackdrop)
    transformY.set(yBackdrop)

    const xDir = -x / 25
    const yDir = -y / 12.5

    transformLeftX.set(xDir)
    transformLeftY.set(yDir)
    transformRightX.set(xDir * 1.5)
    transformRightY.set(yDir)
  }, [x, y])

  return (
    <>
      <div ref={heroEl} data-jest="hero" className={`${css['hero']} ${css['page.id']}`}>
        <motion.div className={css['devcon-7-background']} ref={backdropRef} /*style={{ y: -scroll }}*/>
          <motion.div className={css['backdrop']} style={{ x: transformX, y: transformY }}>
            <Image src={DC7Backdrop} alt="Infinite Garden leading to Southeast Asia" priority />
            <div className="absolute bottom-0 w-full h-full">
              <Fireflies settings={{ color: 'rgba(236, 196, 94, 1)' }} id="lower-fireflies" />
            </div>
          </motion.div>
          <motion.div className={css['left']} style={{ x: transformLeftX, y: transformLeftY }}>
            <Image src={DC7Left} alt="Left Bush" priority />
          </motion.div>
          <motion.div className={css['right']} style={{ x: transformLeftX, y: transformLeftY }}>
            <Image className={css['right']} src={DC7Right} alt="Right Bush" priority />
          </motion.div>
        </motion.div>

        <div className={css['devcon-7-overlay']}>
          <div className="section">
            <div className={css['flex']}>
              <div className={css['left']}>
                <div className={`${css['dc7-logo']}`}>
                  <Image src={DC7Logo} alt="Devcon 7 Logo" priority />
                </div>
                <div className="relative">
                  <div className="absolute left-[45%] bottom-[0%] w-full h-full z-10 hidden lg:block">
                    <Butterflies />
                  </div>
                  <Image
                    className={css['dc7-logo-text']}
                    src={DC7OverlayLeft}
                    alt="Devcon 7 logo with location"
                    priority
                  />
                </div>
              </div>
              <div className={css['right']}>
                <div className={`${css['butterflies']} hidden lg:block`}>
                  <Butterflies2 />
                </div>
                <Image className={css['dc7-logo-text']} src={DC7OverlayRight} alt="Event location" priority />
              </div>
            </div>
          </div>
        </div>

        {/* {page.id === 'recap' ? (
          <div className={css['rays-container']}>
            <Rays className={css['rays']} />
          </div>
        ) : (
          <div className={css['announcement-background']}>
            <Image
              className={page.id === 'update-2024' ? css['active'] : ''}
              src={SEAPattern}
              alt="worldmap"
              priority
            />

            <Image className={page.id === 'update-2024' ? css['active'] : ''} src={SEA} alt="worldmap" priority />
            <div>
              <Devcon7Logo />
            </div>
          </div>
        )} */}

        {/* <div className={css['page-background']}></div> */}

        <div className="absolute flex center w-full bottom-[32px] justify-center opacity-40">
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 16 16" width="16" height="16">
            <g className="nc-icon-wrapper" fill="#ffffff20">
              <g className={`${css['nc-loop-mouse-16-icon-f']}`}>
                <path
                  d="M10,0H6A4.012,4.012,0,0,0,2,4v8a4.012,4.012,0,0,0,4,4h4a4.012,4.012,0,0,0,4-4V4A4.012,4.012,0,0,0,10,0Zm2,12a2.006,2.006,0,0,1-2,2H6a2.006,2.006,0,0,1-2-2V4A2.006,2.006,0,0,1,6,2h4a2.006,2.006,0,0,1,2,2Z"
                  fill="#ffffff"
                ></path>
                <path
                  d="M8,4A.945.945,0,0,0,7,5V7A.945.945,0,0,0,8,8,.945.945,0,0,0,9,7V5A.945.945,0,0,0,8,4Z"
                  fill="#ffffff"
                  data-color="color-2"
                ></path>
              </g>
            </g>
          </svg>
        </div>

        <div className={css['left-rotated']}>
          <p className={'text-uppercase'}>{intl('global_subtitle')}</p>
        </div>
        <div className={css['right-rotated']}>
          <p className={'text-uppercase'}>Road TO SOUTH EAST ASIA 2024</p>
        </div>

        {/* <div className={`${css['page-container']} section`}>
          <div className={css['page']}> */}
        {/* <div className={css['content']}>
              <page.logo className={css['logo']} />
              <div>
                <page.titlePrefix className={css['title-prefix']} />
                <p className={css['title']}>{page.title} —</p>
              </div>

              <Button className="red bold lg hover" to={page.button.url}>
                {page.button.text} →
              </Button>

              <div className={css['page-toggle']}>
                <div
                  className={`label margin-top-less ${page.id === 'update-2024' ? css['active'] : ''}`}
                  onClick={() => setCurrentPage(0)}
                >
                  Devcon 7 Update
                </div>

                <div
                  className={`label margin-top-less ${page.id === 'recap' ? css['active'] : ''}`}
                  onClick={() => setCurrentPage(1)}
                >
                  Devcon VI Recap
                </div>
              </div>
            </div>

            {/* {pages.length > 1 && 
              <div className={css['cta']}>
                <CallToAction
                  items={
                    <>
                      <div
                        {...draggableLinkAttributes}
                        onClick={(e: any) => {
                          draggableLinkAttributes.onClick(e)

                          if (e.defaultPrevented) return

                          setCurrentPage(0)
                        }}
                        id="passport"
                        className={`${page.id === 'passport' && css['active']} ${css['cta-item']}`}
                      >
                        <p className="bold">{intl('hero_passport')} —</p>
                        <p className="font-sm">{intl('hero_passport_subtext')}</p>
                        <div className={css['timer']} onAnimationEnd={rotateNextPage}></div>
                      </div>
                      <div
                        {...draggableLinkAttributes}
                        onClick={(e: any) => {
                          draggableLinkAttributes.onClick(e)

                          if (e.defaultPrevented) return

                          setCurrentPage(1)
                        }}
                        id="bogota"
                        className={`${page.id === 'bogota' && css['active']} ${css['cta-item']}`}
                      >
                        <p className="bold">{intl('hero_city_guide')} —</p>
                        <p className="font-sm">{intl('hero_city_guide_subtext')}</p>
                        <div className={css['timer']} onAnimationEnd={rotateNextPage}></div>
                      </div>
                      <div
                        {...draggableLinkAttributes}
                        onClick={(e: any) => {
                          draggableLinkAttributes.onClick(e)

                          if (e.defaultPrevented) return

                          setCurrentPage(2)
                        }}
                        id="devcon-week"
                        className={`${page.id === 'devcon-week' && css['active']} ${css['cta-item']}`}
                      >
                        <p className="bold">{intl('hero_devcon_week')} —</p>
                        <p className="font-sm">{intl('hero_devcon_week_subtext')}</p>
                        <div className={css['timer']} onAnimationEnd={rotateNextPage}></div>
                      </div>
                      <div
                        {...draggableLinkAttributes}
                        onClick={(e: any) => {
                          draggableLinkAttributes.onClick(e)

                          if (e.defaultPrevented) return

                          setCurrentPage(3)
                        }}
                        id="livestream"
                        className={`${page.id === 'livestream' && css['active']} ${css['cta-item']}`}
                      >
                        <p className="bold">{intl('hero_live')} —</p>
                        <p className="font-sm">{intl('hero_live_subtext')}</p>
                        <div className={css['timer']} onAnimationEnd={rotateNextPage}></div>
                      </div>
                    </>
                  }
                />
              </div>
            } */}
        {/* </div>
        </div> */}

        {/* {page.id === 'recap' && <StatsAnimation />} */}

        {/* <div className={css['logo-container']}>
          <Logo alt={intl('global_title')} className={css['logo']} />
          <div className={css['add-to-cal']}>
            <div>
              <AddToCalendar />
            </div>
          </div>
        </div> */}

        {/* <div className={`${isScrolled ? css['hide'] : ''} ${css['scroll-for-more']}`}>
          <p>Scroll to learn more</p>
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 16 16" width="16" height="16">
            <g className="nc-icon-wrapper" fill="#ffffff">
              <g className={`${css['nc-loop-mouse-16-icon-f']}`}>
                <path
                  d="M10,0H6A4.012,4.012,0,0,0,2,4v8a4.012,4.012,0,0,0,4,4h4a4.012,4.012,0,0,0,4-4V4A4.012,4.012,0,0,0,10,0Zm2,12a2.006,2.006,0,0,1-2,2H6a2.006,2.006,0,0,1-2-2V4A2.006,2.006,0,0,1,6,2h4a2.006,2.006,0,0,1,2,2Z"
                  fill="#ffffff"
                ></path>
                <path
                  d="M8,4A.945.945,0,0,0,7,5V7A.945.945,0,0,0,8,8,.945.945,0,0,0,9,7V5A.945.945,0,0,0,8,4Z"
                  fill="#ffffff"
                  data-color="color-2"
                ></path>
              </g>
            </g>
          </svg>
        </div> */}
      </div>
      {/* <div className="section" style={{ position: 'relative' }}> */}
      {/* <div className={`expand ${css['gradient']}`}></div> */}
      {/* <div className={`border-bottom clear-bottom ${css['mobile']}`}>
          <CallToAction mobile />
        </div> */}
      {/* </div> */}
    </>
  )
}
