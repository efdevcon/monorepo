import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import cn from 'classnames'
import { useTilt } from '../ticket-sharing/useTilt'
import heroBackdrop from '../ticket-sharing/occluded.png'
import devconLogo from '../ticket-sharing/updated-dc8-logo.png'
import cardArt from '../ticket-sharing/ticket-backside.png'
import IconArrowRight from 'assets/icons/arrow_right.svg'
import IconTwitter from 'assets/icons/twitter.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'
import { Copy } from 'lucide-react'
import css from '../ticket-sharing/ticket-sharing.module.scss'
import { ShootingStars } from '../ticket-sharing/ShootingStars'
import { Fireflies } from 'components/common/dc-8/hero/fireflies'

/**
 * Devcon 8 styled session-share page body — the speaker-card counterpart of
 * TicketSharing (same cosmic scene, same card treatment, same share actions),
 * used by /schedule/devcon8/{code}. Assets and styles are reused from
 * ticket-sharing so the two pages stay visually in lockstep.
 */

export interface SessionShareTalk {
  id: string
  title: string
  type: string
  track: string
  speakers: { name: string; avatar: string }[]
}

interface SessionSharingProps {
  talk: SessionShareTalk
  pageUrl: string
}

export function SessionSharing({ talk, pageUrl }: SessionSharingProps) {
  const { containerRef, requestGyroPermission } = useTilt()
  const [showGyroPrompt, setShowGyroPrompt] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Same treatment as TicketSharing: no elastic overscroll, notch colored
    // like the scene, restored on unmount.
    const prevBodyBg = document.body.style.backgroundColor
    const prevHtmlBg = document.documentElement.style.backgroundColor
    document.body.style.overscrollBehavior = 'none'
    document.body.style.backgroundColor = '#1a0a3e'
    document.documentElement.style.overscrollBehavior = 'none'
    document.documentElement.style.backgroundColor = '#1a0a3e'

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

  const meta = [talk.type, talk.track].filter(Boolean).join(' · ')
  // Matomo campaign tagging per channel (same convention as TicketSharing).
  const shareUrlFor = (source: string) => `${pageUrl}?mtm_campaign=speaker-share&mtm_source=${source}&mtm_medium=social`
  const shareText = `I'm speaking at @EFDevcon 8!\n\n"${talk.title}"\n\nJoin me in Mumbai 🇮🇳 November 3-6, 2026.`
  const xText = `${shareText}\n\n${shareUrlFor('twitter')}`

  return (
    <div ref={containerRef} className={css.container}>
      <div className={`${css.bgLayer} ${css.bgSlow}`}>
        <Image src={heroBackdrop} alt="" fill className={cn(css.bgImage)} priority placeholder="blur" />
      </div>

      <ShootingStars minDelay={6000} maxDelay={12000} minSpeed={1} maxSpeed={2} />

      <div className={css.particles}>
        <Fireflies
          id="session-fireflies"
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

      {/* Single tilting card, styled like the ticket's text card */}
      <div className={cn(css.cardStack, css.frontShowing)}>
        <div className={cn(css.card, css.cardFront, css.backsideShadowWrap)}>
          <div className={css.backsideInner}>
            <Image src={cardArt} alt="" className={css.ticketImage} placeholder="blur" />
            <div className={css.backsideContent}>
              {meta && <p className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-70">{meta}</p>}
              <h2 className={css.backsideTitle}>{talk.title}</h2>
              {talk.speakers.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {talk.speakers.map(s => (
                    <div key={s.name} className="flex items-center gap-2.5">
                      {s.avatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatar}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <span className="text-sm font-medium text-white">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className={cn(css.backsideDescription, 'mt-4')}>Devcon 8 · Mumbai, India · November 3 - 6, 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share actions + tickets CTA */}
      <div className={css.actions}>
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
        <Link
          href="/tickets"
          // The shared .actions column has no internal gap (the ticket page
          // shows share OR cta, never both) — separate them here.
          className={cn(css.ctaButton, 'select-none', 'mt-10')}
          // Cast via any: the repo currently resolves two csstype versions, and
          // custom properties trip the mismatch (same class of error as the
          // pre-existing WritingText/SpeakerDetailOverlay ones).
          style={{ '--color-icon': '#f9f8fa' } as any}
        >
          Get tickets
          <IconArrowRight />
        </Link>
      </div>

      {showGyroPrompt && (
        <button onClick={handleEnableGyro} className={css.gyroButton}>
          Enable motion effects
        </button>
      )}

      <div className={css.vignette} />
    </div>
  )
}
