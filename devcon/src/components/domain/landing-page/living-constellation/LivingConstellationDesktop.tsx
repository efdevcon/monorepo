import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import type { ConstellationSpeaker } from './types'
import { SpeakerDetailOverlay } from './SpeakerDetailOverlay'

type RingCfg = {
  radius: number
  cardSizes: readonly number[]
  cornerRadius: number
  captionSize: number
  captionWidth: number
  parallax: number
}

const RING_CONFIG_DESKTOP: readonly RingCfg[] = [
  { radius: 0.32, cardSizes: [62, 66, 64, 68, 64, 66] as const, cornerRadius: 9, captionSize: 11, captionWidth: 110, parallax: 0.35 },
  { radius: 0.6, cardSizes: [72, 78, 70, 80, 74, 76, 72, 78, 74] as const, cornerRadius: 10, captionSize: 11, captionWidth: 132, parallax: 0.65 },
  { radius: 0.88, cardSizes: [84, 90, 82, 92, 86, 88, 84, 90] as const, cornerRadius: 12, captionSize: 12, captionWidth: 150, parallax: 1.0 },
]

const RING_CONFIG_COMPACT: readonly RingCfg[] = [
  { radius: 0.34, cardSizes: [44, 48, 46, 50, 46, 48] as const, cornerRadius: 7, captionSize: 9, captionWidth: 70, parallax: 0 },
  { radius: 0.66, cardSizes: [50, 54, 48, 56, 52, 54, 50, 54, 52] as const, cornerRadius: 8, captionSize: 10, captionWidth: 84, parallax: 0 },
  { radius: 0.96, cardSizes: [60, 66, 58, 68, 62, 64, 60, 66] as const, cornerRadius: 9, captionSize: 10, captionWidth: 96, parallax: 0 },
]

const COMPACT_WIDTH = 600
const RING_DISTRIBUTION = [6, 9]
const CAPTION_GAP = 6

interface LivingConstellationDesktopProps {
  speakers: ConstellationSpeaker[]
  className?: string
}

