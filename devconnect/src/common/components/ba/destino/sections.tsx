import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/button'
import cn from 'classnames'
import styles from './sections.module.scss'
import Tree from './images/tree.png'
import Sign from './images/sign.png'
import Image from 'next/image'
import Path from './images/path.png'
import Tile from './images/tile-right.png'
import TileEnd from './images/tile-end.png'
import Check from './images/check.png'
import Guanaco from './images/guanaco.png'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export const FirstSection = () => {
  return (
    <div
      className={cn('section relative w-full text-white py-8 gap-4 z-[11] shadow-lg', 'w-screen', styles.tiled)}
      id="first-section"
    >
      <div className="flex flex-col justify-center items-center gap-4">
        <div className="flex flex-col items-center justify-center gap-6 w-[600px] max-w-[90%] text-center">
          <div className="font-bold text-4xl">Organize your Destino Devconnect event</div>
          <div className="text-lg">
            <b>Devconnect is coming to Buenos Aires this November</b>, and we're supporting local builders, organizers,
            and communities on the mission to bring Argentina onchain. Between now and November, we're supporting events
            across Argentina and Latam that help onboard people to Ethereum and show how it can be used in Argentina and
            Latam. If you're already doing this work or have an idea and need a little help to make it real, Destino
            Devconnect is for you.
          </div>
          <Button fat fill color="black-1">
            Apply Now
          </Button>
        </div>
      </div>
    </div>
  )
}

interface PlatformProps {
  color?: string
  className?: string
  sectionContentId?: string
  triangleColor?: string
  triangleColorShade?: string
  triangleColorShade2?: string
  reverse?: boolean
  children: React.ReactNode
  sectionId?: string
}

interface PlatformGuanacoProps {
  containerRef: React.RefObject<HTMLDivElement>
  contentRef: React.RefObject<HTMLDivElement>
  reverse?: boolean
  sectionId?: string
}

