import React, { useState, useRef } from 'react'
import { Fireflies } from './fireflies'
import Image from 'next/image'
import DC8Background from './images/dc8-bg.png'
// import Logo from './images/dc8-logo.png'
import Logo from 'assets/images/dc-8/dc8-logo-glow.png'
import css from './hero.module.scss'
import cn from 'classnames'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import Link from 'next/link'
import { useSpring, useMotionValue, useMotionTemplate, motion } from 'framer-motion'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// TODO: Move to lib later
const GlassInput = ({
  value,
  onChange,
  className,
  placeholder,
  type,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  type?: string
}) => {
  return (
    <div className={cn(css['glass'], 'group flex items-center', className)}>
      <input
        type={type || 'text'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-[#4B4B66] bg-transparent outline-none group-hover:border-white"
      />
      <div
        style={{
          gap: '4px',
          borderRadius: '34px',
          background: '#FE7A06',
        }}
        className={cn(
          value.length > 0 ? 'opacity-100' : 'opacity-40',
          'h-[95%] shrink-0 flex items-center justify-center px-3 text-sm transition-opacity cursor-pointer text-white font-primary font-medium'
        )}
      >
        Join
      </div>
    </div>
  )
}

const NewsletterForm = () => {
  const [email, setEmail] = useState('')

  return (
    <div className="glass mt-3 md:mt-3 relative z-[20]">
      <Link
        href="https://paragraph.com/@efevents/subscribe"
        target="_blank"
        className="font-semibold font-primary mb-1 bg-[#6871CA] hover:bg-[#555EB1] transition-colors duration-300 rounded-full border border-white backdrop-blur-[3px] px-7 py-3"
        style={{
          textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)',
          // boxShadow: '0 2px 8px 0 rgba(58, 54, 94, 0.15), 0 1px 2px 0 rgba(255, 255, 255, 0.30) inset',
        }}
      >
        Subscribe to Newsletter
      </Link>
      {/* <GlassInput
        value={email}
        onChange={setEmail}
        placeholder="Email address"
        type="email"
        className="text-[#4B4B66]"
      /> */}
    </div>
  )
}

const CenteredOverlayContent = React.forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div
      ref={ref}
      className="absolute h-full inset-0 w-full flex items-center justify-center z-[11] text-black translate-y-[-6%]  md:translate-y-[-4%]"
    >
      <div className="flex font-secondary text-white flex-col items-center justify-center gap-0">
        <Image src={Logo} alt="Devcon 8 Logo" className="w-[575px] max-w-[100vw] mb-2 md:mb-0" />
        {/* <div
          className="text-2xl font-medium mb-1.5 translate-y-[-16px] md:translate-y-[-26px]"
          style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}
        >
          DEVCON 8
        </div> */}

        <div
          className="text-3xl text-center leading-tighter translate-y-[-16px] md:translate-y-[-26px]"
          style={{ textShadow: '0 2px 12px rgb(24, 24, 30)' }}
        >
          MUMBAI, INDIA
          <br />
          <span className="font-normal">Q4 2026</span>
        </div>
        <div
          className="text-xl leading-tight text-center mt-5 translate-y-[-16px] md:translate-y-[-26px]"
          style={{ textShadow: '0 2px 12px rgb(24, 24, 30)' }}
        >
          Ethereum's global community <br /> and developer conference
        </div>

        <NewsletterForm />
      </div>
    </div>
  )
})

const useCursorTracker = (ref: any) => {
  const [delta, setDelta] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    // Only enable on devices with a pointer (not touch)
    const hasPointer = window.matchMedia('(pointer: fine)').matches

    if (!hasPointer) return

    const handleMouseMove = (event: any) => {
      if (ref.current) {
        const { left, top, width, height } = ref.current.getBoundingClientRect()
        const centerX = left + width / 2
        const centerY = top + height / 2
        const deltaX = event.clientX - centerX
        const deltaY = event.clientY - centerY
        setDelta({ x: deltaX, y: deltaY })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [ref])

  return delta
}

export const Hero = () => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const delta = useCursorTracker(containerRef)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const transformX = useSpring(x, { damping: 25 })
  const transformY = useSpring(y, { damping: 25 })

  React.useEffect(() => {
    // Pan calculation - simple multiplier of delta with negative to pan opposite direction
    const panX = -delta.x * 0.02
    const panY = -delta.y * 0.02

    x.set(panX)
    y.set(panY)
  }, [delta, x, y])

  React.useEffect(() => {
    const handleResize = () => {
      x.set(0)
      y.set(0)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [x, y])

  // useGSAP(() => {
  //   if (overlayRef.current) {
  //     gsap.to(overlayRef.current, {
  //       opacity: 0,
  //       ease: 'none',
  //       scrollTrigger: {
  //         trigger: document.body,
  //         start: 'top top',
  //         end: `+=${window.innerHeight / 2}`,
  //         scrub: true,
  //       },
  //     })
  //   }
  // }, [])

  return (
    <div className="relative h-screen w-screen">
      <div ref={containerRef} className="fixed h-screen w-screen z-[10]">
        <CenteredOverlayContent ref={overlayRef} />
        <motion.div
          className="w-full h-full absolute top-0 left-0 z-[5]"
          style={{
            x: transformX,
            y: transformY,
            scale: 1.02,
          }}
        >
          <Fireflies id="lower-fireflies" />
          <Image
            src={DC8Background}
            alt="Devcon 8 Background"
            fill
            placeholder="blur"
            className="object-cover object-[64.5%,50%] md:object-[50%,80%]"
          />
        </motion.div>
      </div>
    </div>
  )
}
