import React from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { Link } from 'components/common/link'
import Terminal from './images/dcix-terminal.png'

// Degrees of tilt at the far edges of the card — same feel as the old hero
// phone (AppPreviewPhone), which this replaces.
const MAX_TILT = 6
const TILT_SPRING = { stiffness: 320, damping: 26, mass: 0.6 }

type Props = { href: string; alt: string; caption: string; className?: string }

/**
 * Hero terminal (Figma 6068:574): one link (terminal + "Boot the
 * announcement") to the Devcon IX announcement. The terminal leans towards
 * the cursor and takes the shared 1.03 hover scale whenever the link is
 * hovered; the caption only changes the cursor. Under prefers-reduced-motion
 * both go: the tilt here, the scale via motion-safe. Width comes from the
 * caller (428px at lg, Figma; smaller below).
 */
export const DevconIxTerminal = ({ href, alt, caption, className = '' }: Props) => {
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
      className={`group flex flex-col items-center gap-[16px] lg:gap-[24px] text-[#a6ffe9] hover:text-[#a6ffe9] ${className}`}
    >
      {/* The hover scale lives on a plain wrapper: framer owns the tilt
          element's transform, and the caption below stays still. */}
      <div className="w-full shrink-0 transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.03] motion-safe:group-active:scale-[0.97]">
        <motion.div style={{ rotateX, rotateY, transformPerspective: 800 }} className="w-full">
          <Image
            src={Terminal}
            alt={alt}
            priority
            sizes="(max-width: 767px) 300px, (max-width: 1023px) 320px, 428px"
            draggable={false}
            className="w-full h-auto select-none"
          />
        </motion.div>
      </div>
      <p className="w-full font-terminal text-[28px] lg:text-[36px] leading-none text-center [text-shadow:0_1px_6px_rgba(0,26,19,0.63)]">
        {caption}
      </p>
    </Link>
  )
}
