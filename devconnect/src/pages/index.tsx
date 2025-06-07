import type { NextPage } from 'next'
import Image from 'next/image'
import css from './index.module.scss'
import React, { useCallback, useRef, useState } from 'react'
import DevconnectIstanbulText from 'assets/images/ba/logo-text.svg'
import HeaderLogo from 'assets/images/header-logo.png'
import { SEO } from 'common/components/SEO'
import { Menu, FooterMenu } from 'common/components/layout/Menu'
import Link from 'common/components/link/Link'
import Modal from 'common/components/modal'
import { CodeOfConduct } from 'common/components/code-of-conduct/CodeOfConduct'
import FAQComponent from 'common/components/faq/faq'
import Observer from 'common/components/observer'
import ErrorBoundary from 'common/components/error-boundary/ErrorBoundary'
import FooterBackground from 'assets/images/footer-background-triangles.png'
import Parser from 'rss-parser'
import slugify from 'slugify'
import { BlogPost } from 'types/BlogPost'
import { BlogReel } from 'common/components/blog-posts/BlogPosts'
// import AnnouncementDate from 'assets/images/ba/date.png'
// import ArgentinaWhite from 'assets/images/ba/argentina-white.png'
// import BAWhite from 'assets/images/ba/ba-text-white.png'
// import CityScape from 'assets/images/ba/cityscape.png'
// import { HorizontalScroller } from 'lib/components/horizontal-scroller'
// import PastEventCard from 'lib/components/cards/past-event'
// import istanbulScheduleBackground from 'assets/images/turkeycube.png'
// import amsterdamScheduleBackground from 'assets/images/amsterdam-sched.png'
// import NewSchedule from 'lib/components/event-schedule-new'
// import { Button } from 'lib/components/button'
// import ScrollingText from 'lib/components/infinite-scroll/scrolling-text'
// import AnimatedGradient from 'fancy/components/background/animated-gradient-with-svg'
import { client } from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import RichText from 'lib/components/tina-cms/RichText'
import { motion, useScroll } from 'framer-motion'
import TwitterIcon from 'assets/icons/twitter.svg'
import TelegramIcon from 'assets/icons/telegram.svg'
import FarcasterIcon from 'assets/icons/farcaster.svg'
import MailIcon from 'assets/icons/mail.svg'
import DevconnectCubeLogo from 'assets/images/ba/cube-logo.png'
import cn from 'classnames'
import TicketIcon from 'assets/icons/ticket.svg'
import WorldIcon from 'assets/icons/world.svg'
import CampaignIcon from 'assets/icons/campaign.svg'
import PeopleIcon from 'assets/icons/people.svg'
import Voxel from 'common/components/ba/voxel'
import ScrollVideo from 'common/components/ba/scroll-video'
import Venue from 'common/components/ba/venue/venue'
import { Ticket, ExternalLink, Calendar, MapPin, SparklesIcon } from 'lucide-react'
import HeroText from 'assets/images/ba/header-text-hq.png'
import TicketExample from 'assets/images/ba/hero-ticket.png'
import { ArrowRight } from 'lucide-react'
import VoxelCard from 'common/components/ba/voxel-card/voxel-card'
import CoworkingImage from 'assets/images/ba/voxel-cards/co-working-image.png'
import CommunityImage from 'assets/images/ba/voxel-cards/community-events-image.png'
import ETHDayImage from 'assets/images/ba/voxel-cards/eth-day-image.png'
import WorldsFairImage from 'assets/images/ba/voxel-cards/worlds-fair-image.png'
import HeroImage from 'assets/images/ba/hero.jpg'
import VideoImage from 'assets/images/ba/video-preview.png'
import VoxelHeart from 'assets/images/ba/voxel-heart.png'
import VoxelTV from 'assets/images/ba/voxel-tv.png'
import VoxelPencil from 'assets/images/ba/voxel-pencil.png'
import VoxelCalendar from 'assets/images/ba/voxel-calendar.png'
import VoxelSquares from 'assets/images/ba/voxel-squares.png'

// const Cube = dynamic(() => import('common/components/cube'), {
//   ssr: false,
// })

export const Header = ({
  noGradient,
  active,
  fadeOutOnScroll,
}: {
  noGradient?: boolean
  active?: boolean
  fadeOutOnScroll?: boolean
}) => {
  const { scrollY } = useScroll()
  const [hasScrolled, setHasScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    return scrollY.onChange(latest => {
      setHasScrolled(latest > 0)
    })
  }, [scrollY])

  // const hideGradient = hasScrolled || noGradient

  return (
    <div
      className={cn('section z-[100] transition-opacity opacity-100 duration-[1000ms]', {
        // '!opacity-0': hasScrolled && fadeOutOnScroll,
      })}
    >
      <header
        className={cn(
          css['header'],
          'py-4 fixed top-0 left-0 right-0 w-full z-[100] pointer-events-none transition-all duration-[700ms]',
          {
            'opacity-0': hasScrolled && fadeOutOnScroll,
          }
        )}
        // style={{ '--display-gradient': hideGradient ? '0%' : '100%' } as any}
      >
        <div className={cn('section')}>
          <div className="flex w-full justify-between items-center">
            <Link
              href="/"
              className={cn(
                css['logo'],
                'transition-all ease duration-500 pointer-events-auto',
                {
                  '!pointer-events-none': fadeOutOnScroll && hasScrolled && !menuOpen,
                }
                // hasScrolled && !menuOpen && 'opacity-0 pointer-events-none'
              )}
            >
              <Image
                src={HeaderLogo}
                alt="Devconnect Logo"
                className="w-[105px] lg:w-[120px] h-auto [filter:drop-shadow(1px_1px_0px_rgba(0,0,0,1))]"
              />
            </Link>

            <Menu menuOpen={menuOpen} setMenuOpen={setMenuOpen} hasScrolled={hasScrolled && fadeOutOnScroll} />
          </div>
        </div>
      </header>
    </div>
  )
}

