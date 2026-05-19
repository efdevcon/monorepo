import React from 'react'
import NextLink from 'next/link'
import Image from 'next/image'
import DevconGlyph from './eth-glyph.png'
import { useTranslations } from 'next-intl'
import { useFeaturedWave, useTicketsStoreUrl } from 'hooks/useWaveStates'
import { useNow } from 'hooks/useNow'

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const HOUR_FORMATTER = new Intl.DateTimeFormat('en', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

// "AVAILABLE JUN 15, 02:00 & 16:00 UTC" — joins multiple opening windows on
// the same day with " & " so a single eyebrow covers both timezones. Past
// rounds get struck through once the NEXT round has started; the currently-
// selling round (most-recent past time when isLive) stays solid.
function AvailableEyebrow({ times, now, isLive }: { times: Date[]; now: Date | null; isLive: boolean }) {
  if (times.length === 0) return null
  const dayMonth = DAY_MONTH_FORMATTER.format(times[0]).toUpperCase()

  // Index of the round currently considered "live" — only set when the wave
  // is actually live. Between rounds the wave is in countdown state and every
  // past round is treated as finished.
  let liveIdx = -1
  if (isLive && now) {
    for (let i = times.length - 1; i >= 0; i--) {
      if (times[i].getTime() <= now.getTime()) {
        liveIdx = i
        break
      }
    }
  }

  return (
    <p className="text-sm font-semibold leading-none tracking-[2px] text-[#ffa366]">
      {`AVAILABLE ${dayMonth}, `}
      {times.map((d, i) => {
        const isPast = now ? d.getTime() <= now.getTime() : false
        const strike = isPast && i !== liveIdx
        return (
          <React.Fragment key={i}>
            {i > 0 && ' & '}
            <span className={strike ? 'line-through opacity-60' : ''}>{HOUR_FORMATTER.format(d)}</span>
          </React.Fragment>
        )
      })}
      {' UTC'}
    </p>
  )
}

function getCountdownParts(target: Date, now: Date) {
  const remaining = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  return {
    days: Math.floor(remaining / 86_400),
    hours: Math.floor((remaining % 86_400) / 3_600),
    mins: Math.floor((remaining % 3_600) / 60),
    secs: remaining % 60,
  }
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex w-14 flex-col items-center justify-center text-center">
      <p className="text-[28px] font-extrabold leading-none tracking-[-0.5px] text-white">
        {value.toString().padStart(2, '0')}
      </p>
      <p className="text-base font-normal leading-6 text-[#9188a2]">{label}</p>
    </div>
  )
}

function CountdownSeparator() {
  return <div aria-hidden className="h-4 w-px bg-[#9188a2]/50" />
}

export function EarlyBirdSaleBanner() {
  const t = useTranslations('tickets.sale_banner')
  const { featured, mounted } = useFeaturedWave()
  const now = useNow()
  const storeUrl = useTicketsStoreUrl()

  if (!mounted || !featured) return null

  const { wave, status, upcoming } = featured
  const showCountdown = status === 'countdown' && upcoming && now
  const showLive = status === 'live'
  const parts = showCountdown ? getCountdownParts(upcoming, now) : null

  const priceNote = t('price_note')
  // Combine the static GST note with the wave-specific banner bullets so the
  // mobile <ul> and the desktop inline string share a single source.
  const bullets = [priceNote, ...(wave.bannerBullets ?? [])]

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-solid border-[#ffa366] shadow-[0_20px_25px_-5px_rgba(22,11,43,0.1),0_8px_10px_-6px_rgba(22,11,43,0.1)]"
      style={{ background: 'linear-gradient(180deg, #1A0D33 0%, #45326C 100%)' }}
    >
      {/* Devcon glyph watermark, anchored to the right edge. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
        <Image
          src={DevconGlyph}
          alt=""
          className="h-[354px] w-[208px] translate-x-12 select-none opacity-10"
        />
      </div>

      {/*
        Layout:
          – mobile  (<md): vertical stack; bullets as real <ul>; countdown
                          spans full width (justify-between); CTA full-width
                          below countdown.
          – tablet  (md–lg): vertical stack; bullets inline; countdown +
                            CTA share one row (CTA stretches).
          – desktop (lg+):   horizontal row; bullets inline single line.
      */}
      <div className="relative flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8 lg:py-5">
        {/* Left content */}
        <div className="flex flex-col gap-2 lg:whitespace-nowrap">
          <AvailableEyebrow times={wave.openTimes ?? []} now={now} isLive={showLive} />
          <div className="flex w-full items-center justify-between gap-6">
            <p className="text-xl font-extrabold leading-5 text-white">{wave.name}</p>
            <div className="flex items-center gap-2">
              {wave.id === 'eth-early-bird' && (
                <p className="text-base font-extrabold leading-4 text-[#9188a2] line-through">
                  {t('price_original')}
                </p>
              )}
              <p className="text-xl font-extrabold leading-5 text-white">{wave.price}</p>
            </div>
          </div>

          {/* Mobile bullets — real <ul> with discs */}
          <ul className="ml-5 flex list-disc flex-col text-sm leading-[1.5] text-[#f2f1f4] md:hidden">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>

          {/* Tablet/desktop bullets — inline single line, • separated */}
          <p className="hidden text-sm leading-[1.5] text-[#f2f1f4] md:block lg:text-xs lg:leading-none">
            {bullets.join(' • ')}
          </p>
        </div>

        {/* Right: countdown + CTA */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-4 lg:gap-8">
          {showCountdown && parts && (
            <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start md:gap-6">
              <CountdownCell value={parts.days} label="days" />
              <CountdownSeparator />
              <CountdownCell value={parts.hours} label="hours" />
              <CountdownSeparator />
              <CountdownCell value={parts.mins} label="mins" />
              <CountdownSeparator />
              <CountdownCell value={parts.secs} label="secs" />
            </div>
          )}
          {showLive && (
            <span className="inline-flex items-center self-center whitespace-nowrap rounded bg-[#aaeaba] px-3 py-2 text-base font-bold uppercase leading-none tracking-[0.5px] text-[#221144]">
              Open Now
            </span>
          )}

          <NextLink
            href={storeUrl}
            className={`inline-flex h-10 min-h-9 w-full items-center justify-center whitespace-nowrap rounded-full border border-solid px-8 py-4 text-base font-bold leading-none transition-colors md:flex-1 lg:w-auto lg:flex-initial ${
              showLive
                ? 'border-transparent bg-[#7235ed] text-white hover:bg-[#6028cc]'
                : 'border-[rgba(34,17,68,0.1)] bg-white/80 text-[#1a0d33] hover:bg-white'
            }`}
          >
            {showLive ? 'Get tickets' : 'Learn more'}
          </NextLink>
        </div>
      </div>
    </div>
  )
}
