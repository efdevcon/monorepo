import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import cn from 'classnames'
import { useTilt } from '../ticket-sharing/useTilt'
import kvBackdrop from 'components/common/dc-8/hero/images/devcon-8-india-bg.png'
// Glow baked into the PNG — live drop-shadow filters tanked the frame rate.
import heroLogo from './images/dc8-india-logo-glow.png'
import cardLogo from '../ticket-sharing/updated-dc8-logo.png'
import IconTwitter from 'assets/icons/twitter.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'
import { ArrowRight, Copy } from 'lucide-react'
import { getDc8TrackBadgePath, DC8_CLS_BADGE } from 'services/social-cards/track-images'
import css from './session-sharing.module.scss'
import { Fireflies } from 'components/common/dc-8/hero/fireflies'

/**
 * Devcon 8 session-share page body, used by /schedule/devcon8/{code}.
 * Figma: Dev Handoff 5058:2837 / 3511 / 4860 / 5060:6752 (scenes) +
 * 5058:3193 / 3624 / 4774 / 5068:4650 (card variants, round 2 2026-08-28).
 * The KV scene keeps the tilt/parallax interaction from the
 * ticket share page (useTilt is shared); the card itself is CSS-built at a
 * 1200×675 basis — see session-sharing.module.scss.
 *
 * One deliberate deviation from the frames: the third share button is
 * copy-link (the design shows Instagram, which has no web share intent).
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

// Format labels seen across DC7/DC8 Pretalx data, longest first so
// "Lightning Talk" wins over "Talk" in the ends-with match below.
const CLS_FORMATS = ['Lightning Talk', 'Mixed Formats', 'Workshop', 'Panel', 'Music', 'Talk']

export function SessionSharing({ talk, pageUrl }: SessionSharingProps) {
  const { containerRef, requestGyroPermission } = useTilt()
  const [showGyroPrompt, setShowGyroPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  // Avatars that 404/error collapse out of the stack (the no-PFP card variant
  // is just "every avatar collapsed").
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set())

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

  const speakersWithAvatar = talk.speakers.filter(s => s.avatar && !failedAvatars.has(s.name))
  const speakerNames = talk.speakers.map(s => s.name).join(', ')

  // Community-Led Sessions: Pretalx marks the track "[CLS] - <name>" (DC7 used
  // "[CLS] <name>") and the type "CLS - <name> <format>". Same detection as the
  // OG route. Render "CLS – <format>" (en dash, per Figma 5071:5814) + the CLS
  // name, and the Devcon logomark in place of track art.
  const isCls = !!talk.track?.startsWith('[CLS]')
  const clsFormat = CLS_FORMATS.find(f => talk.type.endsWith(f)) ?? talk.type.split(' ').pop()
  const displayType = isCls && clsFormat ? `CLS – ${clsFormat}` : talk.type
  const displayTrack = isCls ? talk.track.replace(/^\[CLS\]\s*-?\s*/, '') : talk.track
  // The card spec is authored for ~3-line titles — downscale longer ones.
  const titleClass = talk.title.length > 150 ? css.cardTitleLong : talk.title.length > 90 ? css.cardTitleMedium : undefined

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

      {/* Tilting session card (1200×675 spec, all sizes in cqi) */}
      <div className={css.cardStack}>
        <div className={css.card}>
          <div className={css.cardInner}>
            {/* Octagon badge cropped to its 440px Figma window (zoom trims the
                PNG's transparent padding); the card corner clips the rest.
                CLS swaps it for the Devcon logomark (Figma 5071:5855). */}
            {isCls ? (
              <div className={css.cardClsMark}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/social/${DC8_CLS_BADGE}`} alt="" />
              </div>
            ) : (
              <div className={css.cardBadge}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/social/${getDc8TrackBadgePath(talk.track)}`} alt="" />
              </div>
            )}
            <Image src={cardLogo} alt="Devcon 8 India" className={css.cardLogo} />
            <div className={css.cardMumbai}>
              <span>MUMBAI, INDIA</span>
              <span>
                <em>3—6</em> Nov, 2026
              </span>
            </div>
            <div className={css.cardHeading}>
              <h1 className={cn(css.cardTitle, titleClass)}>{talk.title}</h1>
              {speakerNames && <p className={css.speakerNames}>{speakerNames}</p>}
            </div>
            <div className={cn(css.cardFooter, talk.speakers.length > 4 && css.manySpeakers)}>
              {speakersWithAvatar.length > 0 && (
                <div className={css.avatarStack}>
                  {speakersWithAvatar.map(s => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={s.name}
                      src={s.avatar}
                      alt=""
                      className={css.avatar}
                      onError={() => setFailedAvatars(prev => new Set(prev).add(s.name))}
                    />
                  ))}
                </div>
              )}
              <div className={css.trackPill}>
                {displayType && <span className={css.typeChip}>{displayType}</span>}
                {displayTrack && <span className={css.trackName}>{displayTrack}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={css.bottomFade} />

      {/* Get tickets CTA + share actions, aligned to the card's width */}
      <div className={css.actions}>
        <Link href="/tickets" className={cn(css.ctaButton, 'select-none')}>
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
