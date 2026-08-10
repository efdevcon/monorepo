import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFeaturedWave, useWaveStates, useTicketsCtaLabel, useSpecialOffer } from 'hooks/useWaveStates'
import { CountdownText } from 'components/common/CountdownText'

// "Aug 11" — special-offer end date in the strip message.
const OFFER_ENDS_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const Strip = () => {
  const t = useTranslations('common.strip')
  const router = useRouter()
  const { featured, mounted } = useFeaturedWave()
  const waveStates = useWaveStates()
  const { label: ctaLabel } = useTicketsCtaLabel()
  const isTickets = router.pathname === '/tickets' || router.pathname.startsWith('/tickets/')

  // Special voucher promo (config/waves.ts): strip advertises the offer until
  // it expires. The CTA still routes to /tickets (not straight to Pretix), so
  // buyers see every ticket type they may be eligible for first.
  const { active: showOffer, endsAtDisplay: offerEndsAt } = useSpecialOffer()

  if (isTickets) return null

  const showCountdown = !showOffer && featured?.status === 'countdown' && featured.countdown
  const showLive = !showOffer && featured?.status === 'live'
  // Current wave paused (coming-soon / closed) — keep the strip on it (e.g.
  // "General Admission — Reopens Aug") rather than the generic message.
  const showPaused = !showCountdown && !showLive && !!featured?.paused
  // Fallback: no live / countdown / paused current wave — but if there's a
  // known upcoming wave that just doesn't have exact open times yet (status
  // 'tbd'), use its name. Skipped when the current wave is paused so we don't
  // jump ahead to a later "Date TBA" wave (e.g. Final Waves).
  const upcomingTbd = !showCountdown && !showLive && !showPaused
    ? waveStates.find(s => s.status === 'tbd')
    : undefined
  // "Special offer" during the promo; "On sale" when live; "Coming soon" while
  // counting down or paused (coming-soon / closed both read as reopening);
  // generic otherwise.
  const badge = showOffer
    ? t('special_badge')
    : showLive
    ? t('badge_live')
    : showCountdown || showPaused
    ? t('badge_countdown')
    : t('badge')

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span
              className={`${
                showLive || showOffer ? 'bg-[#80df98] text-[#221144]' : 'bg-[#ffa366] text-[#160b2b]'
              } ${
                mounted ? '' : 'invisible'
              } text-xs font-bold leading-4 px-2 py-1 rounded tracking-[1px] uppercase whitespace-nowrap shrink-0`}
            >
              {badge}
            </span>
            <p
              className={`text-[#f9f8fa] text-sm font-bold leading-5 whitespace-nowrap overflow-hidden text-ellipsis ${
                mounted ? '' : 'invisible'
              }`}
            >
              {showOffer ? (
                <>{t('special_message', { date: OFFER_ENDS_FORMATTER.format(offerEndsAt) })}</>
              ) : showCountdown && featured ? (
                <>
                  {featured.wave.name} tickets available in <CountdownText value={featured.countdown} />
                </>
              ) : showLive && featured ? (
                <>{t('message_live')}</>
              ) : showPaused && featured ? (
                <>
                  {featured.wave.name}
                  {featured.pausedLabel ? ` — ${featured.pausedLabel}` : ' coming soon'}
                </>
              ) : upcomingTbd ? (
                <>
                  {upcomingTbd.wave.name}
                  {upcomingTbd.wave.openLabel ? ` — ${upcomingTbd.wave.openLabel}` : ' coming soon'}
                </>
              ) : (
                t('message')
              )}
            </p>
          </div>
          <Link
            href="/tickets"
            className="flex gap-1.5 items-center shrink-0 transition-transform hover:scale-[1.02]"
          >
            <span className="font-bold text-[#a077f3] text-sm">{ctaLabel}</span>
            <ArrowRight className="text-[#a077f3]" size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}
