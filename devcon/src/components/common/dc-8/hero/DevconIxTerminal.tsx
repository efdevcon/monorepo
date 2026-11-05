import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
// CRT screen only (no monitor shell), 4:3 with rounded corners + alpha.
import Terminal from './images/dcix-screen.png'
import css from './terminal.module.scss'

// Caption glow on hover: the strip's text glow over the resting drop shadow.
const CAPTION_SHADOW = '[text-shadow:0_1px_6px_rgba(0,26,19,0.63)]'
const CAPTION_SHADOW_HOVER =
  'group-hover:[text-shadow:0_0_10px_rgba(166,255,233,0.7),0_0_2px_rgba(166,255,233,0.9),0_1px_6px_rgba(0,26,19,0.63)]'
// The screen carries the caption's hover glow at rest (drop-shadow, so it
// follows the PNG's rounded alpha edge rather than the box).
const SCREEN_GLOW = '[filter:drop-shadow(0_0_10px_rgba(166,255,233,0.7))_drop-shadow(0_0_2px_rgba(166,255,233,0.9))]'

// Enter on the hero should not hijack a form field or an element that
// already acts on Enter.
const INTERACTIVE = 'input, textarea, select, button, a, [contenteditable=""], [contenteditable="true"]'

type Props = { href: string; alt: string; caption: string; className?: string }

/**
 * Hero terminal (Figma 6068:574): one link (terminal + a shell prompt caption,
 * "> boot devcon9_") to the Devcon IX announcement, a plain <a>: the page is a
 * static build outside the Next router (config/devconIx.ts). The terminal takes the
 * shared 1.03 hover / 0.97 press scale whenever the link is hovered; the
 * caption gains a glow (the screen wears the same glow at rest) and its
 * cursor stops blinking. Pressing Enter while
 * the terminal is on screen follows the link — the screen says "Press ENTER
 * to start", so make it true. Under prefers-reduced-motion the scale and the
 * blink go (motion-safe).
 */
export const DevconIxTerminal = ({ href, alt, caption, className = '' }: Props) => {
  const linkRef = useRef<HTMLAnchorElement | null>(null)

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
      el.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <a
      ref={linkRef}
      href={href}
      aria-keyshortcuts="Enter"
      className={`group flex flex-col items-center gap-[16px] lg:gap-[24px] text-[#a6ffe9] hover:text-[#a6ffe9] ${className}`}
    >
      {/* The hover scale lives on the screen only; the caption below stays
          still. The screen rests around 70% opacity (0.72 here × the CRT
          flicker on the image, terminal.module.scss) and goes solid on hover:
          200ms ease-out on this wrapper, flicker off (the scale keeps its
          150ms). The drifting edge mask sits between the two so the glow on
          this wrapper follows the softened edge. */}
      <div
        className={`w-full shrink-0 opacity-[0.72] group-hover:opacity-100 transition-[transform,opacity] duration-150 [transition-duration:150ms,200ms] ease-out motion-safe:group-hover:scale-[1.03] motion-safe:group-active:scale-[0.97] ${SCREEN_GLOW}`}
      >
        <div className={css['screen']}>
          <Image
            src={Terminal}
            alt={alt}
            priority
            sizes="(max-width: 767px) 300px, (max-width: 1023px) 320px, 428px"
            draggable={false}
            className={`w-full h-auto select-none group-hover:[animation:none] ${css['flicker']}`}
          />
        </div>
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
    </a>
  )
}
