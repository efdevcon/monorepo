import React from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { Link } from 'components/common/link'
import PhoneMockup from './images/phone-mockup.png'

// Figma 5241:502 — 194×400 phone with the white/purple glow; the PNG already
// carries the app screenshot. Degrees of tilt at the far edges of the card.
const PHONE_W = 194
const PHONE_H = 400
const MAX_TILT = 6
const TILT_SPRING = { stiffness: 320, damping: 26, mass: 0.6 }

type Props = { href: string; alt: string; caption: string }

/**
 * Desktop hero phone: one link (phone + "Install the app") to the event app.
 * The phone leans towards the cursor and takes the shared 1.03 hover scale
 * whenever the link is hovered; the caption only changes the cursor. Under
 * prefers-reduced-motion both go: the tilt here, the scale via motion-safe.
 */
export const AppPreviewPhone = ({ href, alt, caption }: Props) => {
  const reduceMotion = useReducedMotion()
  // Cursor position across the card, -0.5 … 0.5 on each axis.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), TILT_SPRING)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), TILT_SPRING)

  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (reduceMotion || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onPointerLeave = () => {
    px.set(0)
    py.set(0)
  }

  return (
    <Link
      to={href}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="group flex flex-col items-center gap-[8px] text-white text-center"
    >
      {/* The hover scale lives on a plain wrapper: framer owns the tilt
          element's transform, and the caption below stays still. */}
      <div className="shrink-0 transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.03] motion-safe:group-active:scale-[0.97]">
        <motion.div
          style={{ rotateX, rotateY, transformPerspective: 800, width: PHONE_W, height: PHONE_H }}
          className="relative rounded-[30px] shadow-[0_0_82px_rgba(255,255,255,0.5),0_0_138.9px_rgba(255,255,255,0.25),0_0_138.9px_#c4aaf7,0_0_138.9px_#9668f1]"
        >
          <Image
            src={PhoneMockup}
            alt={alt}
            width={PHONE_W}
            height={PHONE_H}
            sizes={`${PHONE_W}px`}
            draggable={false}
            className="absolute inset-0 w-full h-full select-none"
          />
        </motion.div>
      </div>
      {/* Above the glow: the phone's box-shadow paints over plain siblings */}
      <span className="relative z-10 font-['Chloe'] text-[44px] leading-none tracking-[-1px] [text-shadow:0_4px_8px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.15)]">
        {caption}
      </span>
    </Link>
  )
}
