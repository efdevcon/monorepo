import React, { useState, useCallback, useEffect, useRef } from 'react'
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
  paidWithEth?: boolean
}

export function TicketSharing({ name, avatarUrl, share, pageUrl, paidWithEth }: TicketSharingProps) {
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
  const [avatarLoaded, setAvatarLoaded] = useState(false)
  // Stays `true` for ~350ms after `avatarError` flips on so the slot can
  // play its collapse animation, then gets unmounted from the DOM (which
  // removes the leftover margin/gap as well).
  const [avatarSlotMounted, setAvatarSlotMounted] = useState(true)
  const avatarRef = useRef<HTMLImageElement | null>(null)
  const handleAvatarError = useCallback(() => setAvatarError(true), [])
  const handleAvatarLoad = useCallback(() => setAvatarLoaded(true), [])

  // Catch the race where a cached (or preloaded) avatar finishes loading
  // *before* React's `onLoad` handler is attached — the event fires but
  // nothing listens, so `avatarLoaded` would stay false and the image
  // would stay at opacity 0. Inspect `img.complete + naturalWidth > 0`
  // post-mount to recover from that case.
  useEffect(() => {
    const img = avatarRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      setAvatarLoaded(true)
    }
  }, [avatarUrl])

  // Once the avatar errors out, let the CSS collapse animation play, then
  // unmount the slot so the row no longer reserves space (and the right
  // margin disappears in the same beat as the slot itself).
  useEffect(() => {
    if (!avatarError) return
    const t = setTimeout(() => setAvatarSlotMounted(false), 360)
    return () => clearTimeout(t)
  }, [avatarError])

  const showAvatarSlot = !!avatarUrl && avatarSlotMounted

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
            <div className={css.ticketContent}>
              <div className={css.attendeeRow}>
                {showAvatarSlot && (
                  <div
                    className={cn(css.avatarCircle, {
                      [css.loaded]: avatarLoaded,
                      [css.errored]: avatarError,
                    })}
                  >
                    <img
                      ref={avatarRef}
                      src={avatarUrl!}
                      alt={`${name}'s avatar`}
                      className={css.avatarImage}
                      onLoad={handleAvatarLoad}
                      onError={handleAvatarError}
                      // The image is preloaded in <Head> via `<link rel="preload">`,
                      // so by the time React renders this element the bytes are
                      // usually already cached. Eager loading + sync decode keeps
                      // the paint on the same frame as the rest of the ticket.
                      loading="eager"
                      decoding="sync"
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
            const shareText = `I just got my @EFDevcon ticket${paidWithEth ? ' — paid for with ETH!' : '!'}\n\nNext stop: Mumbai 🇮🇳 Join me at Devcon 8 from November 3–6, 2026 for four days of big ideas, technical depth, community, and the people building the future of open source technology.`
            const xText = `${shareText}\n\n${shareUrl}`
            return (
              <div className={css.shareSection}>
                <span className={css.shareLabel}>Share</span>
                <div className={css.shareIcons}>
                  <a
                    href="#"
                    onClick={e => {
                      e.preventDefault()
                      window.open(`https://x.com/intent/post?text=${encodeURIComponent(xText)}`, '_blank')
                    }}
                    className={css.shareIcon}
                  >
                    <IconTwitter />
                  </a>
                  <a
                    href="#"
                    onClick={e => {
                      e.preventDefault()
                      window.open(`https://farcaster.xyz/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`, '_blank')
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
