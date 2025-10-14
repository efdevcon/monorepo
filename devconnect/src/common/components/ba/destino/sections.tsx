import React, { useState, useRef, useEffect } from 'react'
import { Button } from 'lib/components/button'
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
import { Popover, PopoverTrigger, PopoverContent, PopoverArrow } from 'lib/components/ui/popover'
import gsap from 'gsap'
import Wallet from './images/wallet.png'
import Suitcase from './images/suitcase.png'
import Speaker from './images/speaker.png'
import Comms from './images/comms.png'
import { useGSAP } from '@gsap/react'
import RockOne from './images/rock.png'
import RockTwo from './images/rock-2.png'
import RockThree from './images/rock-3.png'
import MountainSnow from './images/mountain-snow.png'
import MountainBrown from './images/mountain-brown.png'
import Missing from 'assets/images/404.png'
import RichText from 'lib/components/tina-cms/RichText'
import Link from 'common/components/link/Link'
import dynamic from 'next/dynamic'
import { Separator } from 'lib/components/ui/separator'

const EventsTable = dynamic(() => import('./event-table').then(mod => mod.EventsTable), { ssr: false })

gsap.registerPlugin(useGSAP, ScrollTrigger)

export const FirstSection = ({ content }: { content: any }) => {
  return (
    <div
      className={cn(
        'section relative w-full text-white py-8 lg:py-11 pb-8 gap-4 z-[11] shadow-lg shrink-0',
        'w-screen',
        styles.tiled
      )}
      id="first-section"
    >
      <div className="flex flex-col justify-center items-center gap-4">
        <div className="flex flex-col items-center justify-center gap-2 w-[700px] max-w-[98%] text-center">
          <div className="">
            <RichText content={content.intro.destino_devconnect_intro_title} />
          </div>
          <div className="text-lg">
            <RichText content={content.intro.destino_devconnect_intro} className={styles['cms-styling']} />
          </div>

          <Link href="https://esp.ethereum.foundation/devcon-grants/apply">
            <button
              className={cn(
                'border-solid border-b-[6px] group px-8 py-2 mt-2 border-[#F58A36] text-[#36364C] text-xl font-semibold bg-[#ffa94e] hover:bg-[#f5a236] transition-colors hover:border-opacity-0',
                styles['tiled-button']
              )}
            >
              <div className="group-hover:translate-y-[3px] transition-transform uppercase">
                {(globalThis as any).translations.learn_more || 'Apply Now'}
              </div>
            </button>
          </Link>

          {/* <Button fat fill color="black-1">
            Apply Now
          </Button> */}
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
  isLast?: boolean
  guanacoSpeechString?: string
  grassColor: string
  showSign?: boolean
}

interface PlatformGuanacoProps {
  containerRef: React.RefObject<HTMLDivElement>
  contentRef: React.RefObject<HTMLDivElement>
  reverse?: boolean
  sectionId?: string
  isLast?: boolean
  guanacoSpeechString?: string
}

const PlatformGuanaco = ({
  containerRef,
  contentRef,
  reverse,
  sectionId,
  isLast,
  guanacoSpeechString,
}: PlatformGuanacoProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const guanacoRef = useRef<HTMLImageElement>(null)
  const targetPositionRef = useRef({ x: 0, y: 0 })
  const animationActiveRef = useRef(false)
  const guanacoWidth = 103
  const guanacoHeight = 152

  useGSAP(() => {
    if (!containerRef?.current || !guanacoRef.current || !contentRef?.current) return

    const container = containerRef.current
    const content = contentRef.current
    const guanaco = guanacoRef.current

    const walkToCenter = () => {
      // Don't start a new animation if one is already running
      if (animationActiveRef.current) return

      animationActiveRef.current = true

      const containerRect = container.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()
      const triangleHeight = containerRect.width / (69 / 20)

      // Calculate positions
      const startX = reverse ? 0 : containerRect.width - guanacoWidth
      const startY = contentRect.height - guanacoHeight
      const endX = (containerRect.width - guanacoWidth) / 2
      const endY = containerRect.height - guanacoHeight - 20 // Move to the very bottom of the container

      // Store target position for later comparison
      targetPositionRef.current = { x: endX, y: endY }

      // Kill any existing animations
      gsap.killTweensOf(guanaco)

      // Reset state at the beginning of the animation
      setPopoverOpen(false)

      // Set initial position
      gsap.set(guanaco, {
        opacity: 0,
        x: startX,
        y: startY,
        scaleX: reverse ? -1 : 1, // Set initial direction
      })

      // Create timeline for walking animation
      const tl = gsap.timeline({
        onComplete: () => {
          animationActiveRef.current = false
        },
      })

      // Fade in and walk to center
      tl.to(guanaco, {
        opacity: 1,
        duration: 0.3,
      }).to(guanaco, {
        x: endX,
        y: endY,
        duration: window.innerWidth < 768 ? 1 : 1.8, // Faster animation on mobile
        ease: 'power1.inOut',
        rotation: 0,
        onUpdate: function () {
          // Add slight wobbling/rotation as it walks
          const progress = this.progress()
          const wobble = Math.sin(progress * 12) * 3 // Increased wobble from 3 to 6 degrees
          gsap.set(guanaco, { rotation: wobble })

          // Check if we're almost at the final position
          if (progress > 0.95) {
            const currentX = gsap.getProperty(guanaco, 'x') as number
            const currentY = gsap.getProperty(guanaco, 'y') as number
            const atFinalPosition =
              Math.abs(currentX - targetPositionRef.current.x) < 5 &&
              Math.abs(currentY - targetPositionRef.current.y) < 5

            if (atFinalPosition) {
              setPopoverOpen(true)
            }
          }
        },
        onComplete: () => {
          setPopoverOpen(true)
        },
      })

      return tl
    }

    const walkAway = () => {
      // Don't start a new animation if one is already running
      if (animationActiveRef.current) return

      animationActiveRef.current = true

      // Kill any existing animations and reset state
      gsap.killTweensOf(guanaco)
      setPopoverOpen(false)

      // Create timeline for fade out animation
      const tl = gsap.timeline({
        onComplete: () => {
          animationActiveRef.current = false
        },
      })

      // Simply fade out in place
      tl.to(guanaco, {
        opacity: 0,
        duration: 0.5,
        ease: 'power1.out',
      })
        // Reset for next appearance
        .set(guanaco, {
          scaleX: reverse ? -1 : 1,
          rotation: 0, // Reset rotation
        })

      return tl
    }

    // Create a single ScrollTrigger instance
    const scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: 'top 45%',
      end: isLast ? 'bottom 45%' : 'bottom 45%',
      onEnter: () => walkToCenter(),
      onLeave: () => walkAway(),
      onEnterBack: () => walkToCenter(),
      onLeaveBack: () => walkAway(),
      markers: false,
      id: `guanaco-animation-${sectionId || ''}-${reverse ? 'reverse' : 'normal'}`,
      // Make sure to kill any existing animation when starting a new one
      onToggle: self => {
        if (!self.isActive) {
          gsap.killTweensOf(guanaco)

          setPopoverOpen(false)
          animationActiveRef.current = false
        }
      },
    })

    return () => {
      // Kill all ScrollTrigger instances to clean up
      scrollTrigger.kill()
      setPopoverOpen(false)
      animationActiveRef.current = false
    }
  }, [containerRef, contentRef, reverse, sectionId]) // Removed popoverOpen dependency

  // Clean up state when component unmounts
  React.useEffect(() => {
    return () => {
      setPopoverOpen(false)
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
      <Popover
        open={popoverOpen}
        // onOpenChange={open => {
        //   // Allow user to close the popover, but don't open it through UI interaction
        //   if (!open) setPopoverOpen(false)
        // }}
      >
        <PopoverTrigger className="outline-none">
          <Image src={Guanaco} alt="Guanaco" className={cn('object-contain w-[103px] h-[152px] outline-none')} />
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          avoidCollisions={false}
          sideOffset={2}
          onOpenAutoFocus={(e: any) => e.preventDefault()}
          onCloseAutoFocus={(e: any) => e.preventDefault()}
          className={cn('bg-yellow-500 w-auto h-auto z-[11]', styles['popover-animation'])}
        >
          <h3 className="">{guanacoSpeechString}</h3>
          <PopoverArrow className="fill-yellow-500" width={16} height={8} />
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
  isLast,
  guanacoSpeechString,
  grassColor,
  showSign,
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
        <PlatformGuanaco
          containerRef={containerRef as any}
          contentRef={contentRef as any}
          reverse={reverse}
          sectionId={sectionId}
          isLast={isLast}
          guanacoSpeechString={guanacoSpeechString}
        />
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
            'absolute hidden md:block bottom-0 z-[10] w-[30%] left-1/2 -translate-x-[17.5%]',
            reverse ? 'scale-x-[-1] !translate-x-[17.5%] right-1/2 left-auto' : ''
          )}
        />
        <Image
          src={TileEnd}
          alt="Tile"
          className={cn(
            'absolute hidden md:block  bottom-0 z-[10] w-[30%] translate-y-[-82.5%] left-1/2 -translate-x-[-65%]',
            reverse ? 'scale-x-[-1] !translate-x-[-65%] right-1/2 left-auto' : ''
          )}
        />
        {/* {showSign && (
          <Image
            src={Sign}
            alt="Sign"
            className="absolute z-[12] top-0 right-0 lg:translate-x-[-100%] xl:translate-x-[-140%] 2xl:translate-x-[-160%] w-[120px] translate-y-[70%] hidden xl:block"
          />
        )} */}
      </TriangleSection>
      <TriangleSection
        className={cn('absolute bottom-0 left-0 right-0 h-[3000px] z-[9]', triangleColor, styles[grassColor])}
      >
        <></>
      </TriangleSection>
    </div>
  )
}

