import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTilt } from './useTilt'
import { useCardSwipe } from './useCardSwipe'
import ticketFront from './ticket-design.png'
import ticketBack from './ticket-backside.png'
import heroBackdrop from './occluded.png'
import devconLogo from './updated-dc8-logo.png'
import IconArrowRight from 'assets/icons/arrow_right.svg'
import IconTwitter from 'assets/icons/twitter.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'
import { Copy } from 'lucide-react'
import cn from 'classnames'
import css from './ticket-sharing.module.scss'
import { ShootingStars } from './ShootingStars'
import { Fireflies } from 'components/common/dc-8/hero/fireflies'

interface TicketSharingProps {
  name: string
  avatarUrl?: string | null
  share?: boolean
  pageUrl?: string
}

export function TicketSharing({ name, avatarUrl, share, pageUrl }: TicketSharingProps) {
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

    // Strip "share" param from URL so copied/shared URLs show "Get tickets" instead
    const url = new URL(window.location.href)
    if (url.searchParams.has('share')) {
      url.searchParams.delete('share')
      window.history.replaceState({}, '', url.toString())
    }

    // On iOS Safari (HTTPS), DeviceOrientationEvent.requestPermission exists
    // and must be called from a user gesture. Show a prompt button for that.
    const DOE = DeviceOrientationEvent as any
    const hasPermissionAPI = typeof DOE?.requestPermission === 'function'

    if (hasPermissionAPI) {
      const accepted = localStorage.getItem('gyro-accepted')
      if (accepted === 'true') {
        DOE.requestPermission()
          .then((state: string) => {
            if (state === 'granted') requestGyroPermission()
            else setShowGyroPrompt(true) // permission revoked, re-prompt
          })
          .catch(() => {
            localStorage.removeItem('gyro-accepted')
            setShowGyroPrompt(true) // auto-request failed, fall back to prompt
          })
      } else {
        setShowGyroPrompt(true)
      }
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.overscrollBehavior = ''
      document.body.style.backgroundColor = prevBodyBg
      document.documentElement.style.overflow = ''
      document.documentElement.style.overscrollBehavior = ''
      document.documentElement.style.backgroundColor = prevHtmlBg
    }
  }, [requestGyroPermission])

  const handleEnableGyro = useCallback(async () => {
    setShowGyroPrompt(false)
    const granted = await requestGyroPermission()
    if (granted) {
      localStorage.setItem('gyro-accepted', 'true')
    }
  }, [requestGyroPermission])

  const [copied, setCopied] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const handleAvatarError = useCallback(() => setAvatarError(true), [])

  const hasAvatar = !!avatarUrl && !avatarError

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
        <Image src={heroBackdrop} alt="" fill className={cn(css.bgImage)} priority placeholder="blur" />
      </div>

      <ShootingStars minDelay={6000} maxDelay={12000} minSpeed={1} maxSpeed={2} />

      {/* Firefly particles — bottom */}
      <div className={css.particles}>
        <Fireflies
          id="ticket-fireflies"
          settings={{
            count: typeof window !== 'undefined' && window.innerWidth <= 600 ? 75 : 120,
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
      <div className={cn(css.cardStack, { [css.animating]: isAnimating, [css.frontShowing]: frontIndex === 0 })}>
        {/* Card 0: Ticket front */}
        <div
          className={cn(cardClass(0), css.ticketShadowWrap)}
          onPointerDown={frontIndex === 0 ? handlePointerDown : undefined}
        >
          <div className={css.ticketPunch}>
            <Image src={ticketFront} alt={`${name}'s Devcon ticket`} className={css.ticketImage} placeholder="blur" />
            <div className={cn(css.ticketContent, { [css.noAvatar]: !hasAvatar })}>
              <div className={css.attendeeRow}>
                {hasAvatar && (
                  <div className={css.avatarCircle}>
                    <img
                      src={avatarUrl!}
                      alt={`${name}'s avatar`}
                      className={css.avatarImage}
                      onError={handleAvatarError}
                    />
                  </div>
                )}
                <div className={css.attendeeInfo}>
                  <span className={css.attendeeName}>{name || 'Anon'}</span>
                  <span className={css.ticketType}>is attending Devcon India</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 1: Ticket back */}
        <div
          className={cn(cardClass(1), css.backsideShadowWrap)}
          onPointerDown={frontIndex === 1 ? handlePointerDown : undefined}
        >
          <div className={css.backsideInner}>
            <Image src={ticketBack} alt="Devcon ticket details" className={css.ticketImage} placeholder="blur" />
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

      {/* CTA actions */}
      <div className={css.actions}>
        {share ? (
          (() => {
            const baseShareUrl = pageUrl?.replace(/\?share$/, '').replace(/\?share&/, '?').replace(/&share\b/, '').replace(/\/$/, '') || ''
            const shareUrl = `${baseShareUrl}/`
            const shareText = `I'm heading to Devcon India from 3–6 November in Mumbai!\n\nJoin me and the wider Ethereum community for a week of incredible talks, workshops, experiences and more!`
            return (
              <div className={css.shareSection}>
                <span className={css.shareLabel}>Share</span>
                <div className={css.shareIcons}>
                  <a
                    href="#"
                    onClick={e => {
                      e.preventDefault()
                      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
                    }}
                    className={css.shareIcon}
                  >
                    <IconTwitter />
                  </a>
                  <a
                    href="#"
                    onClick={e => {
                      e.preventDefault()
                      window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`, '_blank')
                    }}
                    className={css.shareIcon}
                  >
                    <IconWarpcast />
                  </a>
                  <button
                    className={css.shareIcon}
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    <Copy size={20} />
                  </button>
                </div>
                {copied && <span className={css.copiedToast}>Copied!</span>}
              </div>
            )
          })()
        ) : (
          <Link
            href="/tickets"
            className={cn(css.ctaButton, 'select-none')}
            style={{ '--color-icon': '#f9f8fa' } as React.CSSProperties}
          >
            Get tickets
            <IconArrowRight />
          </Link>
        )}
      </div>

      {/* Gyro prompt — pinned to bottom */}
      {showGyroPrompt && (
        <button onClick={handleEnableGyro} className={css.gyroButton}>
          Enable motion effects
        </button>
      )}

      {/* Vignette shadow around edges */}
      <div className={css.vignette} />
    </div>
  )
}