export function LivingConstellationDesktop({ speakers, className = '' }: LivingConstellationDesktopProps) {
  const [selected, setSelected] = useState<ConstellationSpeaker | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const reduceMotion = useReducedMotion()

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const sx = useSpring(mouseX, { stiffness: 90, damping: 22, mass: 0.6 })
  const sy = useSpring(mouseY, { stiffness: 90, damping: 22, mass: 0.6 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const el = containerRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const nx = (e.clientX - r.left - r.width / 2) / (r.width / 2)
      const ny = (e.clientY - r.top - r.height / 2) / (r.height / 2)
      mouseX.set(Math.max(-1, Math.min(1, nx)))
      mouseY.set(Math.max(-1, Math.min(1, ny)))
    }
    const onLeave = () => {
      mouseX.set(0)
      mouseY.set(0)
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [mouseX, mouseY, reduceMotion])

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const ringGroups = useMemo(() => {
    const list = speakers.filter(s => s.type !== 'logo')
    const groups: ConstellationSpeaker[][] = [[], [], []]
    const [inner, middle] = RING_DISTRIBUTION
    list.forEach((s, i) => {
      if (i < inner) groups[0].push(s)
      else if (i < inner + middle) groups[1].push(s)
      else groups[2].push(s)
    })
    return groups
  }, [speakers])

  const breathPhases = useMemo(
    () =>
      speakers.map(() => ({
        duration: 4.5 + Math.random() * 3,
        delay: Math.random() * 4,
        dx: (Math.random() - 0.5) * 5,
        dy: (Math.random() - 0.5) * 5,
      })),
    [speakers],
  )
  const phaseById = useMemo(() => {
    const m = new Map<string, (typeof breathPhases)[number]>()
    speakers.forEach((s, i) => m.set(s.id, breathPhases[i]))
    return m
  }, [speakers, breathPhases])

  const isCompact = size.w < COMPACT_WIDTH
  const ringConfig = isCompact ? RING_CONFIG_COMPACT : RING_CONFIG_DESKTOP

  // Two axes so the constellation stretches into an ellipse that fills the
  // canvas — taller containers use the vertical room, wider containers the
  // horizontal room, instead of being clamped to the smaller dimension. Both
  // paths reserve room for the outer ring's card halves + caption so cards
  // never spill past the container's edges (and get clipped by
  // overflow-hidden).
  const outerCfg = ringConfig[ringConfig.length - 1]
  const maxOuterCard = Math.max(...outerCfg.cardSizes)
  const captionRoom = outerCfg.captionSize + 6 + CAPTION_GAP
  const hMargin = maxOuterCard / 2 + outerCfg.captionWidth / 4 + 6
  const vMargin = maxOuterCard / 2 + captionRoom + 8
  const usableRadiusX = Math.max(80, size.w / 2 - hMargin)
  const usableRadiusY = Math.max(80, size.h / 2 - vMargin)

  // Card / caption sizes scale with the SMALLER axis so they stay readable
  // and never collide on tighter rings. Calibrated to usableRadius ≈ 400.
  const REFERENCE_RADIUS = 400
  const minRadius = Math.min(usableRadiusX, usableRadiusY)
  const sizeScale = isCompact ? 1 : Math.min(1.55, Math.max(1, minRadius / REFERENCE_RADIUS))

  const handleSelect = useCallback((s: ConstellationSpeaker) => setSelected(s), [])
  const handleDismiss = useCallback(() => {
    setSelected(null)
    setHovered(null)
  }, [])

  const hoveredSpeaker = hovered ? speakers.find(s => s.id === hovered) : null

  return (
    <div ref={containerRef} className={`relative w-full h-full select-none overflow-hidden ${className}`}>
      {/* Center hovered-event-logo watermark — keyed by logo so hovering
          two speakers from the same event doesn't flicker. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
        <AnimatePresence mode="wait">
          {hoveredSpeaker?.event && (
            <motion.div
              key={hoveredSpeaker.event.logo.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ width: 140, height: 140, position: 'relative' }}
            >
              <Image src={hoveredSpeaker.event.logo} alt="" fill sizes="140px" className="object-contain" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center title / hovered name (pill-backed so it reads above cards) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[25]">
        <AnimatePresence mode="popLayout">
          {hoveredSpeaker ? (
            <motion.div
              key={`hov-${hoveredSpeaker.id}`}
              className="text-center"
              initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(4px)', y: -4 }}
              transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
              style={{
                padding: isCompact ? '8px 14px' : '12px 20px',
                textShadow: '0 1px 4px #EAE9FD',
              }}
            >
              <p
                className="tracking-tight whitespace-nowrap"
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 800,
                  fontSize: isCompact ? 20 : 26,
                  color: '#160b2b',
                }}
              >
                {hoveredSpeaker.name}
              </p>
              <p
                className="whitespace-nowrap"
                style={{ fontSize: isCompact ? 13 : 15, color: 'rgba(34,17,68,0.88)', fontWeight: 500, marginTop: 2 }}
              >
                {hoveredSpeaker.title} · {hoveredSpeaker.company}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="title"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
              style={{ padding: isCompact ? '6px 14px' : '10px 20px' }}
            >
              <h2
                className="tracking-tight whitespace-nowrap"
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 800,
                  fontSize: isCompact ? 22 : 28,
                  color: '#160b2b',
                }}
              >
                Past speakers
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rings */}
      {ringGroups.map((group, i) => (
        <Ring
          key={i}
          ringIndex={i}
          group={group}
          cfg={ringConfig[i]}
          radiusX={usableRadiusX * ringConfig[i].radius}
          radiusY={usableRadiusY * ringConfig[i].radius}
          sizeScale={sizeScale}
          sx={sx}
          sy={sy}
          phaseById={phaseById}
          hovered={hovered}
          selectedId={selected?.id ?? null}
          onHover={setHovered}
          onSelect={handleSelect}
          reduceMotion={!!reduceMotion}
          frozen={!!selected}
        />
      ))}

      <SpeakerDetailOverlay
        speaker={selected}
        layoutIdPrefix="speaker-v2-"
        cardWidth={Math.min(340, Math.max(260, size.w - 32))}
        imageHeight={isCompact ? 220 : 260}
        companyLogoHeight={56}
        backdropClassName="cursor-pointer"
        backdropStyle={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.65) 100%)',
          backdropFilter: 'blur(2px)',
        }}
        onDismiss={handleDismiss}
      />
    </div>
  )
}

