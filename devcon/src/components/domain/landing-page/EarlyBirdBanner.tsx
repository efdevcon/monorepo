import React from 'react'
import NextLink from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFeaturedWave, useWaveStates, useTicketsCtaLabel, useSpecialOffer } from 'hooks/useWaveStates'

export const EarlyBirdBanner = () => {
  const t = useTranslations('home.early_bird')
  const { featured, mounted } = useFeaturedWave()
  const waveStates = useWaveStates()
  const { label: ctaLabel } = useTicketsCtaLabel()
  const offer = useSpecialOffer()

  // Tickets ARE purchasable during the special voucher promo, so the banner
  // reads "available now" then too — "coming soon" next to a "Get tickets"
  // button would contradict the site-wide 11%-off messaging (which the strip,
  // hero and /tickets surfaces already carry; no need to repeat it here).
  const showLive = featured?.status === 'live' || offer.active
  const showCountdown = !showLive && featured?.status === 'countdown'
  // Mirror the header Strip / hero: when no wave is live or counting down, fall
  // back to the next wave that's announced but has no exact open time yet.
  const upcomingTbd = !showLive && !showCountdown ? waveStates.find(s => s.status === 'tbd') : undefined
  const upcomingWave = featured?.wave ?? upcomingTbd?.wave

  const heading = showLive
    ? t('heading_live', { wave: upcomingWave?.name ?? '' })
    : upcomingWave
      ? t('heading_countdown', { wave: upcomingWave.name })
      : t('heading_fallback')

  return (
    <div className="bg-[#ffa366] py-8 sm:py-10 px-5 sm:px-8 md:px-16 flex flex-col items-center justify-center gap-5 sm:gap-6">
      <h2
        className={`text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b] text-center ${
          mounted ? '' : 'invisible'
        }`}
      >
        {heading}
      </h2>
      <NextLink
        href="/tickets"
        className="bg-[#7235ed] hover:bg-[#6028cc] transition-colors text-white font-bold text-sm sm:text-base rounded-full px-6 sm:px-8 py-3.5 sm:py-4 flex items-center gap-2 justify-center min-h-9"
      >
        {ctaLabel}
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </NextLink>
    </div>
  )
}
