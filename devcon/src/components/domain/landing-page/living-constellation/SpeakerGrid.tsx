import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type Transition } from 'framer-motion'
import IconX from 'assets/icons/twitter.svg'
import { ctaSecondary } from 'components/common/cta'
import { speakerAriaLabel, type ConstellationSpeaker } from './types'
import { speakerTrackTheme, type SpeakerTrackTheme } from './track-theme'

// Grid → centre: critically damped-ish, so the focused card arrives cleanly.
const TO_CENTRE: Transition = { type: 'spring', stiffness: 340, damping: 30, mass: 0.9 }
// Centre → grid: stiff and only lightly under-damped — a crisp snap into the
// slot with a small overshoot, not a wobble.
const TO_GRID: Transition = { type: 'spring', stiffness: 760, damping: 42 }
const HOVER = { type: 'spring', stiffness: 380, damping: 24 } as const
// When the returning card first reaches its slot (TO_GRID's first crossing).
// The landing squash starts here so it reads as part of the impact, not a
// second beat after the card settles.
const LANDING_MS = 120

// The focused card is centred in the space below the site header (`top`),
// with a gutter (16px; 20px on iPhone SE-width screens). Width is 380px,
// shrunk for narrow phones and for short viewports: the focused photo crop is
// at most 0.72 × width tall and the text block (name → bio → CTA) needs up to
// ~320px, so the width is capped to what fits.
const FOCUSED_TEXT_RESERVE = 320
const FOCUSED_PHOTO_RATIO = 0.72
const SMALL_PHONE_MAX = 375
const focusedGutter = () => (window.innerWidth <= SMALL_PHONE_MAX ? 20 : 16)
const focusedWidth = (top: number, gutter: number) =>
  `max(240px, min(380px, calc(100vw - ${2 * gutter}px), calc((100dvh - ${
    top + 2 * gutter + FOCUSED_TEXT_RESERVE
  }px) / ${FOCUSED_PHOTO_RATIO})))`
// One `sizes` for both states so the grid already holds the file the focused
// card shows — the photo never swaps source mid-flight.
const PHOTO_SIZES = '(max-width: 639px) 100vw, 380px'

// Focus veil. One flat tint (no gradient) because it is drawn in two pieces
// that must meet invisibly — see the header veil in SpeakerGrid.
// (Untyped object: React.CSSProperties clashes with Framer's MotionStyle here
// because two csstype versions are installed.)
const VEIL_STYLE = {
  background: 'rgba(246, 243, 255, 0.82)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
}
const VEIL_FADE: Transition = { duration: 0.2 }
// Leaving focus should feel quicker than entering it.
const VEIL_EXIT = { opacity: 0, pointerEvents: 'none' as const, transition: { duration: 0.14 } }
// The header's drop shadow (0 4px 2px, header.module.scss) hangs below its
// box; the header veil reaches past it and the main veil starts where it ends.
const HEADER_SHADOW_PX = 6

// Small screens show a whole number of rows and a "View all" button: 8 rows
// of 2 below `sm`, 6 rows of 3 from `sm` to `lg`; `lg`+ always shows all.
// Done with CSS (not a width hook) so there is no hydration flash.
const SHOWN_2_COL = 16
const SHOWN_3_COL = 18
// Cards revealed by "View all" slide up into place, staggered in reading order.
const REVEAL = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
const REVEAL_STAGGER = 0.035
const collapsedClass = (index: number) =>
  index >= SHOWN_3_COL ? 'max-lg:hidden' : index >= SHOWN_2_COL ? 'max-sm:hidden' : ''

const INK = '#160b2b'
const MUTED = '#594d73'

interface SpeakerGridProps {
  speakers: ConstellationSpeaker[]
}

