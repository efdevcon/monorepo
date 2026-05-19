import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import type { ConstellationSpeaker } from './types'
import { SpeakerDetailOverlay } from './SpeakerDetailOverlay'

const ORBIT_DURATION = 100
const CARD_W = 80
const CARD_H = 112
const CARD_RADIUS = 10
const ELLIPSE_RX = '70vw'
const ELLIPSE_RY = '230px'
const LOGO_SIZE = Math.round(CARD_W * 0.3)
const LOGO_OFFSET = -Math.round(CARD_W * 0.1)
const CAPTION_GAP = 8
const SWIPE_FACTOR = 0.08
const MOMENTUM_TC = 0.325

interface LivingConstellationMobileProps {
  speakers: ConstellationSpeaker[]
  className?: string
}

export function LivingConstellationMobile({ speakers, className = '' }: LivingConstellationMobileProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<ConstellationSpeaker | null>(null)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const dismissing = useRef(false)

  const orbitProgress = useMotionValue(0)
  const speakerRefs = useRef<(HTMLDivElement | null)[]>([])
  const isDragging = useRef(false)
  const wasDragged = useRef(false)
  const momentumRaf = useRef<number | null>(null)
  const autoOrbitRef = useRef<number>(0)
  const touchState = useRef({
    startX: 0,
    startProgress: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  })

  // SSR-safe default — the actual count is set in an effect after mount so
  // `window` is available.
  const [speakerCount, setSpeakerCount] = useState(13)

  useEffect(() => {
    const update = () => setSpeakerCount(window.innerWidth > 480 ? 18 : 13)
    update()
    const mql = window.matchMedia('(min-width: 481px)')
    const handler = () => update()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const allSpeakers = useMemo(() => {
    const order = [
      'vitalik', 'audrey', 'danny', 'aya', 'joseph', 'justin', 'brewster',
      'stani', 'sreeram', 'pooja', 'roger', 'mudit', 'tarun',
      'bruno', 'tomasz', 'sunny', 'puja', 'soham',
    ]
    const map = new Map(speakers.filter(s => s.type !== 'logo').map(s => [s.id, s]))
    return order.filter(id => map.has(id)).map(id => map.get(id)!).slice(0, speakerCount)
  }, [speakers, speakerCount])

  useEffect(() => {
    const count = allSpeakers.length
    if (count === 0) return
    const setPositions = (v: number) => {
      for (let i = 0; i < count; i++) {
        const el = speakerRefs.current[i]
        if (!el) continue
        const baseOffset = (100 * i) / count
        const pct = (((v + baseOffset) % 100) + 100) % 100
        el.style.setProperty('offset-distance', `${pct}%`)
      }
    }
    setPositions(orbitProgress.get())
    const unsubscribe = orbitProgress.on('change', setPositions)
    return unsubscribe
  }, [orbitProgress, allSpeakers])

  useEffect(() => {
    if (selectedSpeaker) return
    const speed = 100 / ORBIT_DURATION
    let lastTime = performance.now()

    const tick = (now: number) => {
      if (!isDragging.current && !momentumRaf.current) {
        const dt = (now - lastTime) / 1000
        orbitProgress.set(orbitProgress.get() + speed * dt)
      }
      lastTime = now
      autoOrbitRef.current = requestAnimationFrame(tick)
    }
    autoOrbitRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(autoOrbitRef.current)
  }, [selectedSpeaker, orbitProgress])

  const cancelMomentum = useCallback(() => {
    if (momentumRaf.current) {
      cancelAnimationFrame(momentumRaf.current)
      momentumRaf.current = null
    }
  }, [])

  const handleSelect = useCallback(
    (speaker: ConstellationSpeaker) => {
      cancelMomentum()
      setSelectedSpeaker(speaker)
      setActiveSpeaker(speaker.id)
    },
    [cancelMomentum],
  )

  const handleDismiss = useCallback(() => {
    dismissing.current = true
    setSelectedSpeaker(null)
    setActiveSpeaker(null)
    requestAnimationFrame(() => {
      dismissing.current = false
    })
  }, [])

  useEffect(() => {
    if (!selectedSpeaker) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedSpeaker, handleDismiss])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      cancelMomentum()
      isDragging.current = true
      wasDragged.current = false
      const x = e.touches[0].clientX
      touchState.current = {
        startX: x,
        startProgress: orbitProgress.get(),
        lastX: x,
        lastTime: performance.now(),
        velocity: 0,
      }
    },
    [orbitProgress, cancelMomentum],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return
      const x = e.touches[0].clientX
      const now = performance.now()
      const state = touchState.current

      const dt = (now - state.lastTime) / 1000
      if (dt > 0) {
        const instantV = ((x - state.lastX) * SWIPE_FACTOR) / dt
        state.velocity = state.velocity * 0.7 + instantV * 0.3
      }

      orbitProgress.set(state.startProgress + (x - state.startX) * SWIPE_FACTOR)

      if (Math.abs(x - state.startX) > 8) wasDragged.current = true

      state.lastX = x
      state.lastTime = now
    },
    [orbitProgress],
  )

  const onTouchEnd = useCallback(() => {
    isDragging.current = false
    const velocity = touchState.current.velocity

    if (Math.abs(velocity) > 2) {
      let v = velocity
      let lastTime = performance.now()

      const decay = (now: number) => {
        const dt = (now - lastTime) / 1000
        lastTime = now
        v *= Math.exp(-dt / MOMENTUM_TC)
        orbitProgress.set(orbitProgress.get() + v * dt)

        if (Math.abs(v) > 0.5) {
          momentumRaf.current = requestAnimationFrame(decay)
        } else {
          momentumRaf.current = null
        }
      }
      momentumRaf.current = requestAnimationFrame(decay)
    }

    requestAnimationFrame(() => {
      wasDragged.current = false
    })
  }, [orbitProgress])

  return (
    <div
      className={`relative w-full h-full select-none ${className}`}
      style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none' } as React.CSSProperties}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Single elliptical orbit */}
      <div className="absolute inset-x-0" style={{ top: '50%', height: 0 }}>
        {allSpeakers.map((speaker, i) => {
          const isSelected = selectedSpeaker?.id === speaker.id

          return (
            <div
              key={speaker.id}
              ref={el => {
                speakerRefs.current[i] = el
              }}
              className="absolute"
              style={
                {
                  left: '50%',
                  top: 0,
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: -CARD_W / 2,
                  marginTop: -CARD_H / 2,
                  offsetPath: `ellipse(${ELLIPSE_RX} ${ELLIPSE_RY})`,
                  offsetRotate: '0deg',
                } as React.CSSProperties
              }
            >
              {isSelected ? (
                <div style={{ width: CARD_W, height: CARD_H }} />
              ) : (
                <motion.div
                  layoutId={`speaker-v2-mobile-${speaker.id}`}
                  onClick={e => {
                    e.stopPropagation()
                    if (!dismissing.current && !wasDragged.current) handleSelect(speaker)
                  }}
                  className="w-full h-full cursor-pointer relative"
                  style={{ pointerEvents: selectedSpeaker ? 'none' : 'auto' }}
                  whileTap={{ scale: 1.3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div
                    className="w-full h-full overflow-hidden flex items-center justify-center text-white font-semibold relative"
                    style={{
                      backgroundColor: speaker.color,
                      borderRadius: CARD_RADIUS,
                      outline: '1px solid rgba(34, 17, 68, 0.1)',
                      boxShadow: '0 2px 6px -2px rgba(34,17,68,0.12)',
                    }}
                  >
                    <Image
                      src={speaker.image}
                      alt={speaker.name}
                      fill
                      placeholder="blur"
                      sizes={`${CARD_W}px`}
                      draggable={false}
                      className="object-cover pointer-events-none"
                    />
                  </div>
                  {speaker.companyLogo && (
                    <div
                      className="absolute flex items-center justify-center overflow-hidden"
                      style={{
                        width: LOGO_SIZE,
                        height: LOGO_SIZE,
                        bottom: LOGO_OFFSET,
                        right: LOGO_OFFSET,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 4px -1px rgba(34,17,68,0.2)',
                        zIndex: 3,
                      }}
                    >
                      <Image
                        src={speaker.companyLogo}
                        alt=""
                        fill
                        sizes={`${LOGO_SIZE}px`}
                        draggable={false}
                        className="object-contain pointer-events-none"
                      />
                    </div>
                  )}
                </motion.div>
              )}
              {/* Name label */}
              {!isSelected && (
                <div
                  className="absolute left-1/2 pointer-events-none"
                  style={{
                    transform: 'translateX(-50%)',
                    top: CARD_H + CAPTION_GAP,
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(34,17,68,0.85)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {speaker.name}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative flex items-center justify-center" style={{ height: 36 }}>
          <AnimatePresence>
            {activeSpeaker ? (
              <motion.p
                key={activeSpeaker}
                className="tracking-tight whitespace-nowrap absolute"
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 32, color: '#160b2b' }}
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.12 }}
              >
                {speakers.find(s => s.id === activeSpeaker)?.name}
              </motion.p>
            ) : (
              <motion.h2
                key="default"
                className="tracking-tight absolute whitespace-nowrap"
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 32, color: '#160b2b' }}
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.12 }}
              >
                Past speakers
              </motion.h2>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SpeakerDetailOverlay
        speaker={selectedSpeaker}
        layoutIdPrefix="speaker-v2-mobile-"
        cardWidth="min(320px, calc(100vw - 48px))"
        imageHeight={220}
        companyLogoHeight={48}
        backdropStyle={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 100%)',
        }}
        onDismiss={handleDismiss}
      />
    </div>
  )
}
