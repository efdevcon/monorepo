import React, { useMemo, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useTilt } from './useTilt'
import { useCardSwipe } from './useCardSwipe'
import ticketImage from './india-ticket-placeholder.jpeg'
import heroBackdrop from 'components/common/dc-8/hero/images/dc8-bg.png'
import IconX from 'assets/icons/twitter.svg'
import IconFarcaster from 'assets/icons/farcaster.svg'
import cn from 'classnames'
import css from './ticket-sharing.module.scss'

interface TicketSharingProps {
  name: string
  imageUrl?: string
  xUsername?: string
}

const PARTICLE_COUNT = 20

export function TicketSharing({ name, xUsername }: TicketSharingProps) {
  const { containerRef } = useTilt()
  const {
    frontIndex,
    exitDirection,
    exitingIndex,
    isAnimating,
    handlePointerDown,
  } = useCardSwipe(2)

  const [avatarError, setAvatarError] = useState(false)
  const handleAvatarError = useCallback(() => setAvatarError(true), [])
  const avatarSrc = xUsername ? `https://unavatar.io/x/${xUsername}` : null

  const [currentUrl, setCurrentUrl] = useState('https://devcon.org/mumbai/ticket/')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const twitterShare = `I just got my @EFdevcon ticket! %0ASee you in Mumbai, November 3-6 %0A%0AGet your ticket, too: %0A%0A${currentUrl}`
  const warpcastShare = `I just got my @devcon ticket! %0ASee you in Mumbai, November 3-6 %0A%0AGet your ticket, too: %0A%0A${currentUrl}&channelKey=devcon&embeds[]=${currentUrl}`

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const depth = 0.3 + Math.random() * 0.7
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        opacity: 0.05 + depth * 0.15,
        size: 2 + depth * 3,
        depth,
      }
    })
  }, [])

  const cardClass = (index: number) => {
    const isFront = index === frontIndex
    const isExiting = index === exitingIndex

    return cn(css.card, {
      [css.cardFront]: isFront && !isExiting,
      [css.cardBackPos]: !isFront && !isExiting,
      [css.exitingLeft]: isExiting && exitDirection === 'left',
      [css.exitingRight]: isExiting && exitDirection === 'right',
    })
  }

  return (
    <div ref={containerRef} className={css.container}>
      {/* Hero background with slow parallax */}
      <div className={`${css.bgLayer} ${css.bgSlow}`}>
        <Image src={heroBackdrop} alt="" fill className={css.bgImage} priority />
      </div>

      {/* Floating particles */}
      <div className={css.particles}>
        {particles.map(p => (
          <div
            key={p.id}
            className={css.particle}
            style={{
              left: p.left,
              top: p.top,
              opacity: p.opacity,
              width: p.size,
              height: p.size,
              transform: `translate(calc(var(--tilt-x) * ${p.depth * 35}px), calc(var(--tilt-y) * ${p.depth * 35}px))`,
            }}
          />
        ))}
      </div>

      <p className="text-xs text-white/30 mb-3 z-[3] relative">Swipe to flip</p>

      {/* Card stack */}
      <div className={cn(css.cardStack, { [css.animating]: isAnimating })}>
        {/* Card 0: Ticket */}
        <div
          className={cardClass(0)}
          onPointerDown={frontIndex === 0 ? handlePointerDown : undefined}
        >
          <Image src={ticketImage} alt={`${name}'s Devcon Mumbai ticket`} className={css.ticketImage} />
          <div className={css.avatarCircle}>
            {avatarSrc && !avatarError ? (
              <img src={avatarSrc} alt={`${xUsername}'s avatar`} className={css.avatarImage} onError={handleAvatarError} />
            ) : (
              <svg className={css.avatarPlaceholder} viewBox="0 0 100 100">
                <circle cx="50" cy="38" r="18" fill="white" />
                <ellipse cx="50" cy="80" rx="30" ry="22" fill="white" />
              </svg>
            )}
            <svg className={css.avatarRing} viewBox="0 0 200 200">
              <defs>
                <path id="circlePath" d="M 100,100 m -72,0 a 72,72 0 1,1 144,0 a 72,72 0 1,1 -144,0" />
              </defs>
              <text>
                <textPath href="#circlePath" startOffset="0%">
                  DEVCON 8 &bull; MUMBAI &bull; NOV 3 TO 6 &bull;
                </textPath>
              </text>
            </svg>
          </div>
          <span className={css.ticketName}>{name}</span>
        </div>

        {/* Card 1: Info */}
        <div
          className={cardClass(1)}
          onPointerDown={frontIndex === 1 ? handlePointerDown : undefined}
        >
          <div className={css.infoCard}>
            <span className={css.infoLabel}>Devcon 8</span>
            <h2 className={css.infoTitle}>Mumbai, India</h2>
            <span className={css.infoDate}>3–6 November 2026</span>
            <p className={css.infoDescription}>
              The Ethereum developer conference returns to bring together builders, researchers, and the global community.
            </p>
            <span className={css.infoFooter}>devcon.org</span>
          </div>
        </div>
      </div>

      {/* Share actions */}
      <div className={css.actions}>
        <p className="text-sm text-white/60 mb-2">Share on</p>
        <div className="flex gap-4">
          <a
            className="rounded-full bg-white/10 border border-white/20 w-[2.5em] h-[2.5em] flex items-center justify-center hover:bg-white/20 transition-colors"
            // @ts-ignore
            style={{ '--color-icon': '#ffffff' }}
            href={`https://x.com/intent/tweet?text=${twitterShare}`}
            target="_blank"
            rel="noreferrer"
          >
            <IconX />
          </a>
          <a
            className="rounded-full bg-white/10 border border-white/20 w-[2.5em] h-[2.5em] flex items-center justify-center hover:bg-white/20 transition-colors"
            // @ts-ignore
            style={{ '--color-icon': '#ffffff' }}
            href={`https://warpcast.com/~/compose?text=${warpcastShare}`}
            target="_blank"
            rel="noreferrer"
          >
            <IconFarcaster />
          </a>
        </div>
      </div>

      {/* Vignette shadow around edges */}
      <div className={css.vignette} />
    </div>
  )
}
