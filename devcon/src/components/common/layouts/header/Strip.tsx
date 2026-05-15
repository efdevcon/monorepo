import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFeaturedWave, useTicketsCtaLabel } from 'hooks/useWaveStates'
import { CountdownText } from 'components/common/CountdownText'

export const Strip = () => {
  const t = useTranslations('common.strip')
  const router = useRouter()
  const { featured } = useFeaturedWave()
  const { label: ctaLabel } = useTicketsCtaLabel()
  const isTickets = router.pathname === '/tickets' || router.pathname.startsWith('/tickets/')

  if (isTickets) return null

  const showCountdown = featured?.status === 'countdown' && featured.countdown
  const showLive = featured?.status === 'live'
  const badge = showLive ? t('badge_live') : showCountdown ? t('badge_countdown') : t('badge')

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span
              className={`${
                showLive ? 'bg-[#aaeaba] text-[#221144]' : 'bg-[#ffa366] text-[#160b2b]'
              } text-xs font-bold leading-4 px-2 py-1 rounded tracking-[1px] uppercase whitespace-nowrap shrink-0`}
            >
              {badge}
            </span>
            <p className="text-[#f9f8fa] text-sm font-bold leading-5 whitespace-nowrap overflow-hidden text-ellipsis">
              {showCountdown && featured ? (
                <>
                  {featured.wave.name} tickets available in <CountdownText value={featured.countdown} />
                </>
              ) : showLive && featured ? (
                <>{featured.wave.name} tickets on sale now!</>
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
