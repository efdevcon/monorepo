import type { NextPage } from 'next'
import Image from 'next/image'
import css from './index.module.scss'
import React from 'react'
import HeaderLogo from 'assets/images/header-logo.svg'
import DevconnectIstanbulText from 'assets/images/ba/logo-text.svg'
import DevconnectIstanbul from 'assets/images/istanbul-logo-with-eth.svg'
import { SEO } from 'common/components/SEO'
import { Menu, FooterMenu } from 'common/components/layout/Menu'
import Link from 'common/components/link/Link'
import Accordion, { AccordionItem } from 'common/components/accordion'
import BAText from 'assets/images/ba/ba-text.png'
import Modal from 'common/components/modal'
import { CodeOfConduct } from 'common/components/code-of-conduct/CodeOfConduct'
import FAQComponent from 'common/components/faq/faq'
import HeroImage from 'assets/images/ba/hero.png'
import Observer from 'common/components/observer'
import ErrorBoundary from 'common/components/error-boundary/ErrorBoundary'
import FooterBackground from 'assets/images/footer-background-triangles.png'
import Parser from 'rss-parser'
import slugify from 'slugify'
import { BlogPost } from 'types/BlogPost'
import CityScape from 'assets/images/ba/cityscape.png'
import { BlogReel } from 'common/components/blog-posts/BlogPosts'
import ShapesImage from 'assets/images/shapes.png'
import { HorizontalScroller } from 'lib/components/horizontal-scroller'
import PastEventCard from 'lib/components/cards/past-event'
import moment from 'moment'
import { leftPadNumber } from 'lib/utils'
import istanbulScheduleBackground from 'assets/images/istanbul-sched.png'
import amsterdamScheduleBackground from 'assets/images/amsterdam-sched.png'
import InfiniteScroller from 'lib/components/infinite-scroll'
import Cover1 from 'assets/images/ist-video-archive/LightClient_Cover.webp'
import Cover2 from 'assets/images/ist-video-archive/wallet_unconference_cover.webp'
import Cover3 from 'assets/images/ist-video-archive/conflux_banner.webp'
import Cover4 from 'assets/images/ist-video-archive/PROGCRYPTO_Cover.webp'
import Cover5 from 'assets/images/ist-video-archive/solidity-submit-cover.webp'
import Cover6 from 'assets/images/ist-video-archive/AWA_cover.webp'
import Cover7 from 'assets/images/ist-video-archive/ethconomics_cover.webp'
import Cover8 from 'assets/images/ist-video-archive/EVM_summit_cover.webp'
import Cover9 from 'assets/images/ist-video-archive/ETHGunu_cover.webp'
import Cover10 from 'assets/images/ist-video-archive/staking_cover.webp'
import Cover11 from 'assets/images/ist-video-archive/secureum_banner.webp'
import Cover12 from 'assets/images/ist-video-archive/EPF_Cover.webp'
import SwipeToScroll from 'common/components/swipe-to-scroll'
import { client } from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import RichText from 'lib/components/tina-cms/RichText'
import { TinaMarkdown } from 'tinacms/dist/rich-text'
import { PagesQuery } from '../../tina/__generated__/types'
import { motion, useScroll } from 'framer-motion'
import TwitterIcon from 'assets/icons/twitter.svg'
import TelegramIcon from 'assets/icons/telegram.svg'
import FarcasterIcon from 'assets/icons/farcaster.svg'
import MailIcon from 'assets/icons/mail.svg'
import DevconnectCubeLogo from 'assets/images/ba/cube-logo.png'
import Cowork1 from 'assets/images/cowork-recap/cowork-1.jpg'
import Cowork2 from 'assets/images/cowork-recap/cowork-2.jpg'
import Cowork3 from 'assets/images/cowork-recap/cowork-3.jpg'
import Cowork4 from 'assets/images/cowork-recap/cowork-4.jpg'
import Cowork5 from 'assets/images/cowork-recap/cowork-5.jpg'
import Cowork6 from 'assets/images/cowork-recap/cowork-6.jpg'
import Cowork7 from 'assets/images/cowork-recap/cowork-7.jpg'
import Cowork8 from 'assets/images/cowork-recap/cowork-8.jpg'
import { Button } from 'lib/components/button'
import cn from 'classnames'