interface RingProps {
  ringIndex: number
  group: ConstellationSpeaker[]
  cfg: RingCfg
  radiusX: number
  radiusY: number
  sizeScale: number
  sx: MotionValue<number>
  sy: MotionValue<number>
  phaseById: Map<string, { duration: number; delay: number; dx: number; dy: number }>
  hovered: string | null
  selectedId: string | null
  onHover: (id: string | null) => void
  onSelect: (s: ConstellationSpeaker) => void
  reduceMotion: boolean
  frozen: boolean
}

function Ring({
  ringIndex,
  group,
  cfg,
  radiusX,
  radiusY,
  sizeScale,
  sx,
  sy,
  phaseById,
  hovered,
  selectedId,
  onHover,
  onSelect,
  reduceMotion,
  frozen,
}: RingProps) {
  const tx = useTransform(sx, v => v * 16 * cfg.parallax)
  const ty = useTransform(sy, v => v * 16 * cfg.parallax)

  return (
    <motion.div
      className="absolute"
      style={{
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        zIndex: group.some(s => s.id === hovered) ? 20 : ringIndex,
        x: reduceMotion ? 0 : tx,
        y: reduceMotion ? 0 : ty,
      }}
    >
      {(() => {
        // Use the smaller axis to bound card size — that's the tightest
        // spacing along the ellipse perimeter and prevents overlap.
        const minR = Math.min(radiusX, radiusY)
        const arcLength = (2 * Math.PI * minR) / group.length
        const maxCardForArc = Math.max(40, arcLength * 0.7)

        return group.map((speaker, i) => {
          const angle = ((2 * Math.PI) / group.length) * i - Math.PI / 2
          const cx = radiusX * Math.cos(angle)
          const cy = radiusY * Math.sin(angle)
          const baseCard = cfg.cardSizes[i % cfg.cardSizes.length]
          const cardSize = Math.round(Math.min(baseCard * sizeScale, maxCardForArc))
          const captionWidth = Math.round(Math.min(cfg.captionWidth * sizeScale, arcLength * 0.95))
          const isHovered = hovered === speaker.id
          const isSelected = selectedId === speaker.id
          const phase = phaseById.get(speaker.id) ?? { duration: 5, delay: 0, dx: 0, dy: 0 }

          return (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              x={cx}
              y={cy}
              cardSize={cardSize}
              cornerRadius={cfg.cornerRadius}
              captionSize={cfg.captionSize}
              captionWidth={captionWidth}
              captionAbove={cy < 0}
              isHovered={isHovered}
              isSelected={isSelected}
              anyHovered={!!hovered}
              phase={phase}
              onHover={onHover}
              onSelect={onSelect}
              reduceMotion={reduceMotion}
              frozen={frozen}
              tabOrder={ringIndex * 100 + i}
            />
          )
        })
      })()}
    </motion.div>
  )
}

interface CardProps {
  speaker: ConstellationSpeaker
  x: number
  y: number
  cardSize: number
  cornerRadius: number
  captionSize: number
  captionWidth: number
  captionAbove: boolean
  isHovered: boolean
  isSelected: boolean
  anyHovered: boolean
  phase: { duration: number; delay: number; dx: number; dy: number }
  onHover: (id: string | null) => void
  onSelect: (s: ConstellationSpeaker) => void
  reduceMotion: boolean
  frozen: boolean
  tabOrder: number
}

