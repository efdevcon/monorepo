import React, { useEffect, useState } from 'react'
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
// import DC7Left from 'assets/images/dc-7/logo-flowers.png'
import DC7Right from './images/dc-7/right.png'
import DC7Backdrop from './images/dc-7/backdrop.png'
import { Butterflies, Butterflies2 } from './dc7/particles'
import { Fireflies } from './dc7/fireflies'
import cn from 'classnames'
import { Button } from 'lib/components/button'
import { Link } from 'components/common/link'
import LogoFlowers from 'assets/images/dc-7/logo-flowers.png'
import TicketPrism from './dc7/ticket-prism.png'
import Aria from './dc7/Aria.png'
import Cat from './dc7/Cat.png'
import Deva from './dc7/Deva.png'
import Doggo from './dc7/Doggo.png'
import Lyra from './dc7/Lyra.png'
import DC7LogoIsolated from './dc7/dc7-logo-isolated.png'
import { useSearchParams } from 'next/navigation'
import Tilty from 'react-tilty'
import { SEO } from 'components/domain/seo'
import IconTwitter from 'assets/icons/twitter.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'

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

type TicketProps = {
  name: string
  ticketType: string
}

export const Ticket = (props: TicketProps) => {
  const heroes = [Aria, Cat, Doggo, Deva, Lyra]
  const firstLetter = props.name[0].toUpperCase()
  const alphabetIndex = firstLetter.charCodeAt(0) - 'A'.charCodeAt(0)
  const heroIndex = alphabetIndex % heroes.length
  const selectedHero = heroes[heroIndex >= 0 ? heroIndex : 0]

  return (
    <div
      // TODO: Adjust aspect as needed for social sharing
      className="flex justify-between items-evenly relative rounded-xl aspect-[16/8] w-[550px] max-w-full text-black border-[#F8F9FE] overflow-hidden shadow-xl"
      data-type="ticket"
    >
      <div
        style={{
          WebkitMask: 'radial-gradient(circle at left, transparent 20px, black 21px)',
        }}
        className="absolute left-0 w-[52%] h-full bg-[#F8F9FE]"
      ></div>
      <div
        style={{
          WebkitMask: 'radial-gradient(circle at right, transparent 20px, black 21px)',
        }}
        className="absolute right-0 w-[52%] h-full bg-[#F8F9FE]"
      ></div>

      <div
        style={{
          WebkitMask: 'radial-gradient(circle at right, transparent 20px, black 21px)',
        }}
        className="absolute left-1/2 top-0 bottom-0 right-0"
      >
        <Image src={TicketPrism} alt="Devcon logo flowers" className="h-full object-cover object-left" />
      </div>
      <div className="flex flex-col justify-between p-4 relative max-w-[75%] lg:max-w-[50%] pl-8">
        <div className="h-[20%]">
          <Image src={LogoFlowers} alt="Devcon logo flowers" className="h-full object-contain object-left" />
        </div>
        <div className="flex flex-col justify-center grow">
          <div className="text-lg lg:text-2xl">{props.name}</div>
          <span className="text-[#5B5F84] text-xs mt-4">Attending Devcon: the schelling point for the Ethereum community</span>
        </div>
        <div className="bold uppercase h-[20%] text-xs flex items-end">Devcon.org</div>
      </div>
      <div className="flex flex-col relative w-[37%] shrink-0 h-full p-4 border-l-2 border-l-solid border-dashed border-[#D9D9D9]">
        <div className="flex flex-col justify-end items-end text-sm">
          <div className="leading-3 bold uppercase text-xs text-nowrap text-[#5B5F84]">Bangkok, Thailand</div>
          <div className="text-sm text-nowrap">
            <span className="text-[#6B54AB]">12 — 15</span> Nov, 2024
          </div>
        </div>
      </div>

      <div
        style={{
          WebkitMask: 'radial-gradient(circle at right, transparent 20px, black 21px)',
        }}
        className="absolute h-full w-full"
      >
        <Image
          src={selectedHero}
          alt={`Devcon Hero`}
          className={`absolute h-[75%] lg:h-[80%] left-0 right-0 bottom-0 object-contain object-right-bottom w-full ${
            heroIndex === 0 && ''
          }`}
        />
      </div>
    </div>
  )
}

