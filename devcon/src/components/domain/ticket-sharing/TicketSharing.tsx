import React, { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useTilt } from './useTilt'
import { useCardSwipe } from './useCardSwipe'
import ticketFront from './ticket-design.png'
import ticketBack from './ticket-backside.png'
import heroBackdrop from 'components/common/dc-8/hero/images/dc8-bg.png'
import devconLogo from './updated-dc8-logo.png'
import IconArrowRight from 'assets/icons/arrow_right.svg'
import cn from 'classnames'
import css from './ticket-sharing.module.scss'
import ShootingStars from './ShootingStars'
import { Fireflies } from 'components/common/dc-8/hero/fireflies'

interface TicketSharingProps {
  name: string
  imageUrl?: string
  xUsername?: string
}

export function TicketSharing({ name, xUsername }: TicketSharingProps) {
  const { containerRef, requestGyroPermission } = useTilt()
  const { frontIndex, exitDirection, exitingIndex, isAnimating, handlePointerDown } = useCardSwipe(2)

  const [showGyroPrompt, setShowGyroPrompt] = useState(false)

  useEffect(() => {
    // Prevent iOS elastic overscroll and color the notch/bottom area
    const prevBodyBg = document.body.style.backgroundColor
    const prevHtmlBg = document.documentElement.style.backgroundColor
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.body.style.backgroundColor = '#1a0a3e'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    document.documentElement.style.backgroundColor = '#1a0a3e'

    const DOE = DeviceOrientationEvent as any
    if (typeof DOE.requestPermission === 'function') {
      setShowGyroPrompt(true)
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.overscrollBehavior = ''
      document.body.style.backgroundColor = prevBodyBg
      document.documentElement.style.overflow = ''
      document.documentElement.style.overscrollBehavior = ''
      document.documentElement.style.backgroundColor = prevHtmlBg
    }
  }, [])

  const handleEnableGyro = useCallback(async () => {
    setShowGyroPrompt(false)
    await requestGyroPermission()
  }, [requestGyroPermission])

  const [avatarError, setAvatarError] = useState(false)
  const handleAvatarError = useCallback(() => setAvatarError(true), [])
  const avatarSrc = xUsername ? `https://unavatar.io/x/${xUsername}` : null

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
        <Image src={heroBackdrop} alt="" fill className={cn(css.bgImage)} priority />
      </div>

      <ShootingStars />

      {/* Firefly particles — bottom */}
      <div className={css.particles}>
        <Fireflies
          id="ticket-fireflies"
          settings={{
            count: 120,
            color: 'rgba(139, 255, 255, 0.5)',
            speed: 0.15,
            radius: 2,
          }}
        />
      </div>

      <div className={css.aboveCard}>
        <Image src={devconLogo} alt="Devcon 8" className={css.heroLogo} />
      </div>

      {/* Card stack */}
      <div className={cn(css.cardStack, { [css.animating]: isAnimating })}>
        {/* Card 0: Ticket front */}
        <div className={cn(cardClass(0), css.ticketShadowWrap)} onPointerDown={frontIndex === 0 ? handlePointerDown : undefined}>
          <div className={css.ticketPunch}>
            <Image src={ticketFront} alt={`${name}'s Devcon ticket`} className={css.ticketImage} />
            <div className={css.ticketContent}>
              <div className={css.attendeeRow}>
                <div className={css.avatarCircle}>
                  {avatarSrc && !avatarError ? (
                    <img
                      src={avatarSrc}
                      alt={`${xUsername}'s avatar`}
                      className={css.avatarImage}
                      onError={handleAvatarError}
                    />
                  ) : (
                    <svg className={css.avatarPlaceholder} viewBox="0 0 100 100">
                      <circle cx="50" cy="38" r="18" fill="#ccc" />
                      <ellipse cx="50" cy="80" rx="30" ry="22" fill="#ccc" />
                    </svg>
                  )}
                </div>
                <div className={css.attendeeInfo}>
                  <span className={css.attendeeName}>{name}</span>
                  <span className={css.ticketType}>Attending Devcon</span>
              </div>
            </div>
          </div>

            {/* Flip hint — curved arrow, bottom-right of front card */}
            <svg className={css.flipHint} viewBox="0 0 24 24" fill="none">
              <path d="M5 12 C5 6, 12 4, 18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <polyline points="15,4 18,7 15,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Card 1: Ticket back */}
        <div className={cn(cardClass(1), css.backsideShadowWrap)} onPointerDown={frontIndex === 1 ? handlePointerDown : undefined}>
          <div className={css.backsideInner}>
            <Image src={ticketBack} alt="Devcon ticket details" className={css.ticketImage} />
            <div className={css.backsideContent}>
              <h2 className={css.backsideTitle}>Devcon is a unique place for inspiration</h2>
              <p className={css.backsideDescription}>
                Here, passionate builders, engineers, designers, researchers, community organizers, and artists come
                together to share updates and ideas. We can&apos;t wait to welcome you all in Mumbai this year.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Get tickets CTA + gyro prompt */}
      <div className={css.actions}>
        <a
          href="https://devcon.org"
          className={css.ctaButton}
          style={{ '--color-icon': '#f9f8fa' } as React.CSSProperties}
          target="_blank"
          rel="noreferrer"
        >
          Get tickets
          <IconArrowRight />
        </a>

        {showGyroPrompt && (
          <button onClick={handleEnableGyro} className={css.gyroButton}>
            Enable motion effects
          </button>
        )}
      </div>

      {/* Vignette shadow around edges */}
      <div className={css.vignette} />
    </div>
  )
}
