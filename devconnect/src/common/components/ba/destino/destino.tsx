import React, { useState, useRef } from 'react'
import gsap from 'gsap'
// import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Image from 'next/image'
import DestinoHero from './images/hero-bg.png'
import { FirstSection, SecondSection, ThirdSection, FourthSection, HowToApply, EventsList } from './sections'
import styles from './destino.module.scss'
import cn from 'classnames'
import Guanaco from './images/guanaco.png'
import DestinoLogo from './images/destino-logo.png'
import { Popover, PopoverContent, PopoverTrigger } from 'lib/components/ui/popover'
import css from 'styled-jsx/css'

// https://docs.google.com/document/d/1v5vm0fDMS_5L2uDvuwjkahOcoy8-khFKTi3rGOsfQEw/edit?pli=1&tab=t.0#heading=h.3h638filjl7g

// gsap.registerPlugin(useGSAP, ScrollTrigger)

const ScrollContainer = ({ children }: { children: React.ReactNode }) => {
  // const [scrollPercentage, setScrollPercentage] = useState(0)
  // const scrollContainerRef = useRef<HTMLDivElement>(null)

  // useGSAP(
  //   () => {
  //     ScrollTrigger.create({
  //       trigger: scrollContainerRef.current,
  //       start: 'top top',
  //       end: 'bottom bottom',
  //       onUpdate: self => {
  //         setScrollPercentage(Math.round(self.progress * 100))
  //       },
  //       scrub: true,
  //     })
  //   },
  //   { scope: scrollContainerRef }
  // )

  return <div className={cn('flex flex-col justify-center w-full relative')}>{children}</div>
}

const Hero = ({ content }: { content: any }) => {
  return (
    <div className="h-screen w-screen relative flex flex-col justify-end z-[11]">
      <div className="relative top-0 left-0 w-full h-full">
        <Image src={DestinoHero} alt="Destino Hero" className="w-full h-full absolute object-cover object-position" />
        <Image
          src={DestinoLogo}
          alt="Destino Logo"
          className="object-cover w-[325px] max-w-[70%] absolute top-[42%] lg:top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        />
        <div className="absolute bottom-2 right-0 left-0 justify-center items-center flex gap-2 text-black  pointer-events-none ">
          <div className="flex items-center text-sm gap-1.5">
            <p className="text-sm font-semibold opacity-100 text-white [text-shadow:0_0_1px_#000,0_0_2px_#000] ">
              {(globalThis as any).translations.scroll_for_more}
            </p>
            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 16 16" width="14" height="14">
              <g className="nc-icon-wrapper" fill="#ffffff">
                <g className={`${styles['nc-loop-mouse-16-icon-f']} opacity-100`}>
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
      <FirstSection content={content} />
    </div>
  )
}

const Destino = ({ content, events }: { content: any; events: any }) => {
  return (
    <div
      className={cn(
        'text-white',
        styles['bg-gradient'],
        'flex flex-col items-center justify-center no-scrollbar w-screen overflow-x-hidden'
      )}
    >
      <Hero content={content} />

      <div className={cn('flex flex-col justify-center w-full relative overflow-hidden pb-24')}>
        <SecondSection content={content} />
        <ThirdSection content={content} />
        <FourthSection content={content} />
      </div>

      <div className="flex flex-col items-center justify-center gap-16 mb-24 overflow-hidden">
        <HowToApply content={content} />
        <EventsList content={content} events={events} />
      </div>
    </div>
  )
}

export default Destino
