import React from 'react'
import Image from 'next/image'
import BannerImage from './images/devcon-8-india-bg.png'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconTelegram from 'assets/icons/telegram.svg'
import IconEmail from 'assets/icons/ui-email.svg'
import { Link } from 'components/common/link'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { DEVCON_IX_ANNOUNCEMENT_URL } from 'config/devconIx'
import { useTranslations } from 'next-intl'
import { DevconIxTerminal } from './DevconIxTerminal'

// Post-event hero (Figma Current-work 6068:341). The ticket/app CTAs, the
// "Going to Devcon?" phone and its eyebrow are gone; the right column is the
// Devcon IX terminal (428×355) with a VT323 "Boot the announcement" caption,
// both one link to the announcement. The DC8 logo + "Mumbai, India" that
// Figma puts above the social card are gone too (the video carries the
// branding) — an sr-only h1 keeps the page heading. Figma only draws 1440:
// below md the terminal (capped at 300px) and social card stack centred; md
// gets the two-column grid at a 320px terminal, lg the full 428px.
//
// Backdrop: a 12s muted loop cut from the recap (public/dc8/hero-loop.*,
// 1920×1080, WebM + H.264) over the key art, which stays as the poster /
// fallback and is all that shows under prefers-reduced-motion. Only the
// bottom fade remains (128px) so the footage runs edge to edge. Phones get
// 90svh (small viewport, so it reads as 90% of what is actually visible).

export const Hero = () => {
  const t = useTranslations('home.hero')
  const stripHeight = useGetElementHeight('strip')

  return (
    <div className="relative w-full h-[90svh] md:h-screen overflow-hidden">
      {/* Background image */}
      <Image
        src={BannerImage}
        alt={t('bg_alt')}
        fill
        priority
        placeholder="blur"
        className="object-cover object-center"
        style={{ paddingTop: stripHeight }}
      />
      {/* `muted` is set imperatively too: React has historically dropped the
          attribute from server markup, and iOS refuses to autoplay without it. */}
      <video
        ref={el => {
          if (el) el.muted = true
        }}
        className="absolute inset-0 h-full w-full object-cover object-center motion-reduce:hidden"
        style={{ paddingTop: stripHeight }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      >
        <source src="/dc8/hero-loop.webm" type="video/webm" />
        <source src="/dc8/hero-loop.mp4" type="video/mp4" />
      </video>

      {/* Bottom fade into the page background */}
      <div
        className="absolute bottom-0 left-0 w-full h-[128px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(34,17,68,1) 4.5%, rgba(34,17,68,0) 100%)' }}
      />

      <h1 className="sr-only">{t('location')}</h1>

      {/* Hero content at bottom (Figma 6068:354: 1312 wide, 56px up, columns
          bottom-aligned and pushed apart). Mobile: one centred column —
          terminal, then social card. md+: two columns, bottom-aligned — the
          social card stretches across the left, the terminal on the right. */}
      <div className="absolute bottom-0 left-0 right-0 pb-[40px] lg:pb-[56px]">
        <div className="section">
          <div className="flex flex-col items-center gap-[24px] md:grid md:grid-cols-[auto_320px] lg:grid-cols-[auto_428px] md:items-end md:justify-between md:gap-x-[32px]">
            {/* Devcon IX terminal + caption (Figma 6068:574), with the old
                phone's cursor tilt. */}
            <DevconIxTerminal
              href={DEVCON_IX_ANNOUNCEMENT_URL}
              alt={t('terminal_alt')}
              caption={t('announcement_cta')}
              className="w-full max-w-[300px] md:w-[320px] md:max-w-none lg:w-[428px] md:col-start-2 md:row-start-1 md:self-end md:justify-self-end"
            />

            {/* Social links (Figma 6068:552: full width of the left column) */}
            <div className="w-full md:col-start-1 md:row-start-1 backdrop-blur-[3px] bg-[rgba(26,13,51,0.8)] border border-solid border-[rgba(255,255,255,0.1)] rounded-[8px] px-[16px] py-[8px] flex items-center justify-between gap-[16px] [&_path]:!fill-white">
              <p className="text-[14px] text-white leading-[20px] whitespace-nowrap">{t('follow_for_updates')}</p>
              <div className="flex gap-[16px] items-center">
                <Link to="https://x.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                  <IconX className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://instagram.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                  <IconInstagram className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://t.me/+sitvvHw8D8EzN2Yx" className="text-white hover:text-white/80 transition-colors">
                  <IconTelegram className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://paragraph.com/@efevents" className="text-white hover:text-white/80 transition-colors">
                  <IconEmail className="w-[18px] h-[18px]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
