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
// import BAText from 'assets/images/ba/ba-text.png'
import Argentina from 'assets/images/ba/argentina.png'
import Modal from 'common/components/modal'
import { CodeOfConduct } from 'common/components/code-of-conduct/CodeOfConduct'
import FAQComponent from 'common/components/faq/faq'
import HeroImage from 'assets/images/ba/hero.jpg'
import Observer from 'common/components/observer'
import ErrorBoundary from 'common/components/error-boundary/ErrorBoundary'
import FooterBackground from 'assets/images/footer-background-triangles.png'
import Parser from 'rss-parser'
import slugify from 'slugify'
import { BlogPost } from 'types/BlogPost'
import CityScape from 'assets/images/ba/cityscape.png'
import { BlogReel } from 'common/components/blog-posts/BlogPosts'
import { HorizontalScroller } from 'lib/components/horizontal-scroller'
import PastEventCard from 'lib/components/cards/past-event'
import moment from 'moment'
import { leftPadNumber } from 'lib/utils'
import istanbulScheduleBackground from 'assets/images/turkeycube.png'
import amsterdamScheduleBackground from 'assets/images/amsterdam-sched.png'
import { client } from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import RichText from 'lib/components/tina-cms/RichText'
import { useScroll } from 'framer-motion'
import TwitterIcon from 'assets/icons/twitter.svg'
import TelegramIcon from 'assets/icons/telegram.svg'
import FarcasterIcon from 'assets/icons/farcaster.svg'
import MailIcon from 'assets/icons/mail.svg'
import DevconnectCubeLogo from 'assets/images/ba/cube-logo.png'
import { Button } from 'lib/components/button'
import cn from 'classnames'
import ScrollingText from 'lib/components/infinite-scroll/scrolling-text'

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
      <header
        className={`${css['header']} py-4 fixed top-0 left-0 right-0 w-full z-[100] pointer-events-none`}
        style={{ '--display-gradient': hasScrolled ? '0%' : '100%' } as any}
      >
        <div className="section">
          <div className="flex w-full justify-between items-center">
            <Link
              href="/"
              className={cn(
                css['logo'],
                'transition-all ease duration-500 pointer-events-auto',
                hasScrolled && !menuOpen && 'opacity-0 pointer-events-none'
              )}
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
        <main id="main" className={cn(css.main, 'text-black overflow-hidden')}>
          <div className={cn('h-screen w-screen relative text-black', css.hero)}>
            <Header />

            <div className={cn('absolute section bottom-4 left-0 z-10', css.heroImage)}>
              <div className="flex flex-col gap-8">
                <p className={`text-2xl lg:text-4xl  font-semibold`}>
                  {data.pages.catchphrase}...{' '}
                  <Image
                    src={Argentina}
                    alt="Buenos Aires"
                    className={cn('min-w-[320px] w-[45%] mt-1 lg:mt-2', css.revealFromLeft)}
                  />
                </p>
                <Link
                  href=""
                  className={`flex lg:mb-1 self-start bg-blur-sm shadow-lg text-sm sm:text-lg rounded-full p-3 px-4 sm:p-4 sm:px-6 select-none hover:scale-[1.02] transition-all duration-300 z-10 ${css['video-recap-button']} shadow`}
                >
                  <div className="font-secondary z-10 ">{data.pages.button}</div>
                </Link>
                <Image src={DevconnectCubeLogo} alt="Devconnect Cube Logo" className="w-[60px] lg:w-[80px]" />
              </div>
            </div>

            <Image
              src={HeroImage}
              alt="Hero Image"
              className={cn('fixed top-0 left-0 w-full h-full object-cover', css.heroImage)}
            />

            <div className={cn('absolute section bottom-4 right-0 z-10')}>
              <div className="flex justify-end gap-4">
                <div className="text-white text-xl flex gap-4 items-center backdrop-blur-sm bg-black/20 rounded-lg p-2 px-3 shadow">
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

                  <MailIcon
                    style={{ fill: 'white', display: 'block', cursor: 'pointer' }}
                    className="hover:scale-[1.02] transition-all duration-300"
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  />
                </div>

                <div className="absolute bottom-0 right-0 left-0 hidden md:flex justify-center items-center flex gap-2 text-black  pointer-events-none ">
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

          <div className="section relative bg-white">
            <ScrollingText direction="down" color="teal-2" speed="100s" className="!h-[300px] !z-[1]">
              {/* THEMES&nbsp; */}
            </ScrollingText>
            <div className="flex flex-row gap-4 border-bottom pb-6 flex-wrap lg:flex-nowrap z-[2]">
              <div className="basis-full lg:basis-1/2 shrink-0 text-black" id="about">
                {/* <h1 className="section-header text-teal-400 mt-4">About Devconnect</h1> */}
                <RichText content={data.pages.what_is_devconnect} className="cms-markdown mt-6" />
              </div>
              <div className="basis-full lg:basis-[50%] lg:px-8 lg:pr-6 flex flex-col items-center justify-center lg:pt-3 shrink-0">
                <div className="mb-2 opacity-50 font-secondary bold uppercase pt-6">Catch the Devconnect vibe</div>
                <HorizontalScroller>
                  <div className="flex flex-row items-center justify-center  gap-4 pb-8 pt-0 max-w-full">
                    <PastEventCard
                      text="Devconnect IST 2023"
                      className="w-[205px] lg:w-[300px] !min-h-[auto] !min-w-[auto] select-none"
                      image={istanbulScheduleBackground}
                      imageAlt="Istanbul collage"
                      link="/istanbul"
                    />

                    <PastEventCard
                      text="Devconnect AMS 2022"
                      className="w-[205px] lg:w-[300px] !min-h-[auto] !min-w-[auto] select-none"
                      image={amsterdamScheduleBackground}
                      imageAlt="Amsterdam collage"
                      link="/amsterdam"
                    />
                  </div>
                </HorizontalScroller>
              </div>
            </div>
          </div>

          <div className="section relative pb-6 bg-white">
            <RichText content={data.pages.buenos_aires} className="cms-markdown mt-6" />
          </div>

          <div className="section relative bg-white">
            <div className="border-top border-bottom">
              <div className="absolute left-0 right-0 bottom-0">
                <Image src={CityScape} alt="Buenos Aires inspired Cityscape Background" />
              </div>
              <RichText content={data.pages.what_to_expect} className="cms-markdown mt-6" />

              <div className={cn(css['topics-header'], 'text-center md:text-left')}>
                <div>
                  <p className="text-xl uppercase text-red-400 font-secondary mt-8">
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

          <div className="section relative pb-6 bg-white">
            <RichText content={data.pages.devcon_vs_devconnect} className="cms-markdown mt-6" />
          </div>

          <div className="section relative pb-8 md:pb-12 bg-black/50">
            <div className="pt-6">
              <h1 className="section-header" style={{ color: 'white !important' }}>
                Blog Posts
              </h1>

              <BlogReel blogs={props.blogs} />
            </div>
          </div>

          <div className={`section relative bg-white`}>
            <div className="mt-0 pt-6 border-top pb-6">
              <h1 className="section-header text-teal-400">
                {(globalThis as any).translations.frequently_asked_questions}
              </h1>

              <div className={`${css['accordion']} tab-content`} id="faq">
                <FAQComponent questions={data.pages.faq} />
              </div>
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
    revalidate: 1 * 60 * 30, // 30 minutes, in seconds
  }
}

export default withTranslations(Home)
