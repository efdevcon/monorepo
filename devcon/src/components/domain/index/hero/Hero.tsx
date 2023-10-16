import React from 'react'
import css from './hero.module.scss'
import Rays from './images/Rays'
import { useTranslations } from 'next-intl'
import { CallToAction } from './call-to-action'
import BackgroundBogota from './images/bogota-background.png'
import BackgroundPassport from './images/passport-background.png'
import BackgroundLive from './images/live-background.png'
import BackgroundDevconWeek from './images/devcon-week-background.png'
import { Button } from 'components/common/button'
import { Link } from 'components/common/link'
import TitleBogota from './images/bogota-title.svg'
import TitleDevcon from './images/devcon-title.svg'
import LogoBogota from 'assets/images/pages/bogota.svg'
import LogoVideo from 'assets/images/pages/archive-1.svg'
import LogoGetInvolved from 'assets/images/pages/get-involved.svg'
import LogoPassport from 'assets/images/pages/devcon-passport.svg'
// import DevconStats from 'assets/images/hero/devcon-stats.png'
import Image from 'next/image'
import { Router, useRouter } from 'next/router'
import getNewsItems from 'services/news'
import StatsAnimation from './stats-anim'
// import Background2024 from 'assets/images/hero-bg-2024.png';
import Devcon7Logo from 'assets/images/devcon-7.svg'
import SEA from 'assets/images/sea-2024.png'
import SEAPattern from 'assets/images/sea-pattern-2024.png'
import { Tags } from 'components/common/tags'

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
    {
      id: 'update-2024',
      background: BackgroundPassport,
      titlePrefix: TitleDevcon,
      title: '2024 Update',
      logo: LogoPassport,
      imageAlt: 'Devcon logo',
      button: {
        text: 'Learn More',
        url: '#update-2024', // https://archive.devcon.org',
      },
    },
    {
      id: 'recap',
      background: BackgroundPassport,
      titlePrefix: TitleDevcon,
      title: intl('hero_recap_title'),
      logo: LogoPassport,
      imageAlt: 'LogoBogota',
      button: {
        text: intl('hero_recap_relive'),
        url: '#recap', // https://archive.devcon.org',
      },
    },
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

export const Hero = () => {
  const router = useRouter()
  const intl = useTranslations()
  const draggableLinkAttributes = useDraggableLink()
  const heroEl = React.useRef(null)
  const pages = usePages()
  const [currentPage, setCurrentPage] = React.useState(0)
  const [focusNextPage, setFocusNextPage] = React.useState(false)
  const page = pages[currentPage]

  const rotateNextPage = () => {
    setCurrentPage(currentPage === pages.length - 1 ? 0 : currentPage + 1)
    setFocusNextPage(true)
  }

  React.useEffect(() => {
    if (focusNextPage) {
      const el = document.getElementById(page.id)

      // Only scroll into view if not scrolled vertically, because otherwise we scroll the user back up to the top :D
      if (window.scrollY === 0 && el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }

      setFocusNextPage(false)
    }
  }, [page, focusNextPage])

  return (
    <>
      <div ref={heroEl} data-jest="hero" className={`${css['hero']} ${css[page.id]}`}>
        {page.id === 'recap' ? (
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
        )}

        <div className={css['page-background']}>
          {/* <Image
            className={css['active']}
            src={pages[0].background}
            ""
            priority
            alt="Devcon stats"
          /> */}
          {/* <Image
            className={page.id === 'passport' ? css['active'] : ''}
            src={pages[0].background}
            ""
            priority
            alt={pages[0].backgroundAlt}
          />
          <Image
            className={page.id === 'bogota' ? css['active'] : ''}
            src={pages[1].background}
            ""
            priority
            alt={pages[1].backgroundAlt}
          />
          <Image
            className={page.id === 'devcon-week' ? css['active'] : ''}
            src={pages[2].background}
            ""
            priority
            alt={pages[2].backgroundAlt}
          />
          <Image
            className={page.id === 'livestream' ? css['active'] : ''}
            src={pages[3].background}
            ""
            priority
            alt={pages[3].backgroundAlt}
          /> */}
        </div>

        <div className={css['left-rotated']}>
          <p className={'text-uppercase'}>{intl('global_subtitle')}</p>
        </div>
        <div className={css['right-rotated']}>
          <p className={'text-uppercase'}>Road TO SOUTH EAST ASIA 2024</p>
        </div>

        <div className={`${css['page-container']} section`}>
          <div className={css['page']}>
            {/* <div
              className={css['date']}
              // onClick={() => {
              //   setCurrentPage(currentPage === pages.length - 1 ? 0 : currentPage + 1)
              // }}
            >
              <p>Oct 2022</p>
              <p>11 → 14</p>
            </div> */}

            <div className={css['content']}>
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
          </div>
        </div>

        {page.id === 'recap' && <StatsAnimation />}

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
      <div className="section" style={{ position: 'relative' }}>
        {/* <div className={`expand ${css['gradient']}`}></div> */}
        {/* <div className={`border-bottom clear-bottom ${css['mobile']}`}>
          <CallToAction mobile />
        </div> */}
      </div>
    </>
  )
}
