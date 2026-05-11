import React from 'react'
import NextLink from 'next/link'
import DevconGlyph from 'assets/icons/dc8-glyph.svg'
import { useTranslations } from 'next-intl'
import { useEthEarlyBirdWave } from 'hooks/useEthEarlyBirdWave'
import { TICKET_WAVES } from 'config/waves'
import { CountdownText } from 'components/common/CountdownText'

// Format a wave opening time as "20 May 02:00 UTC" — UTC-based so it matches
// the publicly-announced window regardless of viewer's timezone.
const WAVE_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})
function formatWaveTime(d: Date): string {
  return `${WAVE_TIME_FORMATTER.format(d)} UTC`
}

const WAVE_LABELS = ['First wave', 'Second wave', 'Third wave', 'Fourth wave']

export function EarlyBirdSaleBanner() {
  const t = useTranslations('tickets.sale_banner')
  const wave = useEthEarlyBirdWave()
  const showCountdown = wave.status === 'countdown' && wave.countdown
  // ETH Early Bird's announced opening windows — shown next to the countdown
  // so visitors know the precise launch times in UTC.
  const ethEarlyBirdTimes = TICKET_WAVES[0]?.openTimes ?? []
  // Parse the subheading into bullet parts (split on •). Rendered as bullets
  // on mobile, inline with `•` separators on desktop.
  const subheadingParts = t('subheading')
    .split('•')
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-[#ffa366] shadow-[0_20px_25px_-5px_rgba(22,11,43,0.1),0_8px_10px_-6px_rgba(22,11,43,0.1)]"
      style={{ background: 'linear-gradient(180deg, #1A0D33 0%, #45326C 100%)' }}
    >
      {/* Devcon glyph watermark */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <DevconGlyph className="h-[220px] w-auto translate-y-[20%] text-white opacity-10 select-none" />
      </div>

      <div className="relative flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 px-5 py-6 md:px-8 md:py-6">
        {/* Left: title + subhead (bullets on mobile, inline on desktop) */}
        <div className="flex flex-col gap-3 md:gap-2 text-left">
          <h3 className="text-2xl md:text-[32px] font-extrabold text-white leading-[1.1] md:leading-none tracking-[-0.5px] md:tracking-[-1px] [text-shadow:0_1px_2px_rgba(34,17,68,0.2)]">
            {showCountdown ? t('heading_countdown') : t('heading')}
          </h3>
          {showCountdown ? (
            <div className="flex items-center gap-2">
              <CountdownText
                value={wave.countdown}
                className="text-2xl md:text-[28px] font-extrabold text-[#ffa366] leading-none tracking-[-0.5px] [text-shadow:0_1px_2px_rgba(34,17,68,0.2)]"
              />
              {ethEarlyBirdTimes.length > 0 && (
                <div className="flex flex-col justify-center gap-0.5 text-xs leading-[14px] text-[#f2f1f4]">
                  {ethEarlyBirdTimes.map((d, i) => (
                    <p key={i} className="whitespace-nowrap">
                      {WAVE_LABELS[i] ?? `Wave ${i + 1}`} at {formatWaveTime(d)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: bulleted list */}
              <ul className="md:hidden flex flex-col list-disc pl-5 text-[#f2f1f4] text-sm leading-[1.5]">
                {subheadingParts.map((part, i) => (
                  <li key={i}>{part}</li>
                ))}
              </ul>
              {/* Desktop: inline with • separators */}
              <p className="hidden md:block text-sm text-[#f2f1f4] leading-none">{t('subheading')}</p>
            </>
          )}
        </div>

        {/* Right: price + button. Stacks on mobile, side-by-side on desktop. */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-8 w-full md:w-auto">
          <div className="flex flex-col gap-2 text-left md:text-right">
            <div className="flex gap-2 items-end justify-start md:justify-end">
              <p className="text-2xl md:text-[32px] font-extrabold text-white leading-none tracking-[-1px] [text-shadow:0_1px_2px_rgba(34,17,68,0.2)]">
                {t('price')}
              </p>
              <p className="text-xl md:text-2xl font-extrabold text-[#aca6b9] line-through leading-none tracking-normal">
                {t('price_original')}
              </p>
            </div>
            <p className="text-sm text-[#f2f1f4] leading-none">{t('price_note')}</p>
          </div>

          <NextLink
            href="/tickets/store"
            className="inline-flex items-center justify-center min-h-12 px-8 py-4 bg-[#7235ed] hover:bg-[#6028cc] transition-colors rounded-full text-xl font-bold text-[#f9f8fa] leading-none whitespace-nowrap w-full md:w-auto"
          >
            {t('cta')}
          </NextLink>
        </div>
      </div>
    </div>
  )
}
