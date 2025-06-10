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
import ScrollVideo from 'common/components/ba/scroll-video'
import Venue from 'common/components/ba/venue/venue'
import { Ticket, ExternalLink, Calendar, MapPin, SparklesIcon } from 'lucide-react'
import HeroText from 'assets/images/ba/header-text-hq.png'
import TicketExample from 'assets/images/ba/ticket-hero.png'
import { ArrowRight } from 'lucide-react'
import VoxelCard from 'common/components/ba/voxel-card/voxel-card'
import CoworkingImage from 'assets/images/ba/voxel-cards/co-working-image.png'
import CommunityImage from 'assets/images/ba/voxel-cards/community-events-image.png'
import ETHDayImage from 'assets/images/ba/voxel-cards/eth-day-image.png'
import WorldsFairImage from 'assets/images/ba/voxel-cards/worlds-fair-image.png'
import CoworkingImageWide from 'assets/images/ba/voxel-cards/co-working-image-wide.jpg'
import CommunityEventsImageWide from 'assets/images/ba/voxel-cards/community-events-wide.jpg'
import ETHDayImageWide from 'assets/images/ba/voxel-cards/eth-day-image-wide.jpg'
import WorldsFairImageWide from 'assets/images/ba/voxel-cards/worlds-fair-image-wide.jpg'
import HeroImage from 'assets/images/ba/hero.jpg'
import VideoImage from 'assets/images/ba/video-preview.png'
import VoxelHeart from 'assets/images/ba/voxel-heart.png'
import VoxelTV from 'assets/images/ba/voxel-tv.png'
import VoxelPencil from 'assets/images/ba/voxel-pencil.png'
import VoxelCalendar from 'assets/images/ba/voxel-calendar.png'
import VoxelSquares from 'assets/images/ba/voxel-squares.png'
import VoxelBlueEthereum from 'assets/images/ba/voxel-blue-eth.png'
import EthGlyph from 'assets/images/ba/eth-glyph.png'

// const Cube = dynamic(() => import('common/components/cube'), {
//   ssr: false,
// })

