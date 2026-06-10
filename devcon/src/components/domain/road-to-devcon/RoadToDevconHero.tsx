import React, { useEffect, useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useAnimationFrame,
  useReducedMotion,
  MotionValue,
} from 'framer-motion'

const ASSET_BASE = '/road-to-devcon'
const MOBILE_BREAKPOINT = 1024
const SMALL_BREAKPOINT = 600

type RingDef = {
  src: string
  width: string
  mobileWidth: string
  smallWidth: string
  z: number
  factor: number
  spring: { stiffness: number; damping: number; mass: number }
}

const RINGS: RingDef[] = [
  {
    src: `${ASSET_BASE}/l3.webp`,
    width: '81.5%',
    mobileWidth: '118%',
    smallWidth: '225%',
    z: 1,
    factor: 0.05,
    spring: { stiffness: 60, damping: 20, mass: 1.4 },
  },
  {
    src: `${ASSET_BASE}/l2.webp`,
    width: '71.25%',
    mobileWidth: '103%',
    smallWidth: '196.5%',
    z: 2,
    factor: -0.1,
    spring: { stiffness: 75, damping: 20, mass: 1.2 },
  },
  {
    src: `${ASSET_BASE}/l1.webp`,
    width: '52.4%',
    mobileWidth: '76%',
    smallWidth: '145.5%',
    z: 3,
    factor: 0.15,
    spring: { stiffness: 90, damping: 20, mass: 1 },
  },
]

const MAX_ROTATION = 600
const HERO_BLEED = 200
const DEVA_RADIUS = 25
const DEVA_SPEED = 0.24

// Matches `(max-width: ${breakpoint - 1}px)` — true while the viewport is narrower than the breakpoint.
function useIsMobile(breakpoint: number): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [breakpoint])

  return isMobile
}

type RingProps = RingDef & {
  progress: MotionValue<number>
  reduceMotion: boolean
  isMobile: boolean
  isSmall: boolean
}

// A single concentric ring layer. Rotates as the hero scrolls past, each layer at its
// own speed/direction (`factor`) and spring feel for a parallax depth effect.
function Ring({ progress, reduceMotion, isMobile, isSmall, src, width, mobileWidth, smallWidth, z, factor, spring }: RingProps) {
  const rotation = useTransform(progress, [0, 1], [0, MAX_ROTATION * factor])
  const smoothed = useSpring(rotation, spring)

  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden
      className="absolute left-1/2 top-1/2 max-w-none"
      style={{
        width: isSmall ? smallWidth : isMobile ? mobileWidth : width,
        zIndex: z,
        x: '-50%',
        y: '-50%',
        rotate: reduceMotion ? rotation : smoothed,
      }}
    />
  )
}

type RoadToDevconHeroProps = {
  height?: string
}

export function RoadToDevconHero({ height = '100vh' }: RoadToDevconHeroProps = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const isMobile = useIsMobile(MOBILE_BREAKPOINT)
  const isSmall = useIsMobile(SMALL_BREAKPOINT)

  const devaWrapperWidth = isSmall ? RINGS[0].smallWidth : RINGS[0].mobileWidth

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Mascot ("Deva") drifts continuously along a lemniscate (figure-8) path.
  const devaX = useMotionValue(0)
  const devaY = useMotionValue(0)

  useAnimationFrame(t => {
    if (reduceMotion) return
    const phase = (t / 1000) * DEVA_SPEED
    const sin = Math.sin(phase)
    const denom = 1 + sin * sin
    devaX.set((DEVA_RADIUS * Math.cos(phase)) / denom)
    devaY.set((DEVA_RADIUS * sin * Math.cos(phase)) / denom)
  })

  return (
    <section ref={sectionRef} className="relative w-full bg-black" style={{ height }}>
      <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: `calc(${height} + ${HERO_BLEED}px)` }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${ASSET_BASE}/bg.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-x-0 top-0" style={{ height }}>
          {/* Mascot */}
          <div
            className={
              isMobile
                ? 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square z-[5]'
                : 'absolute left-1/2 -translate-x-1/2 w-[19%] z-[5]'
            }
            style={isMobile ? { width: devaWrapperWidth } : { top: 'calc(28% - 150px)' }}
          >
            <motion.img
              src={`${ASSET_BASE}/deva.webp`}
              alt="Deva"
              className={isMobile ? 'absolute left-1/2 top-[20%] -translate-x-1/2 w-[23%]' : 'w-full'}
              style={{ x: devaX, y: devaY }}
            />
          </div>

          {/* Centered logo */}
          <img
            src={`${ASSET_BASE}/logo.webp`}
            alt="Road to Devcon"
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none z-[4] ${
              isSmall ? 'w-[108%]' : isMobile ? 'w-[58%]' : 'w-[40%]'
            }`}
          />

          {/* Rotating concentric rings */}
          {RINGS.map(ring => (
            <Ring
              key={ring.src}
              progress={scrollYProgress}
              reduceMotion={!!reduceMotion}
              isMobile={isMobile}
              isSmall={isSmall}
              {...ring}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default RoadToDevconHero