const PlatformGuanaco = ({ containerRef, contentRef, reverse, sectionId }: PlatformGuanacoProps) => {
  const [guanacoReachedEnd, setGuanacoReachedEnd] = useState(false)
  const guanacoRef = useRef<HTMLImageElement>(null)
  const guanacoWidth = 103
  const guanacoHeight = 152

  useGSAP(() => {
    if (!containerRef?.current || !guanacoRef.current || !contentRef?.current) return

    const container = containerRef.current
    const content = contentRef.current
    const guanaco = guanacoRef.current

    const walkToCenter = () => {
      const containerRect = container.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()
      const triangleHeight = containerRect.width / (69 / 20)

      // Calculate positions
      const startX = reverse ? 0 : containerRect.width - guanacoWidth
      const startY = contentRect.height - guanacoHeight
      const endX = (containerRect.width - guanacoWidth) / 2
      const endY = containerRect.height - guanacoHeight - 20 // Move to the very bottom of the container

      // Kill any existing animations
      gsap.killTweensOf(guanaco)

      // Reset state at the beginning of the animation
      setGuanacoReachedEnd(false)

      // Set initial position
      gsap.set(guanaco, {
        opacity: 0,
        x: startX,
        y: startY,
        scaleX: reverse ? -1 : 1, // Set initial direction
      })

      // Create timeline for walking animation
      const tl = gsap.timeline({
        onComplete: () => setGuanacoReachedEnd(true),
      })

      // Fade in and walk to center
      tl.to(guanaco, {
        opacity: 1,
        duration: 0.3,
      }).to(guanaco, {
        x: endX,
        y: endY,
        duration: 2,
        ease: 'power1.inOut',
        rotation: 0,
        onUpdate: function () {
          // Add slight wobbling/rotation as it walks
          const progress = this.progress()
          const wobble = Math.sin(progress * 12) * 5 // Increased wobble from 3 to 6 degrees
          gsap.set(guanaco, { rotation: wobble })
        },
      })

      return tl
    }

    const walkAway = () => {
      const containerRect = container.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()
      const startX = reverse ? 0 : containerRect.width - guanacoWidth
      const startY = contentRect.height - guanacoHeight

      // Kill any existing animations and reset state
      gsap.killTweensOf(guanaco)
      setGuanacoReachedEnd(false)

      // Create timeline for exit animation
      const tl = gsap.timeline()

      // First turn around (flip the direction)
      tl.to(guanaco, {
        scaleX: reverse ? 1 : -1,
        duration: 0.3,
        ease: 'power1.inOut',
      })

        // Then walk back to start and fade out
        .to(guanaco, {
          x: startX,
          y: startY,
          opacity: 0,
          duration: 1,
          ease: 'power1.inOut',
          rotation: 0,
          onUpdate: function () {
            // Add slight wobbling/rotation as it walks back
            const progress = this.progress()
            const wobble = Math.sin(progress * 12) * 5 // Increased wobble from 3 to 6 degrees
            gsap.set(guanaco, { rotation: wobble })
          },
        })
        // Reset scale for next appearance
        .set(guanaco, {
          scaleX: reverse ? -1 : 1,
          rotation: 0, // Reset rotation when animation completes
        })

      return tl
    }

    ScrollTrigger.create({
      trigger: container,
      start: 'top 45%',
      end: 'bottom 45%',
      onEnter: () => walkToCenter(),
      onLeave: () => walkAway(),
      onEnterBack: () => walkToCenter(),
      onLeaveBack: () => walkAway(),
      markers: true,
      id: `guanaco-animation-${sectionId || ''}-${reverse ? 'reverse' : 'normal'}`,
      // Make sure to kill any existing animation when starting a new one
      onToggle: self => {
        if (!self.isActive) {
          gsap.killTweensOf(guanaco)
          setGuanacoReachedEnd(false)
        }
      },
    })

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill())
      setGuanacoReachedEnd(false)
    }
  }, [containerRef, contentRef, reverse, sectionId])

  // Clean up state when component unmounts
  React.useEffect(() => {
    return () => {
      setGuanacoReachedEnd(false)
    }
  }, [])

  return (
    <div
      ref={guanacoRef}
      className="absolute z-[20]"
      style={{
        opacity: 0,
        willChange: 'transform',
        top: 0,
        left: 0,
      }}
    >
      {/* <div
        className={cn('absolute top-0 translate-y-[calc(100%+10px)]', guanacoReachedEnd ? 'opacity-100' : 'opacity-0')}
      >
        <h3 className="font-bold mb-2">Guanaco found something!</h3>
        <p>Look at what our friend discovered at this location.</p>
      </div> */}
      {/* <Image src={Guanaco} alt="Guanaco" className={cn('object-contain w-[103px] h-[152px] outline-none')} /> */}
      <Popover
        open={guanacoReachedEnd}
        // onOpenChange={open => {
        //   // Only allow external changes to close the popover, not open it
        //   if (!open) setGuanacoReachedEnd(false)
        // }}
      >
        <PopoverTrigger className="outline-none">
          <Image src={Guanaco} alt="Guanaco" className={cn('object-contain w-[103px] h-[152px] outline-none')} />
        </PopoverTrigger>
        <PopoverContent align="center" side="top" sideOffset={16}>
          <h3 className="font-bold mb-2">Guanaco found something!</h3>
          <p>Look at what our friend discovered at this location.</p>
        </PopoverContent>
      </Popover>
    </div>
  )
}

const Platform = ({
  className,
  sectionContentId,
  reverse,
  triangleColor,
  triangleColorShade,
  triangleColorShade2,
  children,
  sectionId,
}: PlatformProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      {mounted && (
        <PlatformGuanaco containerRef={containerRef} contentRef={contentRef} reverse={reverse} sectionId={sectionId} />
      )}

      <TriangleSection
        className={cn('absolute inset-0 translate-y-[10%]', triangleColorShade, styles['mask-gradient-to-r'])}
      >
        <></>
      </TriangleSection>
      <TriangleSection
        className={cn('absolute inset-0 translate-y-[10%]', triangleColorShade2, styles['mask-gradient-to-l'])}
      >
        <></>
      </TriangleSection>
      <TriangleSection className={cn('relative z-10')}>
        <div className="relative z-10" id={sectionContentId} ref={contentRef}>
          {children}
        </div>
        <Image
          src={Tile}
          alt="Tile"
          className={cn(
            'absolute bottom-0 z-[10] w-[30%] left-1/2 -translate-x-[17.5%]',
            reverse ? 'scale-x-[-1] !translate-x-[17.5%] right-1/2 left-auto' : ''
          )}
        />
        <Image
          src={TileEnd}
          alt="Tile"
          className={cn(
            'absolute bottom-0 z-[10] w-[30%] translate-y-[-82.5%] left-1/2 -translate-x-[-65%]',
            reverse ? 'scale-x-[-1] !translate-x-[-65%] right-1/2 left-auto' : ''
          )}
        />
        <Image src={Sign} alt="Sign" className="absolute z-[12] top-0 right-0 translate-x-[-200%] translate-y-[45%]" />
      </TriangleSection>
      <TriangleSection className={cn('absolute bottom-0 left-0 right-0 h-[3000px] z-[9]', triangleColor, styles.grass)}>
        <></>
      </TriangleSection>
    </div>
  )
}