function SpeakerCard({
  speaker,
  x,
  y,
  cardSize,
  cornerRadius,
  captionSize,
  captionWidth,
  captionAbove,
  isHovered,
  isSelected,
  anyHovered,
  phase,
  onHover,
  onSelect,
  reduceMotion,
  frozen,
  tabOrder,
}: CardProps) {
  const breathAnim =
    reduceMotion || frozen
      ? { x: 0, y: 0 }
      : {
          x: [0, phase.dx, 0, -phase.dx, 0],
          y: [0, -phase.dy, 0, phase.dy, 0],
        }

  const cardHeight = Math.round(cardSize * 1.15)
  const captionHeight = Math.round(captionSize * 1.4)
  const captionTop = captionAbove ? -cardHeight / 2 - CAPTION_GAP - captionHeight : cardHeight / 2 + CAPTION_GAP

  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width: 0, height: 0, zIndex: isHovered || isSelected ? 25 : 1 }}
    >
      <motion.div
        animate={breathAnim}
        transition={{ duration: phase.duration, delay: phase.delay, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {/* Card image — absolutely centered on (0,0) of the wrapper */}
        {isSelected ? (
          <div
            style={{
              position: 'absolute',
              left: -cardSize / 2,
              top: -cardHeight / 2,
              width: cardSize,
              height: cardHeight,
            }}
          />
        ) : (
          <motion.button
            type="button"
            layoutId={`speaker-v2-${speaker.id}`}
            tabIndex={frozen ? -1 : 0}
            aria-label={`${speaker.name}, ${speaker.title} at ${speaker.company}`}
            onClick={() => onSelect(speaker)}
            onMouseEnter={() => onHover(speaker.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(speaker.id)}
            onBlur={() => onHover(null)}
            className="cursor-pointer"
            style={{
              position: 'absolute',
              left: -cardSize / 2,
              top: -cardHeight / 2,
              width: cardSize,
              height: cardHeight,
              padding: 0,
              border: 'none',
              background: 'transparent',
              zIndex: 2,
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.5, y: -3 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            data-tab-order={tabOrder}
          >
            <div
              className="w-full h-full overflow-hidden flex items-center justify-center text-white font-semibold relative"
              style={{
                backgroundColor: speaker.color,
                fontSize: cardSize * 0.32,
                borderRadius: cornerRadius,
                outline: '1px solid rgba(34, 17, 68, 0.08)',
                boxShadow: isHovered
                  ? '0 10px 24px -10px rgba(34,17,68,0.3), 0 4px 8px -4px rgba(34,17,68,0.2)'
                  : '0 2px 6px -2px rgba(34,17,68,0.12)',
                transition: 'box-shadow 180ms ease-out',
              }}
            >
              <Image
                src={speaker.image}
                alt=""
                fill
                placeholder="blur"
                sizes={`${cardSize}px`}
                className="object-cover"
              />
            </div>
            {speaker.companyLogo && (
              <div
                className="absolute flex items-center justify-center overflow-hidden"
                style={{
                  width: Math.round(cardSize * 0.3),
                  height: Math.round(cardSize * 0.3),
                  ...(x < 0
                    ? { left: -Math.round(cardSize * 0.12), bottom: -Math.round(cardSize * 0.12) }
                    : { right: -Math.round(cardSize * 0.12), bottom: -Math.round(cardSize * 0.12) }),
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 4px -1px rgba(34,17,68,0.2)',
                  border: 'none',
                  zIndex: 3,
                }}
              >
                <Image
                  src={speaker.companyLogo}
                  alt=""
                  fill
                  sizes={`${Math.round(cardSize * 0.3)}px`}
                  className="object-contain"
                />
              </div>
            )}
          </motion.button>
        )}

        {/* Caption — radiates outward (above for upper half, below for lower) */}
        {!isSelected && (
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: -captionWidth / 2,
              top: captionTop,
              width: captionWidth,
              height: captionHeight,
              textAlign: 'center',
              fontSize: captionSize,
              lineHeight: `${captionHeight}px`,
              color: 'rgba(34,17,68,0.88)',
              fontWeight: 500,
              opacity: anyHovered ? 0 : 1,
              transform: anyHovered
                ? `translateY(${captionAbove ? '6px' : '-6px'}) scale(0.95)`
                : 'translateY(0) scale(1)',
              transition: 'opacity 200ms ease-out, transform 200ms ease-out',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {speaker.name}
          </div>
        )}
      </motion.div>
    </div>
  )
}
