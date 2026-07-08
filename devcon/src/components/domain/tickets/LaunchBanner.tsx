import React from 'react'
import NextLink from 'next/link'
import Image from 'next/image'
import DevconGlyph from './eth-glyph.png'
import { useTranslations } from 'next-intl'
import { useFeaturedWave, useGaSaleState, useTicketsStoreUrl } from 'hooks/useWaveStates'
import { useNow } from 'hooks/useNow'

// "JUL 14" / "16:00" (UTC) — second eyebrow line under GLOBAL TICKET LAUNCH.
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const HOUR_FORMATTER = new Intl.DateTimeFormat('en', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

function getCountdownParts(target: Date, now: Date) {
  const remaining = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  return {
    days: Math.floor(remaining / 86_400),
    hours: Math.floor((remaining % 86_400) / 3_600),
    mins: Math.floor((remaining % 3_600) / 60),
    secs: remaining % 60,
  }
}

// Figma renders countdown numbers unpadded ("7 days", "0 hours") at 32px
// ExtraBold; the fixed cell width keeps the row from jittering as digits tick.
function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex w-14 flex-col items-center justify-center text-center">
      <p className="text-[32px] font-extrabold leading-none tracking-[-0.5px] text-white">{value}</p>
      <p className="text-base font-normal leading-6 text-[#9188a2]">{label}</p>
    </div>
  )
}

function CountdownSeparator() {
  return <div aria-hidden className="h-4 w-px bg-[#9188a2]/50" />
}

/**
 * LaunchBanner — the top banner on /tickets. Two states driven by the
 * featured wave's schedule:
 *
 *   before launch (status 'countdown', Figma node 4663:11215):
 *     "GLOBAL TICKET LAUNCH 14 JULY" eyebrow + "$499 ETH / Includes 18% GST"
 *     on the left, big countdown cells in the middle, purple "Remind me"
 *     button (add-to-calendar popover) on the right.
 *
 *   during launch (status 'live', Figma node 4663:21475):
 *     "General Admission tickets on sale!" headline, price bullets,
 *     "$499 ETH / Includes 18% GST" price block + purple "Get tickets" CTA.
 *
 * Preview the live state at /tickets?mockNow=launch (see hooks/useNow).
 */
export function LaunchBanner() {
  const t = useTranslations('tickets.sale_banner')
  const { featured, mounted } = useFeaturedWave()
  const saleState = useGaSaleState()
  const now = useNow()
  const storeUrl = useTicketsStoreUrl()

  // Only shown for the 'open' sale state (the global-launch countdown before it
  // opens, then the live "on sale" card). The 'coming-soon' / 'closed' states
  // show no launch banner — their status rides on the strip + GA table instead.
  if (!mounted || !featured || saleState !== 'open') return null

  const { wave, status, upcoming } = featured
  const showCountdown = status === 'countdown' && upcoming && now
  const showLive = status === 'live'
  const parts = showCountdown ? getCountdownParts(upcoming, now) : null

  // "JUL 14, 16:00 UTC" — derived from the wave's opening windows so the
  // banner tracks config/waves.ts; multiple same-day windows join with " & ".
  const openTimes = wave.openTimes ?? []
  const launchDateLine =
    openTimes.length > 0
      ? `${DAY_MONTH_FORMATTER.format(openTimes[0]).toUpperCase()}, ${openTimes
          .map(d => HOUR_FORMATTER.format(d))
          .join(' & ')} UTC`
      : null

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-solid border-[#ffa366] shadow-[0_20px_25px_-5px_rgba(22,11,43,0.1),0_8px_10px_-6px_rgba(22,11,43,0.1)]"
      style={{ background: 'linear-gradient(180deg, #1A0D33 0%, #45326C 100%)' }}
    >
      {/* Devcon logomark watermark — right-anchored pre-launch, centered
          once live, per the respective Figma frames. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 flex items-center ${
          showLive ? 'inset-x-0 justify-center' : 'right-0'
        }`}
      >
        <Image
          src={DevconGlyph}
          alt=""
          className={`h-[354px] w-[208px] select-none opacity-10 ${showLive ? '' : 'translate-x-1/2'}`}
        />
      </div>

      {showLive ? (
        /*
          During launch — Figma node 4663:21475:
            – mobile  (<md): vertical stack; price block + CTA below title.
            – desktop (md+): title/subtitle left, price block + CTA right.
        */
        <div className="relative flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:gap-8 md:px-8 md:py-6">
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-extrabold leading-none tracking-[-1px] text-white [text-shadow:0_1px_2px_rgba(34,17,68,0.2)] md:text-[32px]">
              {t('heading')}
            </p>
            <p className="text-sm leading-none text-[#f2f1f4]">{t('subheading')}</p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
            <div className="flex flex-row items-center justify-between gap-2 md:flex-col md:items-end">
              <p className="text-2xl font-extrabold leading-none tracking-[-1px] text-white [text-shadow:0_1px_2px_rgba(34,17,68,0.2)] md:text-[32px]">
                {t('price')}
              </p>
              <p className="text-sm leading-none text-[#f2f1f4] md:text-right">{t('price_note')}</p>
            </div>
            <NextLink
              href={storeUrl}
              className="inline-flex h-12 min-h-9 w-full items-center justify-center whitespace-nowrap rounded-full border border-solid border-[#7235ed] bg-[#7235ed] px-8 py-4 text-xl font-bold leading-none text-[#f9f8fa] transition-colors hover:bg-[#6028cc] md:w-auto"
            >
              {t('cta')}
            </NextLink>
          </div>
        </div>
      ) : (
        /*
          Before launch — Figma node 4663:11215 (no CTA):
            – mobile  (<lg): vertical stack; eyebrow + price on top,
                            countdown spanning full width below.
            – desktop (lg+): eyebrow + price anchored left, countdown
                            centered across the banner.
        */
        <div className="relative flex flex-col gap-4 p-6 lg:min-h-[62px] lg:px-8 lg:py-5">
          {/* Left: two-line launch eyebrow + price */}
          <div className="flex flex-col gap-2 lg:absolute lg:left-8 lg:top-1/2 lg:-translate-y-1/2">
            <p className="text-sm font-semibold leading-[1.2] tracking-[2px] text-[#ffa366]">
              {t('launch_eyebrow')}
              {launchDateLine && (
                <>
                  <br />
                  {launchDateLine}
                </>
              )}
            </p>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <p className="text-xl font-extrabold leading-5 text-white">{t('price_countdown')}</p>
              <p className="text-sm leading-none text-[#dddae2]">{t('price_note')}</p>
            </div>
          </div>

          {/* Countdown — centered on desktop, full-width row on mobile */}
          {parts && (
            <div className="flex w-full items-center justify-between gap-4 sm:justify-center sm:gap-6">
              <CountdownCell value={parts.days} label="days" />
              <CountdownSeparator />
              <CountdownCell value={parts.hours} label="hours" />
              <CountdownSeparator />
              <CountdownCell value={parts.mins} label="mins" />
              <CountdownSeparator />
              <CountdownCell value={parts.secs} label="secs" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