type FooterProps = {
  inFoldoutMenu?: boolean
  onClickMenuItem?: () => void
}

export const Footer = ({ inFoldoutMenu, onClickMenuItem }: FooterProps) => {
  const [codeOfConductModalOpen, setCodeOfConductModalOpen] = React.useState(false)
  let className = css['footer-container']

  if (inFoldoutMenu) className += ` ${css['in-foldout-menu']}`

  return (
    <>
      <Modal
        className={css['modal-overrides']}
        open={codeOfConductModalOpen}
        close={() => setCodeOfConductModalOpen(false)}
        noBodyScroll
      >
        <CodeOfConduct />
      </Modal>
      <Observer repeating activeClassName={css['visible']} observerOptions={{ threshold: 0.7 }}>
        <div className={className}>
          <div className={css['gradient-overlay']} id="footer-gradient"></div>
          <div className={`${css['footer']}`}>
            <div style={{ position: 'relative' }}>
              <div className={css['background']}>
                <Image src={FooterBackground} alt="Colorful rectangles and triangles" />
              </div>

              <div className="section padding-top padding-bottom">
                <div className={css['top']}>
                  {/* <DevconnectIstanbul />   */}
                  <Image src={DevconnectCubeLogo} alt="Devconnect Cube Logo" className="w-[60px] lg:w-[80px]" />
                  {/* <DevconnectCubeLogo /> */}
                  <DevconnectIstanbulText />
                </div>
                <div className={css['middle']}>
                  <div className={css['left']}>
                    <FooterMenu onClickMenuItem={onClickMenuItem} />

                    {/* <form
                      id="newsletter-signup"
                      className={css['newsletter']}
                      action="https://login.sendpulse.com/forms/simple/u/eyJ1c2VyX2lkIjo4MjUxNTM4LCJhZGRyZXNzX2Jvb2tfaWQiOjI4NDA0MywibGFuZyI6ImVuIn0="
                      method="post"
                    > */}
                    {/* <div className={css['input-container']}>
                        <div>
                          <label>Email</label>
                          <input type="email" required name="email" />
                        </div>
                      </div>
                      <input type="hidden" name="sender" value="support@devconnect.org" /> */}
                    {/* <Link href="https://paragraph.xyz/@efevents">
                      <Button color="teal-1">{(globalThis as any).translations.subscribe_to_newsletter}</Button>
                    </Link> */}
                    {/* </form> */}
                  </div>
                </div>
              </div>
            </div>
            <div className="section">
              <div className={`${css['bottom']}`}>
                <div className={css['crafted-by']}>
                  <p className="tiny-text">Crafted and curated with passion ♥ ✨ at the Ethereum Foundation.</p>
                  <p className={`${css['copyright']} tiny-text`}>
                    © {new Date().getFullYear()} — Ethereum Foundation. All Rights Reserved.
                  </p>
                </div>

                <div className={css['links']}>
                  <Link href="https://devcon.org">Devcon</Link>
                  <Link href="mailto:support@devconnect.org">Contact Us</Link>
                  <Link href="https://ethereum.foundation">Ethereum Foundation</Link>
                  <Link href="/code-of-conduct">Code of Conduct</Link>
                  <Link href="https://ethereum.org/en/privacy-policy/">Privacy policy</Link>
                  <Link href="https://ethereum.org/en/terms-of-use/">Terms of use</Link>
                  <Link href="https://ethereum.org/en/cookie-policy/">Cookie policy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Observer>
    </>
  )
}

export const withTranslations = (Component: any) => {
  return (props: any) => {
    if (!props.translations) {
      return null
    }

    const { data: translations } = useTina(props.translations) as any
    const parsedTranslations = JSON.parse(translations.global_translations.global_translations)

    // Replace direct window assignment with globalThis
    if (typeof globalThis !== 'undefined') {
      ;(globalThis as any).translations = parsedTranslations
    }

    return <Component {...props} />
  }
}