export const SecondSection = () => {
  const sectionColor = 'bg-[#829b15]'
  const shade = 'bg-[#B2CD3E]'
  const shade2 = 'bg-[#629522]'

  return (
    <div className="relative z-10" id="second-section">
      <Platform
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="second-section-content"
        sectionId="second-section"
      >
        <div
          className={cn(
            'flex flex-col gap-4 justify-center items-center text-center w-full pt-8 lg:translate-y-[50%] lg:h-[200px]'
          )}
        >
          <div className="text-white text-4xl font-bold shrink-0">What is Destino Devconnect?</div>
          <div className="flex flex-col gap-4 w-[500px] max-w-[90%] relative text-lg shrink-0">
            <Image src={Tree} alt="Tree" className="absolute top-0 left-0 translate-x-[-170%] translate-y-[-30%]" />
            <Image src={Tree} alt="Tree" className="absolute top-0 left-0 translate-x-[-270%] translate-y-[-15%]" />
            <Image src={Tree} alt="Tree" className="absolute top-0 left-0 translate-x-[-200%] translate-y-[40%]" />
            {/* <Image src={Sign} alt="Sign" className="absolute bottom-0 right-0 translate-x-[150%] translate-y-[50%]" /> */}
            Destino Devconnect is a local grant round leading up to Devconnect ARG. It's both...
            <div className="flex flex-col gap-4 text-base">
              <div className="flex flex-col items-center gap-1">
                <div className="text-yellow-500 text-2xl font-bold">A grant</div>
                <div>we're offering up to $1,000 in support per event</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-yellow-500 text-2xl font-bold">A shared banner</div>
                <div>
                  connecting local efforts across the region that share one mission: to accelerate Ethereum adoption in
                  Argentina and beyond
                </div>
              </div>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const ThirdSection = () => {
  const sectionColor = 'bg-[#b81175]'
  const shade = 'bg-[#E897C5]'
  const shade2 = 'bg-[#BA4588]'

  return (
    <div className="relative z-[9]" id="third-section">
      <Platform
        reverse
        className=""
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="third-section-content"
        sectionId="third-section"
      >
        <div className={cn('flex flex-col gap-4 justify-center items-center text-center')}>
          <div className="flex flex-col items-center gap-4 w-[700px] max-w-[90%] lg:translate-y-[50%] pt-8 lg:h-[200px]">
            <div className="text-white text-4xl font-bold shrink-0">Who it's for</div>
            <div className="flex flex-col justify-center items-center gap-8 text-lg shrink-0">
              <div className="shrink-0 text-yellow-500 text-2xl">You're eligible if you...</div>
              <div className="grid grid-cols-4 gap-4 shrink-0 text-base">
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>Are based in Argentina or Latam</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>Have a track record of community-building or event organizing</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>Are already hosting meetups, workshops, or events, or want to start</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>
                    Share the mission of bringing Argentina onchain{' '}
                    {/* through education, onboarding, app demos, or new
                    collaborations */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const FourthSection = () => {
  const sectionColor = 'bg-[#A2D0FA]'
  const shade = 'bg-[#80B6E8]'
  const shade2 = 'bg-[#498FCE]'

  return (
    <div className="relative z-[8]" id="fourth-section">
      <Platform
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="fourth-section-content"
        sectionId="fourth-section"
      >
        <div className={cn('flex flex-col gap-4 justify-center items-center text-center')}>
          <div className="flex flex-col items-center gap-4 w-[500px] max-w-[90%] lg:translate-y-[50%] lg:h-[200px] pt-8">
            <div className="text-white text-4xl font-bold">What you get</div>
            <div className="flex flex-col justify-center items-center gap-4 text-lg">
              <div className="flex flex-col gap-2">
                <div>Up to $1,000 in funding</div>
                <div>Help with speakers and sponsors if you need it</div>
                <div>A spot on the Destino Devconnect calendar</div>
                <div>Visibility across Devconnect's official comms</div>
              </div>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const HowToApply = () => {
  return (
    <div className="section my-16 mt-24">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center justify-center gap-4 w-[800px] max-w-[90%]">
          <div className="text-white text-4xl font-bold">How to apply</div>
          <div className="flex gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="text-yellow-500 text-3xl font-bold">1</div>
              <div>Head to the Ecosystem Support Program and fill out the form (takes ~X mins)</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-yellow-500 text-3xl font-bold">2</div>
              <div>If it's a good fit, we'll invite you for a 30-min call</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-yellow-500 text-3xl font-bold">3</div>
              <div>Get support — host your event — help shape the Ethereum momentum in Argentina</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TriangleSectionProps {
  children: React.ReactNode
  aspectRatio?: number
  className?: string
}

const TriangleSection = ({ children, aspectRatio = 69 / 20, className }: TriangleSectionProps) => {
  const [triangleHeight, setTriangleHeight] = React.useState(100)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const updateTriangleHeight = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        // Calculate triangle height based on width and desired aspect ratio
        const height = width / aspectRatio
        setTriangleHeight(height)
      }
    }

    // Initial calculation
    updateTriangleHeight()

    // Update on resize
    window.addEventListener('resize', updateTriangleHeight)
    return () => window.removeEventListener('resize', updateTriangleHeight)
  }, [aspectRatio])

  const clipPath = `polygon(
    0 0, 
    100% 0, 
    100% calc(100% - ${triangleHeight}px), 
    50% 100%, 
    0 calc(100% - ${triangleHeight}px)
  )`

  return (
    <div
      ref={containerRef}
      style={{
        clipPath: clipPath,
        WebkitClipPath: clipPath,
        paddingBottom: `${triangleHeight}px`,
      }}
      className={className}
    >
      {children}
    </div>
  )
}

export const EventsList = () => {
  return (
    <div className="section">
      <div className="flex flex-col items-center justify-center gap-4 ">
        <div className="flex flex-col items-center justify-center gap-4 w-[500px] max-w-[90%]">
          <div className="text-white text-4xl font-bold">Events</div>

          <EventsTable />
        </div>
      </div>
    </div>
  )
}

const events = [
  {
    date: '06-06',
    name: 'ETH somewhere',
    location: 'Somewhere',
    type: 'Meetup',
    team: 'ETH from somewhere',
    link: 'x.com/ethsomewhere',
  },
]

const EventsTable = () => {
  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-3xl font-bold text-center mb-4">Satellite Events</h2>
      <p className="text-center mb-6">
        The Ethereum community is organizing Devconnect Satellite Events. Join the Devconnect Satellite event near you.
      </p>
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-800">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Type of Event</th>
            <th className="px-4 py-2">Team</th>
            <th className="px-4 py-2">Link</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr key={index} className="bg-gray-700">
              <td className="border px-4 py-2">{event.date}</td>
              <td className="border px-4 py-2">{event.name}</td>
              <td className="border px-4 py-2">{event.location}</td>
              <td className="border px-4 py-2">{event.type}</td>
              <td className="border px-4 py-2">{event.team}</td>
              <td className="border px-4 py-2">
                <a
                  href={`https://${event.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:underline"
                >
                  {event.link}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-center mt-4">
        <button className="bg-yellow-500 text-white px-4 py-2 mx-2 rounded hover:bg-yellow-600">{'<'}</button>
        <button className="bg-yellow-500 text-white px-4 py-2 mx-2 rounded hover:bg-yellow-600">{'>'}</button>
      </div>
    </div>
  )
}

export default EventsTable
