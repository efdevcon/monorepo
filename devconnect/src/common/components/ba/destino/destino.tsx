import React, { useState, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
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

gsap.registerPlugin(useGSAP, ScrollTrigger)

const ScrollContainer = ({ children }: { children: React.ReactNode }) => {
  const [scrollPercentage, setScrollPercentage] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: scrollContainerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: self => {
          setScrollPercentage(Math.round(self.progress * 100))
        },
        scrub: true,
      })
    },
    { scope: scrollContainerRef }
  )

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child) && typeof child.type !== 'string') {
      if (child.type === GuanacoController) {
        return React.cloneElement(child, {
          scrollContainerRef: scrollContainerRef,
        } as React.Attributes)
      }
    }
    return child
  })

  return (
    <div ref={scrollContainerRef} className={cn('flex flex-col justify-center w-full relative', styles.tiled)}>
      <div className="fixed z-10 top-2 left-2 transform -translate-y-1/2">
        <div>Scroll Progress: {scrollPercentage}%</div>
      </div>
      {childrenWithProps}
    </div>
  )
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

const GuanacoController = ({ scrollContainerRef }: { scrollContainerRef: React.RefObject<HTMLDivElement> | null }) => {
  const [guanacoReachedEnd, setGuanacoReachedEnd] = useState(false)
  const guanacoRef = useRef<HTMLImageElement>(null)
  const guanacoWidth = 103
  const guanacoHeight = 152

  // Add a ref to track whether we've reached the end position
  const reachedEndRef = useRef<{ [key: string]: boolean }>({})

  useGSAP(() => {
    if (!scrollContainerRef?.current || !guanacoRef.current) {
      return
    }
    const container = scrollContainerRef.current
    const guanaco = guanacoRef.current

    // Hide guanaco initially
    gsap.set(guanaco, { opacity: 0 })

    // Reset reached state
    reachedEndRef.current = {}

    const contentSections = [
      document.getElementById('second-section-content'),
      document.getElementById('third-section-content'),
      document.getElementById('fourth-section-content'),
    ].filter(Boolean) as HTMLElement[]

    const sections = [
      document.getElementById('second-section'),
      document.getElementById('third-section'),
      document.getElementById('fourth-section'),
    ].filter(Boolean) as HTMLElement[]

    if (sections.length === 0) {
      console.error('No sections found')
      return
    }

    // Create a trigger for each section with proper staggering
    const timelines = sections.map((section, index) => {
      const sectionId = `section-${index}`

      // Initialize the reached state for this section
      reachedEndRef.current[sectionId] = false

      // Determine if this section starts from left or right
      // First section (index 0) starts from right, then alternate
      const startsFromRight = index % 2 === 0

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 35%',
          end:
            index < sections.length - 1
              ? () => {
                  const nextSection = sections[index + 1]
                  return `+=${nextSection.offsetTop - section.offsetTop}`
                }
              : 'bottom center',
          scrub: true, // Increased for smoother animation
          // markers: true,
          id: sectionId,
          onEnter: () => {
            // Make guanaco visible with a fade in
            gsap.to(guanaco, {
              opacity: 1,
              duration: 0.3,
              ease: 'power1.inOut',
            })

            // Reset reached state when entering section
            reachedEndRef.current[sectionId] = false
          },
          onLeave: () => {
            if (index === sections.length - 1) {
              gsap.to(guanaco, {
                opacity: 0,
                duration: 0.3,
                ease: 'power1.inOut',
              })
            }
          },
          onEnterBack: () => {
            gsap.to(guanaco, {
              opacity: 1,
              duration: 0.3,
              ease: 'power1.inOut',
            })

            // Reset reached state when re-entering section from below
            reachedEndRef.current[sectionId] = true
          },
          onLeaveBack: () => {
            if (index === 0) {
              gsap.to(guanaco, {
                opacity: 0,
                duration: 0.3,
                ease: 'power1.inOut',
              })
            }
          },
          onUpdate: self => {
            // Adjust progress to complete twice as fast with easing
            // Map 0-0.5 progress to 0-1 for animation, then keep at 1 for progress > 0.5
            let rawProgress = self.progress * 2
            if (rawProgress > 1) rawProgress = 1

            // Apply easing for smoother motion (ease-in-out)
            const adjustedProgress = gsap.parseEase('power2.inOut')(rawProgress)

            // Calculate section-relative positions on each update
            const sectionRect = section.getBoundingClientRect()
            const sectionContentRect = contentSections[index]?.getBoundingClientRect()

            // Top corner of the section in viewport (left or right depending on section)
            const sectionTopViewport = sectionRect.top
            const sectionContentBottomViewport = sectionContentRect.bottom

            // Calculate start position based on whether we start from right or left
            let startX, startY

            if (startsFromRight) {
              // Start from right side
              startX = sectionRect.right - guanacoWidth - 20 // 20px padding from right edge
              // startY = sectionTopViewport + 20
              startY = sectionContentBottomViewport - guanacoHeight + 20
            } else {
              // Start from left side
              startX = sectionRect.left + 20 // 20px padding from left edge
              // startY = sectionTopViewport + 20
              startY = sectionContentBottomViewport - guanacoHeight + 20
            }

            // End position is always bottom center
            const endX = sectionRect.left + sectionRect.width / 2 - guanacoWidth / 2
            const endY = sectionTopViewport + sectionRect.height - guanacoHeight - 10

            // Smoothed interpolation between start and end positions
            const currentX = startX + (endX - startX) * adjustedProgress
            const currentY = startY + (endY - startY) * adjustedProgress

            // Update guanaco position with smooth transition

            gsap.to(guanaco, {
              x: currentX,
              y: currentY,
              duration: 0.5, // Adjust this value to control movement speed
              ease: 'power2.out', // Makes the movement more natural
            })

            // Check if guanaco reached end position (adjustedProgress === 1)
            if (rawProgress >= 0.98 && !reachedEndRef.current[sectionId]) {
              reachedEndRef.current[sectionId] = true

              // Log when guanaco reaches end position
              console.log(`Guanaco reached end position in ${sectionId}`, {
                section: section,
                sectionIndex: index,
                position: { x: currentX, y: currentY },
              })

              // You can add custom handler calls here later
              // onGuanacoReachedEnd(sectionId, index);
              setGuanacoReachedEnd(true)
            }

            // Check if guanaco left end position (when scrolling back up)
            if (rawProgress < 0.98 && reachedEndRef.current[sectionId]) {
              reachedEndRef.current[sectionId] = false

              // Log when guanaco leaves end position (going back to start)
              console.log(`Guanaco left end position in ${sectionId}`, {
                section: section,
                sectionIndex: index,
                startedFromRight: startsFromRight,
              })

              // You can add custom handler calls here later
              // onGuanacoLeftEnd(sectionId, index);
              setGuanacoReachedEnd(false)
            }
          },
        },
      })

      return tl
    })

    return () => {
      // Clean up
      timelines.forEach(tl => {
        if (tl.scrollTrigger) tl.scrollTrigger.kill()
      })
    }
  }, [scrollContainerRef, guanacoRef])

  return (
    <div
      ref={guanacoRef}
      className="fixed z-[11]"
      style={{
        willChange: 'transform',
        position: 'fixed',
        top: '-16px',
        left: 0,
      }}
    >
      <Popover open={guanacoReachedEnd}>
        <PopoverTrigger className="outline-none">
          <Image src={Guanaco} alt="Guanaco" className="object-contain w-[103px] h-[152px] outline-none" />
        </PopoverTrigger>
        <PopoverContent align="center" side="top" sideOffset={16}>
          <h3 className="font-bold mb-2">Guanaco found something!</h3>
          <p>Look at what our friend discovered at this location.</p>
        </PopoverContent>
      </Popover>
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
        <GuanacoController scrollContainerRef={null} />
        <SecondSection />
        <ThirdSection />
        <FourthSection />
      </ScrollContainer>

      <div className="flex flex-col items-center justify-center gap-16 my-16 overflow-hidden">
        <HowToApply />
        {/* <EventsList /> */}
      </div>
    </div>
  )
}

export default Destino