export function SpeakerGrid({ speakers }: SpeakerGridProps) {
  const t = useTranslations('home.speakers')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Card flying back to its slot: stays above its neighbours until it lands.
  const [returningId, setReturningId] = useState<string | null>(null)
  // Bottom edge of the site header when a card opened (0 = header hidden).
  const [headerBottom, setHeaderBottom] = useState(0)
  const [expanded, setExpanded] = useState(false)
  // Speaker ids that were hidden at this width when "View all" was pressed,
  // in list order (their index drives the stagger).
  const [revealed, setRevealed] = useState<string[]>([])
  const gridRef = useRef<HTMLUListElement>(null)

  const expand = () => {
    const hidden = [...(gridRef.current?.children ?? [])]
      .filter(li => getComputedStyle(li).display === 'none')
      .map(li => (li as HTMLElement).dataset.speaker ?? '')
    setRevealed(hidden)
    setExpanded(true)
  }
  const [gutter, setGutter] = useState(16)
  const reduceMotion = !!useReducedMotion()

  const open = useCallback((id: string) => {
    // A card still flying home must drop its raised z-index now, or it sits
    // above the veil (and over the newly focused card).
    setReturningId(null)
    setHeaderBottom(Math.max(0, document.getElementById('header-container')?.getBoundingClientRect().bottom ?? 0))
    setGutter(focusedGutter())
    setSelectedId(id)
  }, [])

  const close = useCallback(() => {
    if (!selectedId) return
    const id = selectedId
    setReturningId(id)
    setSelectedId(null)
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-speaker-id="${id}"]`)?.focus({ preventScroll: true })
    )
  }, [selectedId])

  const onLanded = useCallback((id: string) => setReturningId(current => (current === id ? null : current)), [])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    // Lock page scroll while focused so the card's slot stays where it left
    // it — the return flight needs a fixed target.
    const html = document.documentElement
    const gutter = window.innerWidth - html.clientWidth
    const prev = { overflow: html.style.overflow, paddingRight: html.style.paddingRight }
    html.style.overflow = 'hidden'
    if (gutter) html.style.paddingRight = `${gutter}px`
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = prev.overflow
      html.style.paddingRight = prev.paddingRight
    }
  }, [selectedId, close])

  // Where the header veil ends and the main veil begins (0 = header hidden).
  const veilSplit = headerBottom > 0 ? headerBottom + HEADER_SHADOW_PX : 0

  return (
    <>
      <ul ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {speakers.map((speaker, index) => {
          const focused = speaker.id === selectedId
          const revealOrder = revealed.indexOf(speaker.id)
          const slot = (
            <div className="h-full">
              {focused && <SlotPlaceholder speaker={speaker} />}
              <SpeakerCard
                // Revealed cards remount (new key) so they have no previous
                // (display: none → 0×0) box for the layout animation to fly in
                // from; they slide up via their own lift/opacity instead.
                key={revealOrder < 0 ? 'card' : 'revealed'}
                revealDelay={revealOrder < 0 || reduceMotion ? undefined : revealOrder * REVEAL_STAGGER}
                speaker={speaker}
                focused={focused}
                elevated={focused || speaker.id === returningId}
                topInset={veilSplit}
                gutter={gutter}
                onOpen={open}
                onClose={close}
                onLanded={onLanded}
                reduceMotion={reduceMotion}
              />
            </div>
          )
          return (
            <li
              key={speaker.id}
              data-speaker={speaker.id}
              className={`min-w-0 ${expanded ? '' : collapsedClass(index)}`}
            >
              {slot}
            </li>
          )
        })}
      </ul>
      {!expanded && speakers.length > SHOWN_2_COL && (
        // Only shown at the widths where cards are actually hidden.
        <div className={`flex justify-center ${speakers.length > SHOWN_3_COL ? 'lg:hidden' : 'sm:hidden'}`}>
          <button type="button" onClick={expand} className={ctaSecondary} style={{ fontFamily: 'Poppins, sans-serif' }}>
            {t('view_all')}
          </button>
        </div>
      )}
      {/* The home page renders everything below the hero in a z-index layer
          beneath the sticky header, and the focused card must stay in that
          layer (moving it out would remount its photo). So the veil comes in
          two pieces: this one, in the card's layer just beneath it, and a strip
          portalled over the header. Exiting veils ignore the pointer so a fast
          click lands on the grid, not a fading veil. */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            key="speaker-veil"
            className="fixed inset-0 z-[100] cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={VEIL_EXIT}
            transition={VEIL_FADE}
            onClick={close}
            style={{ ...VEIL_STYLE, top: veilSplit }}
          />
        )}
      </AnimatePresence>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedId && headerBottom > 0 && (
              <motion.div
                key="speaker-header-veil"
                aria-hidden
                className="fixed inset-x-0 top-0 z-[21] cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={VEIL_EXIT}
                transition={VEIL_FADE}
                onClick={close}
                style={{ ...VEIL_STYLE, height: veilSplit }}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

interface SpeakerCardProps {
  speaker: ConstellationSpeaker
  focused: boolean
  elevated: boolean
  onOpen: (id: string) => void
  onClose: () => void
  onLanded: (id: string) => void
  reduceMotion: boolean
  /** Viewport px the site header occupies; the focused card centres below it. */
  topInset: number
  /** Space around the focused card, px. */
  gutter: number
  /** Set on cards revealed by "View all": slide up + fade in after this delay (s). */
  revealDelay?: number
}

// One element for both states: in the grid it sits in its slot; focused, it
// switches to position: fixed in the viewport centre and Framer animates the
// difference. The photo is never remounted, so the same image flies out and
// back.
function SpeakerCard({
  speaker,
  focused,
  elevated,
  onOpen,
  onClose,
  onLanded,
  reduceMotion,
  topInset,
  gutter,
  revealDelay,
}: SpeakerCardProps) {
  const t = useTranslations('home.speakers')
  const track = speakerTrackTheme(speaker.track)
  const [hovered, setHovered] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const playful = !focused && !reduceMotion
  // Hover lift + press, driven imperatively so opening can clear them in one
  // go (see `openCard`).
  // The reveal runs on the card's own values, never an ancestor's: an
  // ancestor transform / will-change would trap the focused card's
  // position: fixed inside its slot (and nothing here waits on Framer's
  // completion callbacks, which proved unreliable for the cleanup).
  const lift = useMotionValue(revealDelay === undefined ? 0 : 24)
  const fade = useMotionValue(revealDelay === undefined ? 1 : 0)
  const scale = useMotionValue(1)
  const pressed = useRef(false)
  // Set the moment a card starts opening (before `focused` arrives) and held
  // until it has landed back in its slot: hover/press must not animate the
  // card during either flight — a returning card often flies under the
  // pointer, and a hover lift mid-flight skews the photo's layout correction.
  const away = useRef(false)
  const awayTimer = useRef<number | undefined>(undefined)
  // Landing squash. Lives on a wrapper (an ancestor of the card) so it never
  // skews the photo's layout correction, and is a motion value we own so
  // opening can zero it synchronously: any transform left on an ancestor would
  // trap the focused card's position: fixed inside the slot.
  const landScale = useMotionValue(1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const landingTimer = useRef<number | undefined>(undefined)
  const wasFocused = useRef(false)

  // Nested layout boxes must ride the card's spring, or they trail behind it.
  const layoutTransition = focused ? TO_CENTRE : TO_GRID

  const settle = useCallback(
    (isHovered: boolean) => {
      if (reduceMotion || away.current) return
      animate(lift, isHovered ? -6 : 0, HOVER)
      animate(scale, pressed.current ? 0.97 : isHovered ? 1.035 : 1, HOVER)
    },
    [lift, scale, reduceMotion]
  )

  // Slide up + fade in on mount for cards revealed by "View all".
  useEffect(() => {
    if (revealDelay === undefined) return
    const transition = { ...REVEAL, delay: revealDelay }
    const rise = animate(lift, 0, transition)
    const appear = animate(fade, 1, transition)
    return () => {
      rise.stop()
      appear.stop()
    }
  }, [revealDelay, lift, fade])

  useEffect(() => {
    if (focused) {
      away.current = true
      window.clearTimeout(awayTimer.current)
      closeRef.current?.focus({ preventScroll: true })
    } else if (wasFocused.current) {
      // Cleared on landing (onLayoutAnimationComplete); the timer is a
      // fallback for an interrupted flight that never reports completion.
      awayTimer.current = window.setTimeout(() => (away.current = false), 600)
      if (!reduceMotion)
        landingTimer.current = window.setTimeout(
          () => animate(landScale, [1, 0.92, 1], { duration: 0.22, times: [0, 0.4, 1], ease: 'easeOut' }),
          LANDING_MS
        )
    }
    wasFocused.current = focused
  }, [focused, reduceMotion, landScale])

  useEffect(
    () => () => {
      window.clearTimeout(landingTimer.current)
      window.clearTimeout(awayTimer.current)
    },
    []
  )

  // Framer snapshots the card's start box when the layout change commits. If
  // the hover lift is still applied then, the card and its photo box start
  // from different boxes and the photo trails the card. So: drop the lift
  // instantly, let that paint, and only then start the flight.
  const openCard = () => {
    lift.stop()
    scale.stop()
    lift.set(0)
    scale.set(1)
    fade.stop()
    fade.set(1)
    window.clearTimeout(landingTimer.current)
    landScale.stop()
    landScale.set(1)
    if (wrapperRef.current) wrapperRef.current.style.transform = 'none'
    pressed.current = false
    away.current = true
    setHovered(false)
    requestAnimationFrame(() => onOpen(speaker.id))
  }

  return (
    <motion.div ref={wrapperRef} className="h-full" style={{ scale: landScale }}>
      <motion.div
        layout
        transition={{ layout: layoutTransition }}
        onLayoutAnimationComplete={() => {
          if (focused) return
          away.current = false
          window.clearTimeout(awayTimer.current)
          onLanded(speaker.id)
        }}
        // Chrome fires a synthetic hover as the card starts moving under a still
        // pointer; ignoring it unless the card is in the grid keeps it from
        // landing back lifted.
        onHoverStart={() => {
          if (!playful || away.current) return
          setHovered(true)
          settle(true)
        }}
        onHoverEnd={() => {
          setHovered(false)
          settle(false)
        }}
        role={focused ? 'dialog' : undefined}
        aria-modal={focused || undefined}
        aria-label={focused ? speaker.name : undefined}
        className={`flex flex-col overflow-hidden bg-white ${
          focused ? 'fixed inset-x-0 z-[101] m-auto h-fit' : `relative h-full w-full ${elevated ? 'z-[101]' : ''}`
        }`}
        style={{
          y: lift,
          opacity: fade,
          scale,
          borderRadius: focused ? 24 : 16,
          width: focused ? focusedWidth(topInset, gutter) : undefined,
          top: focused ? topInset + gutter : undefined,
          bottom: focused ? gutter : undefined,
          // Very short viewports (≈ 650px): the text block scrolls inside the
          // card rather than the card running under the header.
          maxHeight: focused ? `calc(100dvh - ${topInset + 2 * gutter}px)` : undefined,
          boxShadow: focused
            ? '0 30px 60px -20px rgba(34,17,68,0.4), 0 0 0 1px rgba(34,17,68,0.06)'
            : hovered
            ? '0 18px 32px -14px rgba(34,17,68,0.35), 0 0 0 1px rgba(34,17,68,0.06)'
            : '0 2px 8px -4px rgba(34,17,68,0.14), 0 0 0 1px rgba(34,17,68,0.06)',
          transition: 'box-shadow 200ms ease-out',
        }}
      >
        {/* Crop window: 10:9 in the grid; focused it is 30% shorter on
            mobile and 20% shorter from md up. The photo layer inside always
            stays 10:9 (centred via a %-of-width negative margin), so during the
            flight only the window changes shape — the photo itself only ever
            scales uniformly and never squashes. */}
        <motion.div
          layout
          transition={{ layout: layoutTransition }}
          // White, not the speaker's placeholder colour: the photo's edges land
          // on fractional pixels, and a coloured backing anti-aliases into a
          // tinted hairline along them. (The blur placeholder covers loading.)
          className={`relative w-full shrink-0 overflow-hidden bg-white ${
            focused ? 'aspect-[100/63] md:aspect-[100/72]' : 'aspect-[10/9]'
          }`}
        >
          <motion.div
            layout
            transition={{ layout: layoutTransition }}
            className={`relative aspect-[10/9] w-full ${focused ? '-mt-[13.5%] md:-mt-[9%]' : ''}`}
          >
            <Image
              src={speaker.image}
              alt={focused ? speaker.name : ''}
              fill
              placeholder="blur"
              sizes={PHOTO_SIZES}
              className="object-cover"
            />
          </motion.div>
          <AnimatePresence>
            {focused && (
              <motion.button
                key="close"
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ delay: 0.12, duration: 0.2 }}
                className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[#160b2b] shadow-sm transition-colors hover:bg-white cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div
          layout="position"
          transition={{ layout: layoutTransition }}
          className={
            focused
              ? 'flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain p-5 [&>*]:shrink-0'
              : CARD_TEXT_CLASS
          }
        >
          <CardText speaker={speaker} track={track} large={focused} />
          {/* Focus-only extras fade in just behind the flight, bio first. No
            exit animation: the card is back in grid flow the moment it closes,
            and lingering extras would make it taller than its row and push the
            row below down until the fade finished. */}
          {focused && speaker.bio && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.22 }}
              className="mt-3 text-[14px] leading-[1.5] text-[#221144] text-pretty max-[375px]:text-[12px]"
            >
              {speaker.bio}
            </motion.p>
          )}
          {focused && speaker.xHandle && (
            <motion.a
              href={`https://x.com/${speaker.xHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: speaker.bio ? 0.18 : 0.12, duration: 0.22 }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#7235ED] py-2.5 text-[14px] leading-[20px] font-bold text-white transition-colors hover:bg-[#6020d0] [&_path]:fill-white"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <IconX className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('follow_on_x')}
            </motion.a>
          )}
        </motion.div>
        {/* Whole-card hit target in the grid (a sibling, not a wrapper, so the
          focused card's close button and X link are never nested in it). */}
        {!focused && (
          <button
            type="button"
            data-speaker-id={speaker.id}
            aria-label={t('card_label', { speaker: speakerAriaLabel(speaker) })}
            aria-haspopup="dialog"
            onClick={openCard}
            onPointerDown={() => {
              pressed.current = true
              settle(hovered)
            }}
            onPointerLeave={() => {
              pressed.current = false
            }}
            className="absolute inset-0 z-10 cursor-pointer rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7235ed]"
          />
        )}
      </motion.div>
    </motion.div>
  )
}