export const Header = ({
  noGradient,
  active,
  fadeOutOnScroll,
  keepMenuOnScroll,
}: {
  noGradient?: boolean
  active?: boolean
  fadeOutOnScroll?: boolean
  keepMenuOnScroll?: boolean
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

  const fadeoutMenu = hasScrolled && fadeOutOnScroll && !keepMenuOnScroll

  return (
    <div
      className={cn('section z-[100] transition-opacity opacity-100 duration-[1000ms]', {
        // '!opacity-0': hasScrolled && fadeOutOnScroll,
      })}
    >
      <header
        className={cn(
          css['header'],
          'py-4 fixed top-0 left-0 right-0 w-full z-[100] pointer-events-none transition-all duration-[700ms]'
          // {
          //   'opacity-0': hasScrolled && fadeOutOnScroll,
          // }
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
                },
                {
                  'opacity-0': hasScrolled && fadeOutOnScroll,
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

            <Menu menuOpen={menuOpen} setMenuOpen={setMenuOpen} hasScrolled={fadeoutMenu} />
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
      href="https://tickets.devconnect.org/"
      className="pointer-events-auto"
      spanClass={cn('flex flex-col items-end gap-2 group', className, css['no-underline'])}
    >
      <p
        className={cn(
          'bg-[#f2f7fc] border-2 border-solid border-[#74ACDF] group-hover:translate-y-[-4px] will-change-transform transition-all duration-300 px-3 py-1 flex items-center gap-2 self-end',
          css['no-underline']
        )}
      >
        {(globalThis as any).translations.tickets_available}
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
        <main
          id="main"
          className={cn(css.main, 'text-[rgba(54,54,76,1)]')}
          style={{ '--content-width': '1440px' } as any}
        >
          <div
            id="hero"
            ref={heroRef}
            className={cn('w-screen relative bg-[#bbddee] h-[100vh]', css.hero, {
              '!h-[100vh]': userHasInterruptedPlayback, // !hasStableConnection,
              [css.gradient]: userHasInterruptedPlayback || fadeInArgentina,
              // 'lg:h-[200vh]': hasStableConnection,
              // [css.gradient]: fadeInArgentina || userHasInterruptedPlayback,
            })}
          >
            {/* <Header noGradient active={fadeInArgentina || userHasInterruptedPlayback} /> */}
            <Header noGradient fadeOutOnScroll keepMenuOnScroll active={true} />

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
                      {data.pages.what_is_devconnect}
                    </p>

                    <Link href="https://tickets.devconnect.org/" className="pointer-events-auto">
                      <button
                        className={cn(
                          'mt-6 mb-2 border-solid border-b-[6px] group px-8 pr-6 py-2 border-[#125181] text-[white] text-xl bg-[#1B6FAE] hover:bg-[rgba(60,138,197,1)] transition-colors hover:border-opacity-0'
                        )}
                      >
                        <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center gap-2">
                          {(globalThis as any).translations.get_my_ticket} <ArrowRight className="w-5 h-5" />
                        </div>
                      </button>
                    </Link>
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
                  </div>
                </div>
              </div>

              <div className={cn('absolute section bottom-4 right-0 z-10 pointer-events-none')}>
                <div
                  className={cn('hidden xl:flex justify-end gap-4 opacity-0 transition-opacity duration-[1500ms]', {
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
                  className={cn('flex justify-end gap-4 opacity-0 transition-opacity duration-[1500ms]', {
                    '!opacity-100': fadeInArgentina || userHasInterruptedPlayback,
                  })}
                >
                  <div className="text-white text-lg flex gap-4 items-center backdrop-blur-sm bg-black/80 rounded-lg p-2 px-3 shadow pointer-events-auto">
                    <p className="text-base">Follow us</p>
                    <a
                      className="cursor-pointer flex items-center hover:scale-[1.04] transition-all duration-300"
                      target="_blank"
                      rel="noreferrer"
                      href="https://twitter.com/efdevcon"
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
                  </div>

                  <div className="absolute bottom-0 right-0 left-0 hidden md:flex justify-center items-center gap-2  pointer-events-none ">
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

          <div className="section relative bg-[#FAFCFF] overflow-hidden">
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
                className="absolute bottom-0 left-0 translate-y-[53%] expand"
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

              <div className="flex flex-row gap-4 py-6 flex-wrap lg:justify-between w-full lg:flex-nowrap z-[2] relative overflow-hidden">
                <div className="basis-full lg:basis-[500px] mt-8 lg:mt-0 shrink-0 flex gap-8 flex-col justify-center">
                  <h1 className="section-header">{data.pages.why_join_devconnect_arg_title}</h1>

                  {data.pages.why_join_devconnect_arg_list.map((item: any, index: number) => {
                    return (
                      <div key={index} className="flex flex-col gap-2 text-lg">
                        <p className="font-secondary font-bold text-2xl">{item.title}</p>
                        <p className="text-lg">{item.description}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="basis-full lg:basis-auto grow flex justify-end items-center relative lg:p-4 py-8 lg:pr-16">
                  <div className="aspect-video bg-white border-2 border-solid border-[white] w-[700px] shadow-[0_2_4px_0_rgba(5,3,15,0.15)] relative">
                    {/* <Image
                      src={VideoImage}
                      alt="Video Preview"
                      className={cn(
                        'w-full h-full object-cover left-0 top-0 absolute expand cursor-pointer',
                        playerClicked && 'hidden'
                      )}
                      onClick={() => {
                        setPlayerClicked(true)
                      }}
                    /> */}

                    <iframe
                      src="https://www.youtube.com/embed/6EXTlJr_yjc?modestbranding=1"
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="section relative !hidden lg:!grid">
              <div className="max-w-[1300px] flex justify-center items-center mx-auto py-4">
                <motion.div
                  className={`${css['topics']} mt-6 font-secondary`}
                  id="topics-container"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={{
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren: 0.12,
                      },
                    },
                  }}
                >
                  {data.pages.devconnect_themes.map((theme: string, i: number) => {
                    return (
                      <motion.span
                        key={i}
                        className={css['topic']}
                        style={{ display: 'inline-block', willChange: 'transform' }}
                        variants={{
                          hidden: {
                            opacity: 0,
                            y: -30,
                            color: 'rgba(0, 0, 0, 0.1)',
                          },
                          visible: {
                            opacity: 1,
                            y: 0,
                            color: 'rgba(0, 0, 0, 1)',
                            transition: {
                              duration: 0.3,
                              ease: [0.25, 0.1, 0.25, 1], // easeOutQuart - much smoother
                            },
                          },
                        }}
                      >
                        {theme}
                        {i < data.pages.devconnect_themes.length - 1 ? ' • ' : ''}
                      </motion.span>
                    )
                  })}
                </motion.div>
              </div>
            </div>
          </div>

          <div className={cn('section relative lg:mt-12 pb-8', css['gradient-pink'])}>
            <RichText content={data.pages.ethereum_worlds_fair} className="cms-markdown mt-6 mb-6" />

            <div>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                style={{ '--icon-color': '#FF85A6' } as any}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.2,
                    },
                  },
                }}
              >
                {data.pages.ethereum_worlds_fair_list.map((item: any, index: number) => {
                  const props = () => {
                    switch (index) {
                      case 0:
                        return {
                          image: WorldsFairImage,
                          imageWide: WorldsFairImageWide,
                          imageAlt: 'Worlds Fair Image',
                          tag: 'Included in ticket',
                          tagClass: 'bg-[rgba(255,133,166,1)] border-b-[rgba(228,89,127,1)]',
                          date: '17—22 November 2025',
                          location: 'La Rural',
                        }
                      case 1:
                        return {
                          image: ETHDayImage,
                          imageWide: ETHDayImageWide,
                          imageAlt: 'Eth day Image',
                          tag: 'Included in ticket',
                          tagClass: 'bg-[rgba(255,133,166,1)] border-b-[rgba(228,89,127,1)]',
                          date: '17-22 November 2025',
                          location: 'La Rural',
                        }
                      case 2:
                        return {
                          image: CoworkingImage,
                          imageWide: CoworkingImageWide,
                          imageAlt: 'Coworking Image',
                          tag: 'Included in ticket',
                          tagClass: 'bg-[rgba(255,133,166,1)] border-b-[rgba(228,89,127,1)]',
                          date: '17—22 November 2025',
                          location: 'La Rural',
                        }
                      case 3:
                        return {
                          image: CommunityImage,
                          imageWide: CommunityEventsImageWide,
                          imageAlt: 'Community Image',
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
                          imageWide: CoworkingImageWide,
                          imageAlt: 'Coworking Image',
                          tag: 'Coworking',
                          tagClass: 'bg-blue-500',
                        }
                    }
                  }

                  const { date, location, ...cardProps } = props()

                  return (
                    <VoxelCard
                      key={index}
                      {...cardProps}
                      variants={{
                        hidden: {
                          opacity: 0,
                          y: 50,
                          scale: 0.9,
                        },
                        visible: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            duration: 0.6,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          },
                        },
                      }}
                    >
                      <div className="flex flex-col pb-4">
                        <p className="font-semibold pt-4 text-xl font-secondary">{item.title}</p>
                        <p className="mt-2">{item.description}</p>
                        <div className="flex items-center flex-wrap gap-4 mt-4">
                          <div className="flex items-center gap-2 will-transform">
                            <Calendar color="rgba(116, 172, 223, 1)" />
                            <p className="will-transform">{item.date}</p>
                          </div>

                          <div className="flex items-center gap-2 will-transform">
                            <MapPin color="rgba(116, 172, 223, 1)" />
                            <p className="will-transform">{item.location}</p>
                          </div>
                        </div>
                      </div>
                    </VoxelCard>
                  )
                })}
                <motion.div
                  className="flex justify-center space-x-2 col-span-1 md:col-span-2"
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 50,
                      scale: 0.9,
                    },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        duration: 0.6,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      },
                    },
                  }}
                >
                  <Link href="https://tickets.devconnect.org/" className="pointer-events-auto mt-6">
                    <button
                      className={cn(
                        'relative border-solid border-b-[6px] group px-8 pr-6 py-2 border-[#125181] text-[white] text-xl bg-[#1B6FAE] hover:bg-[rgba(60,138,197,1)] transition-colors hover:border-opacity-0'
                      )}
                    >
                      <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center gap-2">
                        {(globalThis as any).translations.get_my_ticket} <ArrowRight className="w-5 h-5" />
                      </div>
                    </button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>

          <div className="section relative pb-6 bg-white">
            <div className="flex flex-col gap-8 mt-16 mb-12">
              <div>
                <RichText content={data.pages.how_to_contribute} className="cms-markdown" />
              </div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.15,
                    },
                  },
                }}
              >
                {data.pages.contribute_and_support_list.map((item: any, index: number) => {
                  const indexes = [
                    {
                      className: 'border-[rgba(136,85,204,1)] bg-[rgba(136,85,204,0.1)]',
                      icon: VoxelHeart,
                    },
                    {
                      className: 'border-[rgba(221,102,170,1)] bg-[rgba(221,102,170,0.1)]',
                      icon: VoxelTV,
                    },
                    {
                      className: 'border-[rgba(170,167,255,1)] bg-[rgba(170,167,255,0.1))]',
                      icon: VoxelPencil,
                    },
                    {
                      className: 'border-[rgba(238,136,34,1)] bg-[rgba(238,136,34,0.1)]',
                      icon: VoxelCalendar,
                    },
                  ]

                  const { className, icon } = indexes[index]
                  const { title, description, url, url_text } = item

                  return (
                    <motion.div
                      className={cn(
                        'flex flex-col justify-between gap-2 border border-solid border-b-[6px] p-4 xl:p-5',
                        className
                      )}
                      key={index}
                      variants={{
                        hidden: {
                          opacity: 0,
                          y: 40,
                          scale: 0.95,
                        },
                        visible: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            duration: 0.5,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          },
                        },
                      }}
                    >
                      <div className="flex flex-col grow gap-4">
                        <div className="flex shrink-0">
                          <Image src={icon} alt="Icon" className="w-[64px] h-[64px]" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="font-bold text-xl font-secondary">{title}</p>
                          <p className="text-base/6">{description}</p>
                        </div>
                      </div>

                      {url && (
                        <Link href={url} className="self-end mt-2 font-semibold text-[rgba(27,111,174,1)]">
                          <div className="flex items-center gap-2 uppercase">
                            {url_text}
                            <ArrowRight className="w-5 h-5" color="rgba(27,111,174,1)" />
                          </div>
                        </Link>
                      )}

                      {!url && url_text && <div className="self-end mt-2 font-semibold uppercase">{url_text}</div>}
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>
          </div>

          <div className={cn('section relative py-8 lg:py-16', css['gradient-purple'])}>
            <svg
              width="157"
              height="104"
              viewBox="0 0 157 104"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute top-0 right-0 expand "
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
              className="absolute bottom-0 right-0 expand hidden lg:block"
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
              className="absolute bottom-0 left-0 expand hidden lg:block"
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
              className="absolute top-0 left-0 expand hidden lg:block"
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

            <div className="flex justify-between items-center z-10">
              <div className="lg:max-w-[648px]">
                <RichText content={data.pages.worlds_fair_calendar} className="cms-markdown mt-6" />

                <div className="flex gap-4">
                  <Link href="/calendar" className="pointer-events-auto">
                    <button
                      className={cn(
                        'mt-6 mb-2 border border-solid border-b-[6px] group px-6 py-2 border-[rgb(54,54,76)] font-bold text-[rgba(54,54,76,1)] text-xl bg-[white] hover:bg-[rgb(227,241,255,1)] transition-colors hover:border-opacity-0'
                      )}
                    >
                      <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center gap-2">
                        {(globalThis as any).translations.view_calendar}
                      </div>
                    </button>
                  </Link>
                </div>
              </div>

              <Image
                src={VoxelSquares}
                alt="Voxel Squares"
                className="w-[500px] h-[500px] object-contain mr-12 hidden lg:block"
              />
            </div>
          </div>

          <div className={`section relative !hidden lg:!grid overflow-hidden ${css['gradient-blue']}`}>
            <Image
              src={VoxelBlueEthereum}
              alt="Voxel Blue Ethereum"
              className="absolute top-0 right-0 bottom-0 object-contain h-[130%] translate-y-[-15%]"
            />
            <div className="flex justify-center gap-8 items-center py-[48px]">
              <div className="text-2xl font-secondary font-bold">{data.pages.ticket_cta}</div>

              <Link href="https://tickets.devconnect.org/" className="pointer-events-auto">
                <button
                  className={cn(
                    'relative border-solid border-b-[6px] group px-8 pr-6 py-2 border-[#125181] text-[white] text-xl bg-[#1B6FAE] hover:bg-[rgba(60,138,197,1)] transition-colors hover:border-opacity-0'
                  )}
                >
                  <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center gap-2">
                    {(globalThis as any).translations.get_my_ticket} <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              </Link>
            </div>
          </div>

          <div className={`section relative bg-white`}>
            <div className="mt-0 pt-16 pb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-full flex flex-col justify-between gap-4">
                <h1 className="section-header">{(globalThis as any).translations.frequently_asked_questions}</h1>
                <Image src={EthGlyph} alt="ETH Gly" className="object-contain w-[65px] hidden md:block" />
              </div>

              <div className={`${css['accordion']} tab-content`} id="faq">
                <FAQComponent questions={data.pages.faq} />
              </div>
            </div>
          </div>

          <div className={`section relative bg-[rgba(246,180,14,0.05)]`}>
            <svg
              width="218"
              height="104"
              viewBox="0 0 218 104"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute top-0 right-0"
            >
              <g opacity="0.5">
                <rect
                  x="55.7773"
                  y="104.001"
                  width="49.3029"
                  height="50.3865"
                  transform="rotate(-90 55.7773 104.001)"
                  fill="#74ACDF"
                />
                <rect
                  x="111.557"
                  y="49.3037"
                  width="49.3029"
                  height="50.3865"
                  transform="rotate(-90 111.557 49.3037)"
                  fill="#74ACDF"
                />
                <rect
                  x="167.334"
                  y="104.001"
                  width="49.3029"
                  height="50.3865"
                  transform="rotate(-90 167.334 104.001)"
                  fill="#74ACDF"
                />
                <rect y="49.3027" width="49.3029" height="50.3865" transform="rotate(-90 0 49.3027)" fill="#74ACDF" />
              </g>
            </svg>

            <RichText content={data.pages.bring_argentina_onchain} className="cms-markdown mt-16 z-10" />

            <motion.div
              className="flex flex-col md:flex-row gap-4 my-16 mt-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.2,
                  },
                },
              }}
            >
              {data.pages.bring_argentina_onchain_list.map((item: any, index: number) => {
                return (
                  <motion.div
                    key={index}
                    className="flex flex-col gap-2 border border-solid border-b-[6px] p-6 max-w-[400px] grow bg-white"
                    variants={{
                      hidden: {
                        opacity: 0,
                        y: 50,
                        scale: 0.9,
                      },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          duration: 0.6,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        },
                      },
                    }}
                  >
                    <h2 className="text-2xl font-bold font-secondary">{item.title}</h2>
                    <p className="text-base/6">{item.description}</p>

                    <Link href={item.url} className="self-end text-[rgba(27,111,174,1)] mt-2">
                      <div className="flex items-center gap-2 uppercase font-bold">
                        {item.url_text}
                        <ArrowRight className="w-5 h-5" color="rgba(27,111,174,1)" />
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
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
