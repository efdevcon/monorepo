import React from 'react'
import NextLink from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFeaturedWave, useWaveStates, useTicketsCtaLabel, useSpecialOffer } from 'hooks/useWaveStates'
import { ctaPrimary } from 'components/common/cta'
import { sectionX, sectionInner, sectionHeading } from 'components/common/styles'

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
    <div className={`bg-[#ffa366] py-[40px] ${sectionX}`}>
      <div className={`${sectionInner} flex flex-col items-center justify-center gap-[24px]`}>
        <h2 className={`${sectionHeading} text-center ${mounted ? '' : 'invisible'}`}>{heading}</h2>
        <NextLink href="/tickets" className={`w-full md:w-auto ${ctaPrimary}`}>
          {ctaLabel}
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </NextLink>
      </div>
    </div>
  )
}