const CARD_TEXT_CLASS = 'flex flex-1 flex-col gap-0.5 p-3 sm:p-4 sm:pb-3'

function CardText({
  speaker,
  track,
  large,
}: {
  speaker: ConstellationSpeaker
  track: SpeakerTrackTheme | undefined
  large: boolean
}) {
  return (
    <>
      <p
        className={`font-bold leading-tight text-balance ${
          large ? 'text-[22px] font-extrabold tracking-[-0.4px]' : 'text-[15px] sm:text-[16px] tracking-[-0.2px]'
        }`}
        style={{ color: INK }}
      >
        {speaker.name}
      </p>
      {speaker.title && (
        <p
          className={`leading-snug text-[#221144] ${large ? 'text-[15px]' : 'text-[12px] sm:text-[13px] line-clamp-2'}`}
        >
          {speaker.title}
        </p>
      )}
      <p
        className={`leading-snug ${large ? 'text-[15px]' : 'text-[12px] sm:text-[13px] line-clamp-2'}`}
        style={{ color: MUTED }}
      >
        {speaker.company}
      </p>
      {/* Grid: mt-auto lines tags up along the bottom of a row of uneven cards. */}
      {track && (
        <div className={large ? 'mt-2' : 'mt-auto pt-1.5'}>
          <TrackTag track={track} large={large} />
        </div>
      )}
    </>
  )
}

// Holds the slot's size while its card is focused (no photo, nothing to load).
function SlotPlaceholder({ speaker }: { speaker: ConstellationSpeaker }) {
  return (
    <div aria-hidden className="invisible flex h-full flex-col">
      <div className="aspect-[10/9] w-full shrink-0" />
      <div className={CARD_TEXT_CLASS}>
        <CardText speaker={speaker} track={speakerTrackTheme(speaker.track)} large={false} />
      </div>
    </div>
  )
}

function TrackTag({ track, large = false }: { track: SpeakerTrackTheme; large?: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 font-semibold leading-tight text-[#160b2b] ${
        large
          ? 'rounded-full py-[3px] pl-1 pr-3 text-[13px]'
          : 'rounded-[12px] py-[3px] pl-1 pr-2 text-[10px] sm:text-[11px]'
      }`}
      style={{ backgroundColor: track.color }}
    >
      <Image src={track.image} alt="" className={`shrink-0 ${large ? 'h-7 w-7' : 'h-5 w-5'}`} sizes="28px" />
      {track.name}
    </span>
  )
}
