import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { Link } from 'components/common/link'
import Terminal from './images/dcix-terminal.png'

// Degrees of tilt at the far edges of the card — same feel as the old hero
// phone (AppPreviewPhone), which this replaces.
const MAX_TILT = 6
const TILT_SPRING = { stiffness: 320, damping: 26, mass: 0.6 }

// Caption glow on hover: the strip's text glow over the resting drop shadow.
const CAPTION_SHADOW = '[text-shadow:0_1px_6px_rgba(0,26,19,0.63)]'
const CAPTION_SHADOW_HOVER =
  'group-hover:[text-shadow:0_0_10px_rgba(166,255,233,0.7),0_0_2px_rgba(166,255,233,0.9),0_1px_6px_rgba(0,26,19,0.63)]'

// Enter on the hero should not hijack a form field or an element that
// already acts on Enter.
const INTERACTIVE = 'input, textarea, select, button, a, [contenteditable=""], [contenteditable="true"]'

type Props = { href: string; alt: string; caption: string; className?: string }

/**
 * Hero terminal (Figma 6068:574): one link (terminal + a shell prompt caption,
 * "> boot devcon9_") to the Devcon IX announcement. The terminal leans towards
 * the cursor and takes the shared 1.03 hover scale whenever the link is
 * hovered; the caption gains a glow and its cursor stops blinking. Pressing
 * Enter while the terminal is on screen follows the link — the screen says
 * "Press ENTER to start", so make it true. Under prefers-reduced-motion the
 * tilt and the blink go; the scale via motion-safe.
 */
export const DevconIxTerminal = ({ href, alt, caption, className = '' }: Props) => {
  const reduceMotion = useReducedMotion()
  const router = useRouter()
  const linkRef = useRef<HTMLAnchorElement | null>(null)
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

  // Enter follows the link while the terminal is in view. Only while in view
  // so a visitor reading further down the page keeps a plain Enter; and only
  // a bare Enter with nothing interactive focused, so forms, buttons and the
  // link itself (native Enter → click) keep their own behaviour.
  useEffect(() => {
    const el = linkRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let inView = false
    const observer = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), { threshold: 0.5 })
    observer.observe(el)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return
      if (!inView) return
      const active = document.activeElement
      if (active && active !== document.body && active.matches(INTERACTIVE)) return
      e.preventDefault()
      // Not el.click(): the shared Link swallows synthetic clicks. Route the
      // same way a real click would — external URLs open in a new tab there.
      if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener,noreferrer')
      else router.push(href)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [href, router])

  return (
    <Link
      ref={linkRef}
      to={href}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-keyshortcuts="Enter"
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
      {/* Shell prompt: "> " + command + block cursor. The cursor blinks at
          rest and holds solid on hover, like a focused terminal. */}
      <p
        className={`w-full font-terminal text-[28px] lg:text-[36px] leading-none text-center whitespace-nowrap transition-[text-shadow] duration-150 ease-out ${CAPTION_SHADOW} ${CAPTION_SHADOW_HOVER}`}
      >
        <span aria-hidden>&gt; </span>
        {caption}
        <span aria-hidden className="motion-safe:animate-blink group-hover:animate-none">
          _
        </span>
      </p>
    </Link>
  )
}
