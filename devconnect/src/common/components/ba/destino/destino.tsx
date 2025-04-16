import React, { useState, useRef } from 'react'
import gsap from 'gsap'
// import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Image from 'next/image'
import DestinoHero from './images/destino-hero.png'
import { FirstSection, SecondSection, ThirdSection, FourthSection, HowToApply, EventsList } from './sections'
import styles from './destino.module.scss'
import cn from 'classnames'
import Guanaco from './images/guanaco.png'
import DestinoLogo from './images/destino-logo.png'
import { Popover, PopoverContent, PopoverTrigger } from 'lib/components/ui/popover'

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

const Hero = () => {
  return (
    <div className="h-screen w-screen relative z-[11]">
      <Image src={DestinoHero} alt="Destino Hero" className="w-full h-full object-cover" />
      <Image
        src={DestinoLogo}
        alt="Destino Logo"
        className="object-cover w-[450px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  )
}

const Destino = () => {
  return (
    <div
      className={cn(
        'text-white',
        styles['bg-gradient'],
        'flex flex-col items-center justify-center no-scrollbar w-screen'
      )}
    >
      <Hero />
      <FirstSection />
      <ScrollContainer>
        <SecondSection />
        <ThirdSection />
        <FourthSection />
      </ScrollContainer>

      <div className="flex flex-col items-center justify-center gap-16 my-16 overflow-hidden">
        <HowToApply />
      </div>
    </div>
  )
}

export default Destino
