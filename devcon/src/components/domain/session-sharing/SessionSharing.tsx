import React, { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import cn from 'classnames'
import { useTilt } from '../ticket-sharing/useTilt'
import kvBackdrop from 'components/common/dc-8/hero/images/devcon-8-india-bg.png'
// Glow baked into the PNG — live drop-shadow filters tanked the frame rate.
import heroLogo from './images/dc8-india-logo-glow.png'
import IconTwitter from 'assets/icons/twitter.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'
import { ArrowRight, Copy } from 'lucide-react'
import css from './session-sharing.module.scss'
import { Fireflies } from 'components/common/dc-8/hero/fireflies'

/**
 * Devcon 8 session-share page body, used by /schedule/devcon8/{code}.
 * Figma: Dev Handoff 5071:6944 (scene). The card IS the rendered social
 * image (/api/social/schedule) so the sharing page, link embeds, and the
 * YouTube archive all show one consistent card; the scene keeps the
 * tilt/parallax interaction from the ticket share page (useTilt is shared).
 *
 * One deliberate deviation from the frames: the third share button is
 * copy-link (the design shows Instagram, which has no web share intent).
 */

export interface SessionShareTalk {
  id: string
  title: string
}

interface SessionSharingProps {
  talk: SessionShareTalk
  pageUrl: string
  /** Same-origin path of the rendered card (matches the <Head> preload). */
  cardImageUrl: string
}

export function SessionSharing({ talk, pageUrl, cardImageUrl }: SessionSharingProps) {
  const { containerRef, requestGyroPermission } = useTilt()
  const [showGyroPrompt, setShowGyroPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  // The social-card render can take seconds on a cold hit, so the card shows
  // the familiar gradient placeholder first: 'loading' shimmers, 'loaded'
  // fades the image in, 'failed' settles on the bare gradient (no endless
  // shimmer, no broken-image glyph).
  const [cardState, setCardState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const cardImageRef = useRef<HTMLImageElement | null>(null)

  // The <img> is server-rendered and the <Head> preload warms the very same
  // URL, so its `load` event usually fires BEFORE React hydrates and attaches
  // onLoad — the handler then never runs and the card stays invisible for
  // good (the faster the image, the more certain the blank card). Re-check
  // `complete` on mount; onLoad still covers the genuinely-slow renders.
  useEffect(() => {
    const img = cardImageRef.current
    if (!img?.complete) return
    setCardState(img.naturalWidth > 0 ? 'loaded' : 'failed')
  }, [])

  useEffect(() => {
    // Same treatment as TicketSharing: no elastic overscroll, notch colored
    // like the scene, restored on unmount.
    const prevBodyBg = document.body.style.backgroundColor
    const prevHtmlBg = document.documentElement.style.backgroundColor
    document.body.style.overscrollBehavior = 'none'
    document.body.style.backgroundColor = '#221144'
    document.documentElement.style.overscrollBehavior = 'none'
    document.documentElement.style.backgroundColor = '#221144'

    const DOE = DeviceOrientationEvent as any
    if (typeof DOE?.requestPermission === 'function') {
      const accepted = localStorage.getItem('gyro-accepted')
      if (accepted === 'true') {
        DOE.requestPermission()
          .then((state: string) => {
            if (state === 'granted') requestGyroPermission()
            else setShowGyroPrompt(true)
          })
          .catch(() => {
            localStorage.removeItem('gyro-accepted')
            setShowGyroPrompt(true)
          })
      } else {
        setShowGyroPrompt(true)
      }
    }

    return () => {
      document.body.style.overscrollBehavior = ''
      document.body.style.backgroundColor = prevBodyBg
      document.documentElement.style.overscrollBehavior = ''
      document.documentElement.style.backgroundColor = prevHtmlBg
    }
  }, [requestGyroPermission])

  const handleEnableGyro = useCallback(async () => {
    setShowGyroPrompt(false)
    const granted = await requestGyroPermission()
    if (granted) localStorage.setItem('gyro-accepted', 'true')
  }, [requestGyroPermission])

  // Matomo campaign tagging per channel (same convention as TicketSharing).
  const shareUrlFor = (source: string) => `${pageUrl}?mtm_campaign=speaker-share&mtm_source=${source}&mtm_medium=social`
  const shareText = `I'm speaking at @EFDevcon 8!\n\n"${talk.title}"\n\nJoin me in Mumbai 🇮🇳 November 3-6, 2026.`
  const xText = `${shareText}\n\n${shareUrlFor('twitter')}`

  return (
    <div ref={containerRef} className={css.container}>
      <div className={css.bgLayer}>
        <Image src={kvBackdrop} alt="" fill className={css.bgImage} priority placeholder="blur" />
      </div>

      <div className={css.particles}>
        <Fireflies
          id="session-fireflies"
          settings={{
            count: typeof window !== 'undefined' && window.innerWidth <= 600 ? 90 : 150,
            color: 'rgba(139, 255, 255, 0.65)',
            speed: 0.15,
            radius: 2,
          }}
        />
      </div>

      <div className={css.aboveCard}>
        <Image src={heroLogo} alt="Devcon 8 India" className={css.heroLogo} priority />
      </div>

      {/* Tilting session card: the rendered social image (1200×630), same
          asset link embeds and the YouTube archive use. Relative URL so dev
          and previews hit their own render; in production it's the same URL
          the <Head> preload already warmed. */}
      <div className={css.cardStack}>
        <div className={css.card}>
          <div
            className={cn(
              css.cardInner,
              cardState !== 'loading' && css.cardSettled,
              cardState === 'loaded' && css.cardLoaded
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={cardImageRef}
              src={cardImageUrl}
              alt={talk.title}
              className={css.cardImage}
              onLoad={() => setCardState('loaded')}
              // A failed render (cold-start timeout, unsynced session) must
              // not leave the shimmer running forever — settle on the plain
              // gradient placeholder instead.
              onError={() => setCardState('failed')}
            />
          </div>
        </div>
      </div>

      <div className={css.bottomFade} />

      {/* Get tickets CTA + share actions, aligned to the card's width */}
      <div className={css.actions}>
        <Link href="/tickets" passHref className={cn(css.ctaButton, 'select-none')}>
          Get tickets
          <ArrowRight />
        </Link>
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
                window.open(
                  `https://farcaster.xyz/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(
                    shareUrlFor('farcaster')
                  )}`,
                  '_blank'
                )
              }}
              className={css.shareIcon}
            >
              <IconWarpcast />
            </a>
            <button
              className={css.shareIcon}
              onClick={() => {
                navigator.clipboard.writeText(shareUrlFor('copy'))
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              <Copy size={20} />
            </button>
          </div>
          {copied && <span className={css.copiedToast}>Copied!</span>}
        </div>
      </div>

      {showGyroPrompt && (
        <button onClick={handleEnableGyro} className={css.gyroButton}>
          Enable motion effects
        </button>
      )}
    </div>
  )
}
