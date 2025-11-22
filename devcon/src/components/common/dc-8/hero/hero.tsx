import React, { useState, useRef } from 'react'
import { Fireflies } from './fireflies'
import Image from 'next/image'
import DC8Background from './images/dc8-bg.png'
import Logo from './images/dc8-logo.png'
import css from './hero.module.scss'
import cn from 'classnames'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import Link from 'next/link'

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
    <div className="glass mt-3 md:mt-4">
      <Link
        href="https://paragraph.com/@efevents/subscribe"
        className="font-semibold font-primary mb-1 bg-[#6871CA] hover:bg-[#555EB1] transition-colors duration-300 rounded-full border border-white backdrop-blur-[3px] px-7 py-3"
        style={{
          textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)',
          // boxShadow: '0 2px 8px 0 rgba(58, 54, 94, 0.15), 0 1px 2px 0 rgba(255, 255, 255, 0.30) inset',
        }}
      >
        Join the waitlist
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
    <div ref={ref} className="absolute h-full inset-0 w-full flex items-center justify-center z-[11] text-black">
      <div className="flex font-secondary text-white flex-col items-center justify-center gap-0">
        <Image src={Logo} alt="Devcon 8 Logo" className="w-[500px]" />
        <div
          className="text-2xl font-medium mb-1.5 translate-y-[-22px]"
          style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}
        >
          DEVCON 8
        </div>
        <div
          className="text-xl leading-tight text-center mb-0 translate-y-[-22px]"
          style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}
        >
          Ethereum's global community <br /> and developer conference
        </div>
        <div
          className="text-3xl font-medium text-center mb-4 leading-tight"
          style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}
        >
          MUMBAI, INDIA
          <br />
          <span className="font-normal">Q4 2026</span>
        </div>

        <NewsletterForm />
      </div>
    </div>
  )
})

const useCursorTracker = (ref: any) => {
  const [delta, setDelta] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
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

    const element = ref.current

    if (element) {
      element.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [ref.current])

  return delta
}

export const Hero = () => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const delta = useCursorTracker(containerRef)
  const [objectPosition, setObjectPosition] = React.useState({ x: 50, y: 50 })

  React.useEffect(() => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()

    // Pan calculation based on mouse delta with higher multiplier
    const panX = (delta.x / containerRect.width) * 50
    const panY = (delta.y / containerRect.height) * 50

    // Allow panning to the edges (0% to 100%)
    const newX = Math.max(0, Math.min(100, 50 - panX))
    const newY = Math.max(0, Math.min(100, 50 - panY))

    setObjectPosition({ x: newX, y: newY })
  }, [delta])

  useGSAP(() => {
    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: `+=${window.innerHeight / 2}`,
          scrub: true,
        },
      })
    }
  }, [])

  return (
    <div className="relative h-screen w-screen">
      <div ref={containerRef} className="fixed h-screen w-screen z-[10]">
        <Fireflies id="lower-fireflies" />
        <CenteredOverlayContent ref={overlayRef} />
        <Image
          src={DC8Background}
          alt="Devcon 8 Background"
          fill
          className="object-cover object-[50%,80%]"
          // style={{
          //   objectPosition: `${objectPosition.x}% ${objectPosition.y}%`,
          // }}
        />
      </div>
    </div>
  )
}