// const Cube = dynamic(() => import('common/components/cube'), {
//   ssr: false,
// })

function getTimeUntilNovember13InTurkey() {
  // Create a Date object for the current date
  const currentDate = moment.utc()

  // Set the target date to November 13th, 8 am
  const targetDate = moment.utc([2023, 10, 13, 8]) // Note: Month is 0-based, so 10 represents November.

  // Calculate the time difference in milliseconds
  const timeDifference = targetDate.diff(currentDate) - 1000 * 60 * 60 * 3 // add 3 hours for turkey time (UTC+3)

  // Calculate days, hours, minutes, and seconds
  const days = Math.max(Math.floor(timeDifference / (1000 * 60 * 60 * 24)), 0)
  const hours = Math.max(Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), 0)
  const minutes = Math.max(Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)), 0)
  const seconds = Math.max(Math.floor((timeDifference % (1000 * 60)) / 1000), 0)

  if (timeDifference < 0) {
    const dayOne = moment.utc([2023, 10, 13])
    const timeDiff = currentDate.diff(dayOne, 'days')

    return `DAY ${leftPadNumber(timeDiff + 1)}`
  }

  // Return the time difference as an object
  return {
    days,
    hours,
    minutes,
    seconds,
  }
}

export const Header = () => {
  const { scrollY } = useScroll()
  const [hasScrolled, setHasScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    return scrollY.onChange(latest => {
      setHasScrolled(latest > 0)
    })
  }, [scrollY])

  return (
    <div className="section z-[100]">
      <header className={`${css['header']} py-4 fixed top-0 left-0 right-0 w-full z-[100]`}>
        <div className="section">
          <div className="flex w-full justify-between items-center">
            <Link
              href="/"
              className={cn(css['logo'], 'transition-all ease duration-500', hasScrolled && !menuOpen && 'opacity-0')}
            >
              <HeaderLogo />
            </Link>

            <Menu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
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

                    <form
                      id="newsletter-signup"
                      className={css['newsletter']}
                      action="https://login.sendpulse.com/forms/simple/u/eyJ1c2VyX2lkIjo4MjUxNTM4LCJhZGRyZXNzX2Jvb2tfaWQiOjI4NDA0MywibGFuZyI6ImVuIn0="
                      method="post"
                    >
                      <div className={css['input-container']}>
                        <div>
                          <label>Email</label>
                          <input type="email" required name="email" />
                        </div>
                      </div>
                      <input type="hidden" name="sender" value="support@devconnect.org" />
                      <Button color="teal-1">{(globalThis as any).translations.subscribe_to_newsletter}</Button>
                    </form>
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

const Scene = (props: any) => {
  let className = css['scene']

  if (props.className) className += ` ${props.className}`
  if (props.growVertically) className += ` ${css['grow-vertically']}`
  if (props.growNaturally) className += ` ${css['grow-naturally']}`

  return (
    <>
      <div id={props.id} className={className}>
        {props.children}
      </div>
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

const Home: NextPage = (props: any) => {
  const { data }: { data: any } = useTina(props.cms)
  // const { data: translations } = useTina(props.translations)
  // const translations = JSON.parse(translations.data.global_translations)

  return (
    <>
      <SEO />
      <div className={css.container}>
        <main id="main" className={cn(css.main, 'text-black')}>
          <div className={cn('h-screen w-screen relative text-black', css.hero)}>
            <Header />

            <div className={cn('absolute section bottom-4 left-0 z-10', css.heroImage)}>
              <div className="flex flex-col gap-8">
                <p className={`text-2xl lg:text-4xl  font-semibold`}>
                  {data.pages.catchphrase}...{' '}
                  <Image
                    src={BAText}
                    alt="Buenos Aires"
                    className={cn('min-w-[320px] w-[45%] mt-1 lg:mt-2', css.revealFromLeft)}
                  />
                </p>
                <Link
                  href=""
                  className={`flex lg:mb-1 self-start shadow text-xs sm:text-base rounded-full p-3 px-4 sm:p-4 sm:px-6 select-none hover:scale-[1.02] transition-all duration-300 z-10 ${css['video-recap-button']}`}
                >
                  <div className="text-[#55717B] z-10">{data.pages.button}</div>
                </Link>
                <Image src={DevconnectCubeLogo} alt="Devconnect Cube Logo" className="w-[60px] lg:w-[80px]" />
              </div>
            </div>

            <Image
              src={HeroImage}
              alt="Hero Image"
              className={cn('absolute top-0 left-0 w-full h-full object-cover', css.heroImage)}
            />

            <div className={cn('absolute section bottom-4 right-0 z-10')}>
              <div className="flex justify-end gap-4">
                <div className="text-white text-xl flex gap-4 items-center backdrop-blur-sm bg-black/20 rounded-lg p-2 px-3 shadow">
                  <a
                    className="cursor-pointer flex items-center"
                    target="_blank"
                    rel="noreferrer"
                    href="https://twitter.com/efdevconnect"
                  >
                    <TwitterIcon style={{ fill: 'white' }} />
                  </a>
                  <a
                    className="cursor-pointer flex items-center"
                    target="_blank"
                    rel="noreferrer"
                    href="https://t.me/efdevconnect"
                  >
                    <TelegramIcon style={{ fill: 'white' }} />
                  </a>

                  <a
                    className="cursor-pointer flex items-center"
                    target="_blank"
                    rel="noreferrer"
                    href="https://warpcast.com/efdevconnect"
                  >
                    <FarcasterIcon style={{ fill: 'white' }} />
                  </a>

                  <MailIcon
                    style={{ fill: 'white', display: 'block', cursor: 'pointer' }}
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  />
                </div>

                <div className="absolute bottom-0 right-0 left-0 hidden md:flex justify-center items-center flex gap-2 text-black ">
                  <div className="flex items-center text-sm gap-1.5">
                    <p className="text-sm font-semibold opacity-60">
                      {(globalThis as any).translations.scroll_for_more}
                    </p>
                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 16 16" width="14" height="14">
                      <g className="nc-icon-wrapper" fill="#ffffff">
                        <g className={`${css['nc-loop-mouse-16-icon-f']} opacity-60`}>
                          <path
                            d="M10,0H6A4.012,4.012,0,0,0,2,4v8a4.012,4.012,0,0,0,4,4h4a4.012,4.012,0,0,0,4-4V4A4.012,4.012,0,0,0,10,0Zm2,12a2.006,2.006,0,0,1-2,2H6a2.006,2.006,0,0,1-2-2V4A2.006,2.006,0,0,1,6,2h4a2.006,2.006,0,0,1,2,2Z"
                            fill="#000000"
                          ></path>
                          <path
                            d="M8,4A.945.945,0,0,0,7,5V7A.945.945,0,0,0,8,8,.945.945,0,0,0,9,7V5A.945.945,0,0,0,8,4Z"
                            fill="#000000"
                            data-color="color-2"
                          ></path>
                        </g>
                      </g>
                    </svg>
                  </div>
                </div>

                {/* <div className="text-white text-lg flex gap-4 items-center backdrop-blur-sm bg-black/10 rounded-lg p-2">
                  <Link className="text-sm" href="/es" locale={false}>
                    Español 🇪🇸
                  </Link>
                </div> */}
              </div>
            </div>
          </div>

          {/* <Scene className={css['scene-hero']}>

            <div className={css['cube-container']}>
              <div className={css['cube']} id="cube" />
              <ErrorBoundary>
                <Cube />
              </ErrorBoundary>
            </div> 

            <div className="section">
              <div className={css['info-container']}>
                <div className={`${css['info']}`}>
                  <div>
                    <p className={`${css['big-description']}`}>
                      {data.pages.catchphrase}
                    </p>

                    <div
                      style={{ maxWidth: '575px', marginBottom: '12px', color: '#3b3b3b' }}
                      className="big-text flex gap-3 items-center"
                    >
                    </div>

                    <div className={css['buttons']}>


                      <Link
                        href="https://x.com/EFDevconnect"
                        className={`button slick-purple hover:scale-[1.02] transition-all duration-300 ${css['video-recap-button']}`}
                      >
                        {data.pages.button}
                      </Link>
                    </div>
                  </div>
                  <div className={css['countdown']}>

                  </div>
                </div>
              </div>
            </div> 

            <div className={`section ${css['bottom-section']}`}>
              <div className={`${css['bottom']} margin-bottom-less`}>
                <div className="flex gap-3 text-xl items-center relative">
                  <div className={'absolute top-0 -translate-y-full left-0 text-[11px] leading-none pb-1.5 opacity-50'}>
                    @EFDevconnect
                  </div>
                  {/* <Logo
                    onMouseEnter={() => setHehe(true)}
                    onMouseLeave={() => setHehe(false)}
                    onTouchStart={() => setHehe(!hehe)}
                    className={css['logo-bottom-left']}
                    style={{ filter: 'grayscale(40%)', marginRight: '8px' }}
                  /> 

                  <a
                    target="_blank"
                    className="cursor-pointer flex items-center"
                    rel="noreferrer"
                    href="https://x.com/EFDevconnect/"
                  >
                    <TwitterIcon style={{ fill: 'black' }} />
                  </a>
                  <a
                    target="_blank"
                    className="cursor-pointer flex items-center"
                    rel="noreferrer"
                    href="https://t.me/efdevconnect"
                  >
                    <TelegramIcon style={{ fill: 'black' }} />
                  </a>
                  <a
                    target="_blank"
                    className="cursor-pointer flex items-center"
                    rel="noreferrer"
                    href="https://warpcast.com/efdevconnect"
                  >
                    <FarcasterIcon style={{ fill: 'black' }} />
                  </a>

                  <MailIcon
                    style={{ fill: 'black', display: 'block', cursor: 'pointer' }}
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  />
                </div>

                <div className={css['scroll-for-more']}>
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
                </div>
              </div>
            </div>
          </Scene> */}

          {/* <Scene growVertically growNaturally id="recap-video" className={`${css['scene-istanbul']}`}>
            <div className="section" id="about">
              <h1 className="section-header clear-vertical" style={{ zIndex: 1 }}>
                <span className="text-teal-400">DEVCONNECT IST</span>
              </h1>

              <div className={`columns margin-bottom flex flex-col xl:flex-row`}>
                <div className="xl:basis-1/2 align-self flex flex-col lg:mr-[25px]">
                  <div>
                    <p className="large-text">
                      The vibrant metropolis of Istanbul hosted Devconnect from November 13-19.{' '}
                      <span className="border-b-[3px] border-solid font-bold border-red-500">
                        Over 3500 Ethereum enthusiasts
                      </span>{' '}
                      gathered at the <b>Devconnect Cowork</b> in the Istanbul Congress Center, while many more attended
                      independent events throughout Istanbul.
                    </p>

                    <br />

                    <p>
                      Each event offered key insights into their respective areas and highlighted crucial topics for
                      progress within the Ethereum ecosystem. Trending topics varied from L2s and programmable
                      cryptography to world-building, infrastructure, global impact, Ethereum's core values, and
                      real-world use cases.
                    </p>

                    <br />

                    <p>
                      The overarching theme of Devconnect Istanbul 2023 was the enthusiasm and involvement of the local
                      Turkish Ethereum community. ETHGünü and notDEVCON and d:pact demonstrated the local impact of
                      Ethereum. It highlighted how local communities are essential in fostering a global network,
                      contributing unique perspectives.
                    </p>

                    <br />

                    <p>
                      <b>Thank you</b> to everyone who joined us at Devconnect Istanbul 2023! We look forward to seeing
                      the ongoing connections and progress you all will continue to make for Ethereum.
                    </p>
                  </div>

                  <div className={`margin-top ${css['nowrap']}`}>
                    <Link
                      href="https://blog.ethereum.org/2023/12/04/devconnect-ist-wrap"
                      indicateExternal
                      className={`button wide text-teal-400-fill ${css['cowork-tickets-button']}`}
                    >
                      Read the blog
                    </Link>
                  </div>
                </div>

                <div className="xl:basis-1/2 w-full md:w-3/4 md:self-start xl:w-full mt-8 xl:mt-0 xl:ml-[25px]">
                  <div className="aspect">
                    <iframe
                      width="100%"
                      height="100%"
                      src="https://www.youtube.com/embed/QoPFqV6jCTI"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>

            <div className={css['background-cityscape']}>
              <Image src={bgMerged} alt="Istanbul inspired Cityscape Background" />
            </div>
          </Scene> */}

          <div className="section">
            <div className="flex flex-row gap-4 border-bottom pb-4 flex-wrap md:flex-nowrap">
              <div className="basis-full md:basis-1/2 shrink-0 text-black" id="about">
                {/* <h1 className="section-header text-teal-400 mt-4">About Devconnect</h1> */}
                <RichText content={data.pages.what_is_devconnect} className="cms-markdown mt-6" />
              </div>
              <div className="basis-full md:basis-1/2 shrink-0">
                <HorizontalScroller>
                  <div className="flex flex-row flex-wrap gap-4 py-6 pb-2 max-w-full">
                    <PastEventCard
                      text="Devconnect IST 2023"
                      className="w-[175px] lg:w-[150px] !min-h-[auto] !min-w-[auto] select-none"
                      image={istanbulScheduleBackground}
                      imageAlt="Istanbul collage"
                      link="/istanbul"
                    />

                    <PastEventCard
                      text="Devconnect AMS 2022"
                      className="w-[175px] lg:w-[150px] !min-h-[auto] !min-w-[auto] select-none"
                      image={amsterdamScheduleBackground}
                      imageAlt="Amsterdam collage"
                      link="/amsterdam"
                    />
                  </div>
                </HorizontalScroller>
              </div>
            </div>
          </div>

          <div className="section relative pb-12">
            <div className="absolute left-0 right-0 bottom-0">
              <Image src={CityScape} alt="Buenos Aires inspired Cityscape Background" />
            </div>
            <RichText content={data.pages.buenos_aires} className="cms-markdown mt-6" />
          </div>

          <div className="section relative">
            <div className="border-top border-bottom">
              <RichText content={data.pages.what_to_expect} className="cms-markdown mt-6" />

              <div className={css['topics-header']}>
                <div>
                  <p className="text-xl uppercase text-red-400 font-secondary mt-6">
                    {(globalThis as any).translations.devconnect_themes}
                  </p>
                </div>

                <div className={`${css['topics']} my-8 mt-4 font-secondary`} id="topics-container">
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
            </div>
          </div>

          <Scene growVertically growNaturally className={`${css['scene-faq']}`}>
            <div className="section">
              <div className="border-bottom pb-4 pt-4">
                <h1 className="section-header text-teal-400">Blog Posts</h1>

                <BlogReel blogs={props.blogs} />
              </div>
            </div>
          </Scene>

          <div className="section">
            <RichText content={data.pages.catch_the_vibe} className="cms-markdown mt-6 mb-8 " />
          </div>

          <Scene growVertically growNaturally className={`${css['scene-about-content']} pb-6`}>
            <InfiniteScroller nDuplications={2} speed="180s" marqueeClassName="h-[400px]">
              {[Cowork1, Cowork2, Cowork3, Cowork4, Cowork5, Cowork6, Cowork7, Cowork8].map((src, i) => {
                return (
                  <Image
                    src={src}
                    key={i}
                    alt="Recorded Session Cover Image"
                    className="shrink-0 !h-full !w-auto object-contain mr-4"
                  />
                )
              })}
            </InfiniteScroller>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-about-content']}`}>
            <div className="section">
              <div className="border-bottom mb-6 pb-6">
                <Link
                  href="https://drive.google.com/drive/folders/1DlzDuVajwDmPOtE1uqns4Na9fjn6wQvy"
                  indicateExternal
                  className="text-teal-400"
                >
                  <Button fat size="lg" fill color="teal-1">
                    {(globalThis as any).translations.view_gallery}
                  </Button>
                </Link>
              </div>
            </div>
          </Scene>

          <Scene growNaturally growVertically className={`${css['scene-content']} !overflow-visible`}>
            <div className="section mb-3  ">
              <div className="flex">
                <div className="relative">
                  <RichText content={data.pages.watch_the_presentations} className="cms-markdown mt-0" />
                </div>
              </div>
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-about-content']} `}>
            <div className="section !overflow-visible">
              <SwipeToScroll>
                <div className="flex flex-nowrap">
                  {[
                    { cover: Cover1, url: 'https://app.streameth.org/devconnect/light_client_summit/archive' },
                    { cover: Cover4, url: 'https://www.youtube.com/@PROGCRYPTO/videos' },
                    {
                      cover: Cover3,
                      url: 'https://app.streameth.org/devconnect/conflux__web3_ux_unconference/archive',
                    },
                    { cover: Cover2, url: 'https://app.streameth.org/devconnect/wallet_unconference/archive' },
                    { cover: Cover5, url: 'https://app.streameth.org/devconnect/solidity_summit/archive' },
                    { cover: Cover6, url: 'https://app.streameth.org/devconnect/autonomous_worlds_assembly' },
                    { cover: Cover7, url: 'https://app.streameth.org/devconnect/ethconomics/archive' },
                    { cover: Cover8, url: 'https://app.streameth.org/devconnect/evm_summit/archive' },
                    { cover: Cover9, url: 'https://app.streameth.org/devconnect/ethgunu/archive' },
                    { cover: Cover10, url: 'https://app.streameth.org/devconnect/staking_gathering_2023' },
                    { cover: Cover11, url: 'https://app.streameth.org/secureum/secureum_trustx/archive' },
                    { cover: Cover12, url: 'https://app.streameth.org/devconnect/epf_day/archive' },
                  ].map((entry, i) => {
                    return (
                      <div
                        key={i}
                        className="min-w-[370px] relative mr-4 mt-1 border-transparent rounded-lg overflow-hidden group hover:border-teal-400/50 border-2 border-solid transition-all duration-300"
                      >
                        <Link key={i} href={entry.url} className="">
                          <Image
                            src={entry.cover}
                            alt="Recorded Session Cover Image"
                            className="group-hover:scale-[101%] transition-all duration-500 w-full h-full"
                          />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </SwipeToScroll>
              <p className="text-slate-300 text-xs font-bold mt-2">{(globalThis as any).translations.drag_for_more}</p>
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-faq']} section`}>
            <div className="mt-0 pt-4 border-top mt-4">
              <h1 className="section-header text-teal-400">
                {(globalThis as any).translations.frequently_asked_questions}
              </h1>

              <div className={`${css['accordion']} tab-content`} id="faq">
                <FAQComponent questions={data.pages.faq} />
              </div>
            </div>
          </Scene>
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
    revalidate: 1 * 60 * 30, // 30 minutes, in seconds
  }
}

export default withTranslations(Home)