export const SecondSection = ({ content }: { content: any }) => {
  const sectionColor = 'bg-[#629522]'
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
        guanacoSpeechString="Are you a Devconnect Fren?"
        grassColor="grass"
        showSign
      >
        <div
          className={cn(
            'flex flex-col gap-0 justify-center items-center text-center w-full pt-16 pb-40 md:pb-8 lg:pt-8 lg:pb-16 xl:pb-8 xl:mb-8 lg:translate-y-[15%] xl:translate-y-[40%]  lg:h-[500px] xl:h-[270px] 12xl:translate-y-[45%] 2xl:h-[230px] 2xl:translate-y-[60%]'
          )}
        >
          <div className="text-white text-3xl font-semibold w-[600px] max-w-[95%] shrink-0 mb-4 ">
            {content.destino_devconnect_about.title}
          </div>
          <div className="flex flex-col gap-4 w-[600px] max-w-[95%] relative text-lg shrink-0">
            <Image
              src={Tree}
              alt="Tree"
              className="absolute top-0 left-0 translate-x-[-120%] translate-y-[-30%] scale-[0.85]"
            />
            <Image
              src={Tree}
              alt="Tree"
              className="absolute top-0 left-0 translate-x-[-220%] translate-y-[-15%] scale-90"
            />
            <Image
              src={RockOne}
              alt="Rock"
              className="absolute top-0 left-0 translate-x-[-130%] translate-y-[150%] w-[150px] auto"
            />
            <Image src={Tree} alt="Tree" className="absolute top-0 right-0 translate-x-[150%] translate-y-[-25%]" />
            <Image
              src={Tree}
              alt="Tree"
              className="absolute top-0 right-0 translate-x-[120%] translate-y-[30%] scale-[0.8]"
            />

            <RichText content={content.destino_devconnect_about.description} />

            <div className="flex flex-col gap-4 text-lg">
              {content.destino_devconnect_about.what_is_it.map((item: any) => {
                return (
                  <div className="flex flex-col items-center gap-1" key={item.title}>
                    <div className="text-yellow-400 text-lg font-semibold">{item.title}</div>
                    <RichText content={item.what_is_it} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const ThirdSection = ({ content }: { content: any }) => {
  const sectionColor = 'bg-[#DD66AA]'
  const shade = 'bg-[#e297c6]'
  const shade2 = 'bg-[#bf4289]'

  return (
    <div className="relative z-[8]" id="third-section">
      <Platform
        reverse
        className=""
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="third-section-content"
        sectionId="third-section"
        guanacoSpeechString="It's literally made for you"
        grassColor="grass-2"
      >
        <div className={cn('flex flex-col gap-4 justify-center items-center text-center')}>
          <div className="flex flex-col items-center gap-4 w-[700px] max-w-[95%] pt-32 pb-32 mb-4 md:pb-24 lg:pt-0 lg:mb-8 xl:mb-16 xl:pt-0 xl:pb-0 lg:translate-y-[30%] xl:translate-y-[40%] 2xl:translate-y-[70%] lg:h-[400px] xl:h-[250px]">
            <Image
              src={RockTwo}
              alt="Rock"
              className="absolute top-0 left-0 translate-x-[-130%] translate-y-[-5%] w-[200px] h-auto"
            />
            <Image
              src={Tree}
              alt="Tree"
              className="absolute top-0 left-0 translate-x-[-100%] translate-y-[0%] scale-[0.85]"
            />

            <Image
              src={MountainBrown}
              alt="Mountain"
              className="absolute top-0 right-0 translate-x-[115%] translate-y-[-25%] w-[260px] h-auto"
            />
            <Image
              src={Tree}
              alt="Tree"
              className="absolute top-0 right-0 translate-x-[100%] translate-y-[30%] scale-[0.8]"
            />

            <div className="text-white text-3xl font-bold shrink-0 ">
              {content.destino_devconnect_who_can_apply.title}
            </div>
            <div className="flex flex-col justify-center items-center gap-8 text-lg shrink-0">
              <div className="shrink-0 text-yellow-400 text-lg">
                {content.destino_devconnect_who_can_apply.description}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-4 shrink-0 text-base">
                {content.destino_devconnect_who_can_apply.destino_devconnect_who_can_apply_list.map((item: any) => {
                  return (
                    <div className="flex flex-col items-center gap-2" key={item.description}>
                      <Image src={Check} alt="Check" className="w-14 h-14" />
                      <div>{item.description}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const FourthSection = ({ content }: { content: any }) => {
  const sectionColor = 'bg-[#4B91D1]'
  const shade = 'bg-[#80B6E8]'
  const shade2 = 'bg-[#2871B3]'

  return (
    <div className="relative z-[7]" id="fourth-section">
      <Platform
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="fourth-section-content"
        sectionId="fourth-section"
        isLast
        guanacoSpeechString="We gotchu"
        grassColor="grass-3"
      >
        <div className={cn('flex flex-col gap-4 justify-center items-center text-center')}>
          <div className="flex flex-col items-center gap-4 w-[500px] max-w-[95%] pt-32 pb-32 md:pb-24 lg:pt-0 lg:mb-8 xl:mb-16 xl:pt-0 xl:pb-0 lg:translate-y-[30%] xl:translate-y-[50%] 2xl:translate-y-[70%] lg:h-[400px] xl:h-[250px]">
            <Image
              src={MountainSnow}
              alt="Tree"
              className="absolute top-0 left-0 translate-x-[-110%] translate-y-[-45%] w-[260px] h-auto"
            />

            <Image
              src={RockOne}
              alt="Rock"
              className="absolute top-0 right-0 translate-x-[130%] translate-y-[-40%] w-[130px] auto"
            />

            <div className="text-white text-3xl font-bold shrink-0 mb-4 text-center">
              {content.destino_devconnect_how_to_apply.title}
            </div>
            <div className="flex flex-col justify-center items-center gap-4 lg:text-base  shrink-0">
              <div className="grid grid-cols-2 gap-4 text-center shrink-0">
                {content.destino_devconnect_how_to_apply.destino_devconnect_how_to_apply_list.map(
                  (item: any, index: number) => {
                    const icon = index === 0 ? Wallet : index === 1 ? Suitcase : index === 2 ? Speaker : Comms
                    return (
                      <div className="flex flex-col items-center gap-2" key={item.description}>
                        <Image src={icon} alt="Wallet" className="w-16 h-auto object-cover" />
                        <div>{item.description}</div>
                      </div>
                    )
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

// Epic naming, but this is a mess anyway...
export const ExtraSectionAddedLater = ({ content }: { content: any }) => {
  return (
    <div className="z-[9]  relative">
      {/* <div className={cn('absolute bottom-0 left-0 right-0 h-[3000px] bg-[#535388]')}>
        <></>
      </div> */}
      <div
        className="flex flex-col items-center justify-center gap-4 relative" // bg-[#535388]"
        // style={{
        //   maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
        //   WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
        // }}
      >
        <div className="section">
          <div className="flex flex-col items-center justify-center z-[1] py-16 gap-8 pt-40">
            <h2 className="text-white text-2xl lg:text-3xl font-medium mb-4 text-center">
              {content.destino_devconnect_who_can_apply.title}
            </h2>

            {/* <div className="text-yellow-400 text-lg font-medium">Request Tickets and Discounts</div> */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white leading-relaxed text-center text-sm">
              {content.destino_devconnect_who_can_apply.destino_devconnect_who_can_apply_list.map((item: any) => {
                return (
                  <div
                    className="bg-slate-800 py-4 px-4 backdrop-blur-sm flex justify-center items-center shadow-lg"
                    key={item.title}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-[#eca159] font-medium text-lg">{item.title}</span>
                      {item.description}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="backdrop-blur-sm flex mt-4 shadow-lg">
              <div
                className="self-start w-auto bg-slate-900 p-6 px-8 text-center"
                style={{
                  borderImage:
                    'linear-gradient(137.84deg, #F6B613 12.86%, #FF85A6 40.77%, #9894FF 67.87%, #33ccff 97.26%)',
                  borderImageSlice: 1,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                <RichText
                  content={content.destino_devconnect_who_can_apply.scholarships_available}
                  className={styles['scholarships-available']}
                />
                {/* <span className="font-medium">Scholarships Available </span> — Up to{' '}
                <span className="text-[#eca159] font-medium">$1,000 USD in funding support</span> is available for
                initiatives that help groups attend the Ethereum World Fair.
                <br />
                <br />
                <span className="text-sm">
                  <span className="text-[#eca159]">You also get:</span> free tickets and discounts for your community or
                  team, visibility across official Devconnect channels, and an on-chain certificate as an official
                  Devconnect Fren
                </span> */}
              </div>
            </div>

            <div className="text-center">
              <RichText
                content={content.destino_devconnect_who_can_apply.disclaimers}
                className={styles['disclaimers']}
              />
              {/* <p className="text-white/90 text-sm">
                Support can include transportation from distant locations, assistance with travel costs, or partial
                scholarships for builders attending their first Devconnect.
              </p>

              <p className="text-white/90 text-sm mt-2">
                Note: The budget is limited. We will not provide $1,000 to support a single builder. This funding is
                intended for communities or initiatives that can collectively support multiple participants attending
                the Ethereum World Fair. We prioritize initiatives that have the greatest impact across communities.
              </p> */}
            </div>

            <div className="text-white/90 mt-2 text-xl text-center flex flex-col gap-2">
              <RichText content={content.destino_devconnect_who_can_apply.deadlines} className={styles['deadlines']} />
              {/* <div>Request Tickets & Discounts: Until tickets are sold out</div>
              <div>
                Scholarship applications open: <span className="font-medium text-[#eca159]">October 15</span>
              </div>
              <div>
                Scholarship announcements: <span className="font-medium text-[#eca159]">October 30</span>
              </div> */}
            </div>

            <Link href="https://esp.ethereum.foundation/devcon-grants/apply">
              <button
                className={cn(
                  'border-solid border-b-[6px] group px-8 py-2 mt-4 border-[#F58A36] text-[#36364C] text-xl font-semibold bg-[#ffa94e] hover:bg-[#f5a236] transition-colors hover:border-opacity-0',
                  styles['tiled-button']
                )}
              >
                <div className="group-hover:translate-y-[3px] transition-transform uppercase">
                  {(globalThis as any).translations.apply_now_tickets || 'Apply Now'}
                </div>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export const HowToApply = ({ content }: { content: any }) => {
  return (
    <div className="section">
      <Separator className="mb-12 !bg-[#b9b9b9]" />
      <div className="flex gap-4">
        <div className="flex flex-col gap-0 w-[900px]">
          <div className={cn('text-2xl lg:text-3xl font-medium mb-4 self-start', styles['destino-rainbow'])}>
            {content.destino_devconnect_where_to_apply.title}
          </div>
          <div className="text-white">{content.destino_devconnect_where_to_apply.description}</div>
          <div className="text-sm mb-8 mt-4 leading-tight text-[#eca159]">
            {content.destino_devconnect_where_to_apply.where_to_apply}
          </div>

          {/* <Link href="https://esp.ethereum.foundation/devcon-grants/apply">
            <button
              className={cn(
                'border-solid border-b-[6px] group px-8 py-2 border-[#F58A36] text-[#36364C] text-xl font-semibold bg-[#ffa94e] hover:bg-[#f5a236] transition-colors hover:border-opacity-0',
                styles['tiled-button']
              )}
              disabled
            >
              <div className="group-hover:translate-y-[3px] transition-transform uppercase">
                Applications Closed
                {(globalThis as any).translations.apply_now} 
              </div>
            </button>
          </Link> */}
        </div>
        <div className="grow justify-end pr-16 hidden lg:flex">
          <Image src={Guanaco} alt="Guanaco" className={cn('object-contain w-[103px] outline-none')} />
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

export const EventsList = ({ content, events }: { content: any; events: any }) => {
  return (
    <div className="section">
      <div className="flex flex-col items-center justify-center gap-4 ">
        <EventsTable events={events} />
      </div>
    </div>
  )
}