const TicketButton = ({
  fadeInArgentina,
  userHasInterruptedPlayback,
  className,
}: {
  fadeInArgentina: boolean
  userHasInterruptedPlayback: boolean
  className?: string
}) => {
  return (
    <Link
      href="https://www.eventbrite.com/e/ethereum-fair-tickets-tickets-1000000000000000000"
      className="pointer-events-auto"
      spanClass={cn('flex flex-col items-end gap-2 group', className, css['no-underline'])}
    >
      <p
        className={cn(
          'bg-[#f2f7fc] border-2 border-solid border-[#74ACDF] group-hover:translate-y-[-2px] will-change-transform transition-all duration-300 px-3 py-1 flex items-center gap-2 self-end',
          css['no-underline']
        )}
      >
        Tickets now available!
        <ExternalLink className="w-4 h-4 opacity-80" />
      </p>
      <Image src={TicketExample} alt="Ticket Example" className="w-[440px]" quality={100} />
    </Link>
  )
}

const Home: NextPage = (props: any) => {
  const { data }: { data: any } = useTina(props.cms)
  const [playerClicked, setPlayerClicked] = useState(false)
  // const { data: translations } = useTina(props.translations)
  // const translations = JSON.parse(translations.data.global_translations)

  const heroRef = useRef<HTMLDivElement>(null)
  // const [scrollProgress, setScrollProgress] = useState(0)
  // const [fadeInBA, setFadeInBA] = useState(false)
  const [fadeInArgentina, setFadeInArgentina] = useState(false)
  const [playbackFinished, setPlaybackFinished] = useState(false)
  const [fadeInDate, setFadeInDate] = useState(false)
  // Add a new state to track user scroll interaction
  const [userHasInterruptedPlayback, setUserHasInterruptedPlayback] = useState(false)
  const userInterruptedPlaybackRef = useRef(false)

  // const hasStableConnection = true

  // Add an effect to detect user scrolling
  React.useEffect(() => {
    const handleScroll = () => {
      if (!userHasInterruptedPlayback) {
        setUserHasInterruptedPlayback(true)
        // When user scrolls, immediately show UI elements that would normally wait for video progress
        if (!fadeInArgentina) setFadeInArgentina(true)
        if (!fadeInDate) setFadeInDate(true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [userHasInterruptedPlayback, fadeInArgentina, fadeInDate])

  // return <div className="text-black">Coming soon</div>

  return (
    <>
      <SEO />
      <div className={css.container} style={{ '--content-width': '1440px' } as any}>
        <main id="main" className={cn(css.main, 'text-black')} style={{ '--content-width': '1440px' } as any}>
          <div
            id="hero"
            ref={heroRef}
            className={cn('w-screen relative text-black bg-[#bbddee] h-[100vh]', css.hero, {
              '!h-[100vh]': userHasInterruptedPlayback, // !hasStableConnection,
              [css.gradient]: userHasInterruptedPlayback || fadeInArgentina,
              // 'lg:h-[200vh]': hasStableConnection,
              // [css.gradient]: fadeInArgentina || userHasInterruptedPlayback,
            })}
          >
            {/* <Header noGradient active={fadeInArgentina || userHasInterruptedPlayback} /> */}
            <Header noGradient active={true} />

            <div
              className={cn(
                css['devconnect-overlay'],
                'z-10 opacity-0 transition-opacity duration-[1500ms]',
                fadeInArgentina && 'opacity-100',
                userHasInterruptedPlayback && 'opacity-100'
              )}
            ></div>

            <div className="absolute top-0 w-full">
              <ErrorBoundary
                fallback={<div>There was an error playing the video, it could be due to your browser settings.</div>}
              >
                <ScrollVideo
                  hasStableConnection={true}
                  containerRef={heroRef}
                  onPlaybackFinish={useCallback(() => {
                    setPlaybackFinished(true)
                  }, [])}
                  onUserPlaybackInterrupt={useCallback(() => {
                    // When user scrolls during video playback, immediately show all UI elements
                    setUserHasInterruptedPlayback(true)
                    setFadeInArgentina(true)
                    setFadeInDate(true)

                    userInterruptedPlaybackRef.current = true
                  }, [])}
                  onScrollProgress={useCallback((scrollProgress: number) => {
                    if (!playbackFinished || !userInterruptedPlaybackRef.current) {
                      if (scrollProgress > 75) {
                        setFadeInArgentina(true)
                      }
                      // if (scrollProgress > 80) {
                      //   setFadeInDate(true)
                      // }
                    }
                  }, [])}
                />
              </ErrorBoundary>
            </div>

            <div
              className={cn('h-screen flex flex-col items-end justify-end relative top-0 w-full')}
              // style={scrollProgress < 50 ? {} : { opacity: '100%' }}
            >
              <div className={cn('section bottom-4 left-0 z-10 -translate-y-4', css.heroImage)}>
                <div className="flex flex-col gap-0">
                  {/* <TicketButton
                    fadeInArgentina={fadeInArgentina}
                    userHasInterruptedPlayback={userHasInterruptedPlayback}
                  /> */}

                  <div
                    className={cn(
                      `text-2xl flex flex-col mb-8 gap-2 max-w-[600px] text-white font-semibold opacity-0 transition-opacity duration-[1500ms]`,
                      (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100',
                      userHasInterruptedPlayback && 'duration-[1000ms]'
                    )}
                  >
                    <p className={cn('self-start font-secondary font-normal mb-1', css['text-highlight'])}>
                      17-22 November / Buenos Aires, Argentina
                    </p>

                    <Image src={HeroText} alt="Hero text" className={cn('translate-x-[-2%]')} />

                    <p className={cn('self-start text-xl font-secondary font-normal', css['text-highlight'])}>
                      Devconnect ARG is a showcase of Ethereum apps and an event to connect, build and accelerate
                      Ethereum adoption.
                    </p>

                    <Link href="https://esp.ethereum.foundation/devcon-grants/apply" className="pointer-events-auto">
                      <button
                        className={cn(
                          'mt-6 mb-2 border-solid border-b-[6px] group px-8 pr-6 py-2 border-[#125181] text-[white] text-xl bg-[#1B6FAE] hover:bg-[#1B6FAE] transition-colors hover:border-opacity-0'
                        )}
                      >
                        <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center gap-2">
                          Get My Ticket <ArrowRight className="w-6 h-6" />
                        </div>
                      </button>
                    </Link>
                    {/* <Image
                      src={AnnouncementDate}
                      alt="Date"
                      className={cn(
                        'min-w-[340px] w-[47%] scale-[70%] -translate-x-[12.5%] translate-y-[25%] opacity-0 transition-opacity duration-[1500ms]',
                        (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100',
                        userHasInterruptedPlayback && 'duration-[1000ms]'
                      )}
                    />

                    <Image
                      priority
                      src={ArgentinaWhite}
                      alt="Argentina text"
                      className={cn(
                        'min-w-[340px] w-[47%] mt-1 lg:mt-2 opacity-0 transition-opacity duration-[1500ms]',
                        (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100',
                        userHasInterruptedPlayback && 'duration-[1000ms]'
                      )}
                    />

                    <Image
                      src={BAWhite}
                      alt="Buenos Aires text"
                      className={cn(
                        'min-w-[340px] w-[47%] -translate-y-[55%] -translate-x-[7.5%] scale-[80%] opacity-0 transition-opacity duration-[1500ms]',
                        (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100',
                        userHasInterruptedPlayback && 'duration-[1000ms]'
                      )}
                    /> */}
                  </div>

                  <div className="flex items-center gap-8">
                    <Image
                      src={DevconnectCubeLogo}
                      alt="Devconnect Cube Logo"
                      className={cn(
                        'w-[60px] lg:w-[80px] opacity-0 transition-opacity duration-[3000ms]',
                        (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100'
                      )}
                    />

                    {/* <Link
                      href="https://paragraph.xyz/@efevents"
                      className={cn(
                        'opacity-0 transition-opacity duration-[3000ms]',
                        (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100'
                      )}
                    >
                      <Button
                        color="teal-1"
                        fat
                        fill
                        className={cn(
                          '!bg-black/80 backdrop-blur-md  border-none border-solid !border-teal-900 flex items-center gap-4',
                          (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100',
                          'text-white [text-shadow:0_0_1px_#000,0_0_2px_#000]'
                        )}
                      >
                        <MailIcon className="w-4 h-4" />
                        Subscribe to our newsletter
                      </Button>
                    </Link> */}
                  </div>
                </div>
              </div>

              <div className={cn('absolute section bottom-4 right-0 z-10 pointer-events-none')}>
                <div
                  className={cn('flex justify-end gap-4 opacity-0 transition-opacity duration-[3000ms]', {
                    '!opacity-100': fadeInArgentina || userHasInterruptedPlayback,
                  })}
                >
                  <TicketButton
                    className="mb-24"
                    fadeInArgentina={fadeInArgentina}
                    userHasInterruptedPlayback={userHasInterruptedPlayback}
                  />
                </div>

                <div
                  className={cn('flex justify-end gap-4 opacity-0 transition-opacity duration-[3000ms]', {
                    '!opacity-100': fadeInArgentina || userHasInterruptedPlayback,
                  })}
                >
                  {/* <Link
                    href="https://paragraph.xyz/@efevents"
                    className={cn(
                      'opacity-0 transition-opacity duration-[3000ms]',
                      (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100'
                    )}
                  >
                    <Button
                      color="teal-1"
                      fat
                      fill
                      className={cn(
                        '!bg-black/80 backdrop-blur-sm border-none border-solid !border-teal-900 flex items-center gap-4',
                        (fadeInArgentina || userHasInterruptedPlayback) && 'opacity-100',
                        'text-white [text-shadow:0_0_1px_#000,0_0_2px_#000]'
                      )}
                    >
                      <MailIcon className="w-4 h-4" />
                      Subscribe to our newsletter
                    </Button>
                  </Link> */}

                  <div className="text-white text-lg flex gap-4 items-center backdrop-blur-sm bg-black/80 rounded-lg p-2 px-3 shadow pointer-events-auto">
                    <p className="text-base">Follow us</p>
                    <a
                      className="cursor-pointer flex items-center hover:scale-[1.04] transition-all duration-300"
                      target="_blank"
                      rel="noreferrer"
                      href="https://twitter.com/efdevconnect"
                    >
                      <TwitterIcon style={{ fill: 'white' }} />
                    </a>
                    <a
                      className="cursor-pointer flex items-center hover:scale-[1.04] transition-all duration-300"
                      target="_blank"
                      rel="noreferrer"
                      href="https://t.me/efdevconnect"
                    >
                      <TelegramIcon style={{ fill: 'white' }} />
                    </a>

                    <a
                      className="cursor-pointer flex items-center hover:scale-[1.04] transition-all duration-300"
                      target="_blank"
                      rel="noreferrer"
                      href="https://warpcast.com/efdevconnect"
                    >
                      <FarcasterIcon style={{ fill: 'white' }} />
                    </a>

                    <a
                      className="cursor-pointer flex items-center hover:scale-[1.04] transition-all duration-300"
                      target="_blank"
                      rel="noreferrer"
                      href="https://paragraph.xyz/@efevents"
                    >
                      <MailIcon style={{ fill: 'white' }} />
                    </a>

                    {/* <MailIcon
                      style={{ fill: 'white', display: 'block', cursor: 'pointer' }}
                      className="hover:scale-[1.02] transition-all duration-300"
                      onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    /> */}
                  </div>

                  <div className="absolute bottom-0 right-0 left-0 hidden md:flex justify-center items-center flex gap-2 text-black  pointer-events-none ">
                    <div className="flex items-center text-sm gap-1.5">
                      <p className="text-sm font-semibold opacity-100 text-white [text-shadow:0_0_1px_#000,0_0_2px_#000] ">
                        {(globalThis as any).translations.scroll_for_more}
                      </p>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        x="0px"
                        y="0px"
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                      >
                        <g className="nc-icon-wrapper" fill="#ffffff">
                          <g className={`${css['nc-loop-mouse-16-icon-f']} opacity-100`}>
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
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section relative pb-0 bg-[#FAFCFF] overflow-hidden">
            <Venue />
          </div>

          <div className="z-10" style={{ background: 'linear-gradient(180deg, #EDF6FF 51.02%, #FFFFFF 100%)' }}>
            <div className="section relative !overflow-visible" id="about">
              {/* Squares Bottom Right Blue */}
              <svg
                width="154"
                height="154"
                viewBox="0 0 154 154"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute bottom-0 right-0 expand"
              >
                <g opacity="0.6">
                  <path d="M105.643 0L154 0V48.3575L105.643 48.3575V0Z" fill="#74ACDF" />
                  <path d="M52.8212 52.8213H101.179V101.179H52.8212V52.8213Z" fill="#74ACDF" />
                  <path d="M105.643 52.8213L154 52.8213V101.179H105.643V52.8213Z" fill="#74ACDF" />
                  <path d="M0 105.643H48.3575L48.3575 154H0L0 105.643Z" fill="#74ACDF" />
                  <path d="M52.8212 105.643H101.179V154H52.8212L52.8212 105.643Z" fill="#74ACDF" />
                  <path d="M105.643 105.643H154V154H105.643V105.643Z" fill="#74ACDF" />
                </g>
              </svg>
              {/* Squares Top Right Yellow */}
              <svg
                width="154"
                height="101"
                viewBox="0 0 154 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute top-0 right-0 expand"
              >
                <g opacity="0.5">
                  <path
                    d="M-2.30481e-06 48.2721L-4.41485e-06 7.62939e-06L48.3575 5.51562e-06L48.3575 48.2721L-2.30481e-06 48.2721Z"
                    fill="#F6B40E"
                  />
                  <path
                    d="M52.8213 48.2721L52.8213 5.3205e-06L101.179 3.20673e-06L101.179 48.2721L52.8213 48.2721Z"
                    fill="#F6B40E"
                  />
                  <path d="M105.643 101L105.643 52.7279L154 52.7279L154 101L105.643 101Z" fill="#F6B40E" />
                  <path
                    d="M105.643 48.2721L105.643 3.01161e-06L154 8.97841e-07L154 48.2721L105.643 48.2721Z"
                    fill="#F6B40E"
                  />
                </g>
              </svg>

              {/* Squares Bottom Left Pink */}
              <svg
                width="101"
                height="102"
                viewBox="0 0 101 102"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute bottom-0 left-0 translate-y-[53%] z-10 expand"
              >
                <g opacity="0.5">
                  <path
                    d="M48.2721 101.179L7.62939e-06 101.179L3.40185e-06 52.8212L48.2721 52.8212L48.2721 101.179Z"
                    fill="#FF85A6"
                  />
                  <path
                    d="M101 48.3575L52.7279 48.3575L52.7279 -2.62975e-05L101 -3.05176e-05L101 48.3575Z"
                    fill="#FF85A6"
                  />
                  <path
                    d="M48.2721 48.3575L3.01161e-06 48.3575L-1.21593e-06 -2.16879e-05L48.2721 -2.5908e-05L48.2721 48.3575Z"
                    fill="#FF85A6"
                  />
                </g>
              </svg>

              {/* <ScrollingText
              direction="down"
              color="teal-2"
              speed="100s"
              className="!h-[300px] !z-[1] pointer-events-none"
            ></ScrollingText> */}
              <div className="flex flex-row gap-4 py-6 flex-wrap lg:justify-between w-full lg:flex-nowrap z-[2] relative overflow-hidden">
                <div className="basis-full lg:basis-[500px] shrink-0 text-black flex gap-8 items-center">
                  {/* <RichText content={data.pages.what_is_devconnect} className="cms-markdown mt-6" /> */}
                  <RichText content={data.pages.buenos_aires} className="cms-markdown mt-6" />
                </div>

                <div className="basis-full lg:basis-auto grow flex justify-end items-center relative p-4 py-8 pr-16">
                  {/* <AnimatedGradient
                  colors={['#1B6FAE', '#1B6FAE33', '#1B6FAE66']}
                  speed={40}
                  blur="heavy"
                  className="expand !overflow-visible pointer-events-none"
                /> */}
                  <div className="aspect-video bg-white border-2 border-solid border-[white] w-[700px] shadow-[0_2_4px_0_rgba(5,3,15,0.15)] relative">
                    <Image
                      src={VideoImage}
                      alt="Video Preview"
                      className={cn(
                        'w-full h-full object-cover left-0 top-0 absolute expand cursor-pointer',
                        playerClicked && 'hidden'
                      )}
                      onClick={() => {
                        setPlayerClicked(true)
                      }}
                    />
                    <iframe
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ?controls=0&modestbranding=1&showinfo=0"
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full "
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="section relative">
              <div className="max-w-[1300px] flex justify-center items-center mx-auto py-4">
                <div className={`${css['topics']} mt-6 font-secondary`} id="topics-container">
                  {data.pages.devconnect_themes.map((theme: string, i: number) => {
                    return (
                      <Observer
                        key={i}
                        activeClassName={css['transformed']}
                        repeating
                        observerOptions={{
                          rootMargin: '-40% 0px -25% 0%',
                        }}
                      >
                        <div className={css['topic']}>
                          {theme}
                          {i < data.pages.devconnect_themes.length - 1 ? ' • ' : ''}
                        </div>
                      </Observer>
                    )
                  })}
                </div>
              </div>

              {/* <div className="border-bottom py-6 pb-2"></div> */}
            </div>
          </div>

          <div className={cn('section relative mt-12 pb-16', css['gradient-pink'])}>
            <RichText content={data.pages.event_calendar} className="cms-markdown mt-6 mb-12" />

            <div className="grid grid-cols-2 gap-4" style={{ '--icon-color': '#FF85A6' } as any}>
              {data.pages.what_to_expect.map((item: any, index: number) => {
                const props = () => {
                  switch (index) {
                    case 0:
                      return {
                        image: CoworkingImage,
                        imageAlt: 'Coworking Image',
                        tag: 'Included in ticket',
                        tagClass: 'bg-[rgba(255,133,166,1)] border-b-[rgba(228,89,127,1)]',
                        date: '17—22 November 2025',
                        location: 'La Rural',
                      }
                    case 1:
                      return {
                        image: CommunityImage,
                        imageAlt: 'Community Image',
                        tag: 'Included in ticket',
                        tagClass: 'bg-[rgba(255,133,166,1)] border-b-[rgba(228,89,127,1)]',
                        date: '17-22 November 2025',
                        location: 'La Rural',
                      }
                    case 2:
                      return {
                        image: ETHDayImage,
                        imageAlt: 'ETH Day Image',
                        tag: 'Included in ticket',
                        tagClass: 'bg-[rgba(255,133,166,1)] border-b-[rgba(228,89,127,1)]',
                        date: '17—22 November 2025',
                        location: 'La Rural',
                      }
                    case 3:
                      return {
                        image: WorldsFairImage,
                        imageAlt: 'Worlds Fair Image',
                        // tag: 'Additional booking required',
                        // tagClass: 'bg-[rgba(246,180,14,1)] border-b-[rgba(175,128,9,1)]',
                        tag: 'Included in ticket',
                        tagClass: 'bg-[rgba(255,133,166,1)] border-b-[rgba(228,89,127,1)]',
                        date: '15—23 November 2025',
                        location: 'La Rural',
                      }
                    default:
                      return {
                        image: CoworkingImage,
                        imageAlt: 'Coworking Image',
                        tag: 'Coworking',
                        tagClass: 'bg-blue-500',
                      }
                  }
                }

                const { date, location, ...cardProps } = props()

                return (
                  <VoxelCard key={index} {...cardProps}>
                    <div className="flex flex-col pb-4">
                      <p className="font-semibold pt-4 text-xl font-secondary">{item.title}</p>
                      <p className="mt-2">{item.description}</p>
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-2 will-transform">
                          <Calendar color="rgba(116, 172, 223, 1)" />
                          <p className="will-transform">{date}</p>
                        </div>

                        <div className="flex items-center gap-2 will-transform">
                          <MapPin color="rgba(116, 172, 223, 1)" />
                          <p className="will-transform">{location}</p>
                        </div>
                      </div>
                    </div>
                  </VoxelCard>
                )
              })}
            </div>
          </div>

          <div className="section relative pb-6 bg-white">
            {/* <RichText content={data.pages.how_to_contribute} className="cms-markdown mt-6" /> */}
            {/* <svg
              width="154"
              height="154"
              viewBox="0 0 154 154"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute bottom-0 right-0 expand"
            >
              <g opacity="0.6">
                <path d="M105.643 0L154 0V48.3575L105.643 48.3575V0Z" fill="#74ACDF" />
                <path d="M52.8212 52.8213H101.179V101.179H52.8212V52.8213Z" fill="#74ACDF" />
                <path d="M105.643 52.8213L154 52.8213V101.179H105.643V52.8213Z" fill="#74ACDF" />
                <path d="M0 105.643H48.3575L48.3575 154H0L0 105.643Z" fill="#74ACDF" />
                <path d="M52.8212 105.643H101.179V154H52.8212L52.8212 105.643Z" fill="#74ACDF" />
                <path d="M105.643 105.643H154V154H105.643V105.643Z" fill="#74ACDF" />
              </g>
            </svg> */}

            <div className="flex flex-col gap-8 mt-16 mb-12">
              <div>
                <h1 className="section-header">Contribute and Support</h1>

                <p className="mt-4 text-base/7 max-w-[600px]">
                  The Ethereum World’s Fair shows what Ethereum can do through real apps, infrastructure, community, and
                  local momentum. It only works when builders ship, communities show up and connect, and supporters help
                  bring it all together.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {data.pages.what_to_expect.map((item: any, index: number) => {
                  const indexes = [
                    {
                      className: 'border-[rgba(136,85,204,1)] bg-[rgba(136,85,204,0.1)]',
                      icon: VoxelHeart,
                      ctaLink: 'https://www.google.com',
                      ctaText: 'Apply here',
                    },
                    {
                      className: 'border-[rgba(221,102,170,1)] bg-[rgba(221,102,170,0.1)]',
                      icon: VoxelTV,
                      ctaLink: 'https://www.google.com',
                      ctaText: 'Apply here',
                    },
                    {
                      className: 'border-[rgba(170,167,255,1)] bg-[rgba(170,167,255,0.1))]',
                      icon: VoxelPencil,
                      ctaLink: 'https://www.google.com',
                      ctaText: 'Apply here',
                    },
                    {
                      className: 'border-[rgba(238,136,34,1)] bg-[rgba(238,136,34,0.1)]',
                      icon: VoxelCalendar,
                      ctaLink: 'https://www.google.com',
                      ctaText: 'Add your event',
                    },
                  ]

                  const { className, icon, ctaLink, ctaText } = indexes[index]

                  return (
                    <div
                      className={cn(
                        'flex flex-col justify-between gap-2 border border-solid border-b-[6px] p-4',
                        className
                      )}
                      key={index}
                    >
                      <div className="flex flex-col grow gap-4">
                        <div className="flex shrink-0">
                          <Image src={icon} alt="Icon" className="w-[64px] h-[64px]" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="font-bold text-xl font-secondary">{item.title}</p>
                          <p className="text-base/6">
                            Supporters help make the week possible. Get a space and the option to showcase your app,
                            plus flexibility to choose add-ons that match your goals.
                          </p>
                        </div>
                      </div>

                      <Link href={ctaLink} className="self-end text-[rgba(27,111,174,1)]">
                        <div className="flex items-center gap-2 uppercase font-bold">
                          {ctaText}
                          <ArrowRight className="w-5 h-5" color="rgba(27,111,174,1)" />
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className={cn('section relative py-16', css['gradient-purple'])}>
            <svg
              width="157"
              height="104"
              viewBox="0 0 157 104"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute top-0 right-0 expand"
            >
              <g opacity="0.5">
                <rect width="48.6061" height="49.3587" transform="matrix(1 0 0 -1 107.846 103.995)" fill="#FF85A6" />
                <rect width="48.6061" height="49.3587" transform="matrix(1 0 0 -1 0 49.3535)" fill="#FF85A6" />
                <rect width="48.6061" height="49.3587" transform="matrix(1 0 0 -1 53.9238 49.3535)" fill="#FF85A6" />
                <rect width="48.6061" height="49.3587" transform="matrix(1 0 0 -1 107.846 49.3535)" fill="#FF85A6" />
              </g>
            </svg>

            <svg
              width="104"
              height="218"
              viewBox="0 0 104 218"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute bottom-0 right-0 expand"
            >
              <g opacity="0.5">
                <rect y="55.7793" width="49.3029" height="50.3865" fill="#F6B40E" />
                <rect x="54.6973" y="111.559" width="49.3029" height="50.3865" fill="#F6B40E" />
                <rect y="167.337" width="49.3029" height="50.3865" fill="#F6B40E" />
                <rect x="54.6973" width="49.3029" height="50.3865" fill="#F6B40E" />
              </g>
            </svg>

            <svg
              width="140"
              height="140"
              viewBox="0 0 140 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute bottom-0 left-0 expand"
            >
              <g opacity="0.5">
                <path d="M140 96.0386L140 140L96.0387 140L96.0387 96.0386L140 96.0386Z" fill="#8855CC" />
                <path d="M91.9807 96.0386L91.9807 140L48.0193 140L48.0193 96.0386L91.9807 96.0386Z" fill="#8855CC" />
                <path
                  d="M43.9614 1.14525e-06L43.9614 43.9614L5.24234e-07 43.9614L0 1.66948e-06L43.9614 1.14525e-06Z"
                  fill="#8855CC"
                />
                <path
                  d="M43.9614 48.0193L43.9614 91.9807L1.09686e-06 91.9807L5.72625e-07 48.0193L43.9614 48.0193Z"
                  fill="#8855CC"
                />
                <path
                  d="M43.9614 96.0386L43.9614 140L1.66948e-06 140L1.14525e-06 96.0386L43.9614 96.0386Z"
                  fill="#8855CC"
                />
              </g>
            </svg>

            <svg
              width="156"
              height="157"
              viewBox="0 0 156 157"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute top-0 left-0 expand"
            >
              <g opacity="0.5">
                <path d="M48.9855 156.32L0 156.32L4.28245e-06 107.334L48.9855 107.334L48.9855 156.32Z" fill="#74ACDF" />
                <path
                  d="M102.493 102.813L53.5073 102.813L53.5073 53.8271L102.493 53.8271L102.493 102.813Z"
                  fill="#74ACDF"
                />
                <path
                  d="M48.9855 102.813L4.67775e-06 102.813L8.9602e-06 53.8271L48.9855 53.8271L48.9855 102.813Z"
                  fill="#74ACDF"
                />
                <path d="M156 49.3053L107.015 49.3053L107.015 0.31982L156 0.319824L156 49.3053Z" fill="#74ACDF" />
                <path
                  d="M102.493 49.3053L53.5073 49.3053L53.5073 0.319815L102.493 0.31982L102.493 49.3053Z"
                  fill="#74ACDF"
                />
                <path
                  d="M48.9855 49.3053L9.3555e-06 49.3053L1.3638e-05 0.319811L48.9855 0.319815L48.9855 49.3053Z"
                  fill="#74ACDF"
                />
              </g>
            </svg>

            <div className="flex justify-between items-center">
              <div className="max-w-[648px]">
                <RichText content={data.pages.event_calendar} className="cms-markdown mt-6" />

                <div className="flex gap-4">
                  <Link href="https://esp.ethereum.foundation/devcon-grants/apply" className="pointer-events-auto">
                    <button
                      className={cn(
                        'mt-6 mb-2 border-solid border-b-[6px] group px-8 pr-6 py-2 border-[#125181] text-[white] text-xl bg-[#1B6FAE] hover:bg-[#1B6FAE] transition-colors hover:border-opacity-0'
                      )}
                    >
                      <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center gap-2">
                        Get My Ticket <ArrowRight className="w-6 h-6" />
                      </div>
                    </button>
                  </Link>

                  <Link href="https://esp.ethereum.foundation/devcon-grants/apply" className="pointer-events-auto">
                    <button
                      className={cn(
                        'mt-6 mb-2 border border-solid border-b-[6px] group px-6 py-2 border-[rgb(54,54,76)] font-bold text-[rgba(54,54,76,1)] text-xl bg-[white] hover:bg-[grey]/20 transition-colors hover:border-opacity-0'
                      )}
                    >
                      <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center gap-2">
                        View Calendar
                      </div>
                    </button>
                  </Link>
                </div>
              </div>

              <Image src={VoxelSquares} alt="Voxel Squares" className="w-[500px] h-[500px] object-contain" />
            </div>
          </div>

          <div className={`section relative bg-white`}>
            <div className="mt-0 pt-16 pb-8">
              <h1 className="section-header">{(globalThis as any).translations.frequently_asked_questions}</h1>

              <div className={`${css['accordion']} tab-content`} id="faq">
                <FAQComponent questions={data.pages.faq} />
              </div>
            </div>
          </div>

          <div className="section relative pb-8 md:pb-12 bg-black overflow-hidden">
            <Image
              src={HeroImage}
              alt="Hero Image"
              className="w-full h-full object-cover left-0 top-0 absolute expand opacity-60"
            />
            <div className="pt-6 z-10">
              <h1 className="section-header white">Blog Posts</h1>

              <BlogReel blogs={props.blogs} />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}

const getBlogPosts = async (maxItems: number = 6): Promise<Array<BlogPost>> => {
  const parser: Parser = new Parser({
    customFields: {
      item: ['description'],
    },
  })

  const feed = await parser.parseURL('https://blog.ethereum.org/en/events/feed.xml')
  const blogs = feed.items
    .filter(i => i.categories?.some(category => category === 'Devconnect'))
    .map(i => {
      return {
        id: slugify(i.title ?? ''),
        title: i.title,
        description: i.description,
        date: i.pubDate ? new Date(i.pubDate).getTime() : 0,
        author: 'Devcon Team',
        body: i['content:encoded'] || i.description,
        slug: slugify(i.title ?? ''),
        permaLink: i.link,
        imageUrl: i.enclosure ? i['enclosure'].url : '',
      } as BlogPost
    })

  return blogs.slice(0, maxItems)
}

export async function getStaticProps({ locale }: { locale: string }) {
  const path = locale === 'en' ? 'index.mdx' : locale + '/index.mdx'
  const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  return {
    props: {
      blogs: await getBlogPosts(),
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
      translations,
      locale,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(Home)
