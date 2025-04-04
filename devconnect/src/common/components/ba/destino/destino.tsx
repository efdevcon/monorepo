import React, { useState, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const ScrollContainer = () => {
  const [scrollPercentage, setScrollPercentage] = useState(0)
  const containerRef = useRef(null)

  useGSAP(() => {
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => {
        setScrollPercentage(Math.round(self.progress * 100))
      },
      scrub: true,
    })
  }, [])

  return (
    <div ref={containerRef} className="text-black flex items-center justify-center h-[3000px] bg-yellow-200">
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div>Scroll Progress: {scrollPercentage}%</div>
      </div>
    </div>
  )
}

const Destino = () => {
  return (
    <div className="text-black flex flex-col items-center justify-center">
      Hello at top
      <ScrollContainer />
    </div>
  )
}

export default Destino
