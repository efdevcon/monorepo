import React from 'react'
import css from './hero.module.scss'
import Logo from 'assets/images/hero/hero-logo-mobile.svg'
import Rays from './images/Rays'
import { useTranslations } from 'next-intl'
import { CallToAction } from './call-to-action'
import AddToCalendar from '../add-to-calendar'
import PolygonAnim from 'components/domain/index/hero/polygon-anim'
import Mountains from 'assets/images/mtn-all-layers.svg'

const useParallax = (elementRef: any) => {
  const [parallaxMultiplier, setParallaxMultiplier] = React.useState(0)

  React.useEffect(() => {
    const element = elementRef.current

    if (!element) return

    let options = {
      threshold: new Array(101).fill(0).map((v, i) => i * 0.01),
    }

    const callback = (entries: any) => {
      const { intersectionRatio } = entries[0]

      setParallaxMultiplier(1 - intersectionRatio)
    }

    const observer = new IntersectionObserver(callback, options)

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef])

  return parallaxMultiplier
}

const parallax = (parallaxMultiplier: any, initial = -15, range = 15) => {
  const translateY = initial - parallaxMultiplier * range

  return {
    transform: `translateY(${translateY}%)`,
  }
}

export const Hero = () => {
  const intl = useTranslations()
  const heroEl = React.useRef(null)
  const parallaxMultiplier = useParallax(heroEl)
  const isScrolled = parallaxMultiplier > 0.15

  return (
    <>
      <div ref={heroEl} data-jest="hero" className={`${css['hero']}`}>
        <div className={css['rays-container']}>
          <Rays className={css['rays']} />
        </div>

        <PolygonAnim />

        <div className={css['parallax-container']}>
          <div className={css['mountain-container']}>
            <Mountains />
          </div>
        </div>

        <div className={css['parallax-container-2']}>
          <div className={css['clouds']} style={parallax(parallaxMultiplier, 2, 2) as any}></div>
        </div>

        <div className={css['left-rotated']}>
          <p className={'text-uppercase'}>{intl('global_subtitle')}</p>
        </div>
        <div className={css['right-rotated']}>
          <p className={'text-uppercase'}>{intl('journey')}</p>
        </div>

        <div className={css['logo-container']}>
          <Logo alt={intl('global_title')} className={css['logo']} />
          <div className={css['add-to-cal']}>
            <div>
              <AddToCalendar />
            </div>
          </div>
        </div>

        <div className={`${isScrolled ? css['hide'] : ''} ${css['scroll-for-more']}`}>
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
      <div className="section" style={{ position: 'relative' }}>
        <div className={`expand ${css['gradient']}`}></div>
        <div className={`border-bottom clear-bottom`}>
          <CallToAction mobile />
        </div>
      </div>
    </>
  )
}