export const Hero = (props: { ticketMode?: boolean; name?: string }) => {
  const [currentUrl, setCurrentUrl] = useState('https://devcon.org/tickets/')
  const searchParams = useSearchParams()
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

  const ticketHolder = props.name ?? searchParams.get('name') ?? 'Anon'
  const ticketType = searchParams.get('type') ?? ''
  const imageUrl = `https://devcon-social.netlify.app/${ticketHolder}/opengraph-image`

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  return (
    <>
      {props.ticketMode && (
        <SEO
          title="Join me"
          separator="@"
          description="Get your ticket for Devcon SEA Nov 12 — 15 in Bangkok, Thailand"
          imageUrl={imageUrl}
        />
      )}

      <div
        ref={heroEl}
        data-jest="hero"
        className={`${css['hero']} ${css['page.id']} ${props.ticketMode ? css['ticket-mode'] : ''}`}
      >
        <motion.div className={css['devcon-7-background']} ref={backdropRef} /*style={{ y: -scroll }}*/>
          <motion.div className={css['backdrop']} style={{ x: transformX, y: transformY }}>
            <Image src={DC7Backdrop} alt="Infinite Garden leading to Southeast Asia" priority />
            <div className="absolute bottom-0 w-full h-full">
              <Fireflies id="lower-fireflies" />
            </div>
          </motion.div>
          <motion.div className={css['left']} style={{ x: transformLeftX, y: transformLeftY }}>
            <Image src={DC7Left} alt="Left Bush" priority />
          </motion.div>
          <motion.div className={css['right']} style={{ x: transformLeftX, y: transformLeftY }}>
            <Image className={css['right']} src={DC7Right} alt="Right Bush" priority />
          </motion.div>
        </motion.div>

        {props.ticketMode && (
          <div
            className={cn(
              css['ticket'],
              'flex flex-col relative justify-center items-center gap-10 px-4 max-w-full pointer-events-none'
            )}
          >
            <div className="absolute -left-[20px] top-[10%] -z-10">
              <Butterflies />
            </div>
            {/* <div className="absolute right-[20%] -bottom-[10%] -z-10">
              <Butterflies2 />
            </div> */}

            <Link to="/">
              <Image src={DC7LogoIsolated} alt="DC7 Logo" className="w-[207px] pointer-events-auto" />
            </Link>

            <div className="text-3xl max-w-[100%] lg:max-w-[500px] text-center bold font-secondary relative">
              {ticketHolder}'s Ticket
            </div>

            <Tilty
              className="max-w-full relative pointer-events-auto"
              style={{ transformStyle: 'preserve-3d' }}
              speed={5000}
            >
              <Ticket name={ticketHolder} ticketType={ticketType} />
            </Tilty>

            <Link to="/tickets">
              <Button className="bold font-secondary pointer-events-auto" color="purple-1" fat fill>
                GET YOUR TICKET
              </Button>
            </Link>

            <div className="flex flex-col items-center justify-center text-lg relative">
              <div className="bold leading-5">Join me at Devcon SEA Nov 12 — 15</div>
              <div className="text-sm">QSNCC BANGKOK THAILAND</div>
            </div>
          </div>
        )}

        {props.ticketMode && (
          <div className="flex flex-col items-center mb-4 absolute bottom-0 margin-auto z-10">
            <p className="text-sm mb-2">Share On</p>
            <div className="flex gap-4">
              <a
                // className="twitter-share-button"
                className="twitter-share-button rounded-full bg-white w-[2em] h-[2em] flex items-center justify-center"
                // @ts-ignore
                style={{ '--color-icon': '#8c72ae' }}
                href={`https://x.com/intent/tweet?text=I just got my @EFdevcon ticket! %0ASee you in Bangkok, November 12-15  %0A%0AGet your ticket, too: %0A%0A${currentUrl}`}
                target="_blank"
                rel="noreferrer"
                data-url={currentUrl}
                data-size="large"
                data-via="efdevcon"
              >
                {/* <Button className="font-bold pointer-events-auto" color="purple-1" fat fill> */}
                <IconTwitter />
                {/* </Button> */}
              </a>
              <a
                className="rounded-full bg-white w-[2em] h-[2em] flex items-center justify-center "
                // @ts-ignore
                style={{ '--color-icon': '#8c72ae' }}
                href={`https://warpcast.com/~/compose?text=I just got my @devcon ticket! %0ASee you in Bangkok, November 12-15  %0A%0AGet your ticket, too: %0A%0A${currentUrl}&channelKey=devcon&embeds[]=${currentUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                {/* <Button className="font-bold pointer-events-auto" color="purple-1" fat fill> */}
                <IconWarpcast />
                {/* </Button> */}
              </a>
            </div>
          </div>
        )}

        <div className={css['devcon-7-overlay']}>
          {!props.ticketMode && (
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
                      data-type="dc7-logo-left-text"
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
                  <Image className={`${css['dc7-logo-text']} `} src={DC7OverlayRight} alt="Event location" priority />
                  {/* <Image
                  className={`${css['dc7-logo-text']} ${css['mobile']}`}
                  src={DC7OverlayRightLeftAligned}
                  alt="Event location"
                  priority
                /> */}
                </div>
              </div>
            </div>
          )}
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

        <div
          className="absolute center w-full bottom-[32px] justify-center hidden xl:flex"
          data-type="scroll-indicator"
        >
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 16 16" width="16" height="16">
            <g className="nc-icon-wrapper" fill="#B1ABFE">
              <g className={`${css['nc-loop-mouse-16-icon-f']}`}>
                <path
                  d="M10,0H6A4.012,4.012,0,0,0,2,4v8a4.012,4.012,0,0,0,4,4h4a4.012,4.012,0,0,0,4-4V4A4.012,4.012,0,0,0,10,0Zm2,12a2.006,2.006,0,0,1-2,2H6a2.006,2.006,0,0,1-2-2V4A2.006,2.006,0,0,1,6,2h4a2.006,2.006,0,0,1,2,2Z"
                  fill="B1ABFE"
                ></path>
                <path
                  d="M8,4A.945.945,0,0,0,7,5V7A.945.945,0,0,0,8,8,.945.945,0,0,0,9,7V5A.945.945,0,0,0,8,4Z"
                  fill="B1ABFE"
                  data-color="color-2"
                ></path>
              </g>
            </g>
          </svg>
        </div>

        {!props.ticketMode && (
          <>
            <div className={css['left-rotated']}>
              <p className={'text-uppercase'}>{intl('global_subtitle')}</p>
            </div>
            <div className={css['right-rotated']}>
              <p className={'text-uppercase'}>Road TO SOUTH EAST ASIA 2024</p>
            </div>
          </>
        )}

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
