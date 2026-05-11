import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEthEarlyBirdWave } from 'hooks/useEthEarlyBirdWave'
import { CountdownText } from 'components/common/CountdownText'

export const Strip = () => {
  const t = useTranslations('common.strip')
  const router = useRouter()
  const wave = useEthEarlyBirdWave()
  const isTickets = router.pathname === '/tickets' || router.pathname.startsWith('/tickets/')

  if (isTickets) return null

  const showCountdown = wave.status === 'countdown' && wave.countdown
  const badge = showCountdown ? t('badge_countdown') : t('badge')

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="bg-[#ffa366] text-[#160b2b] text-xs font-bold leading-4 px-2 py-1 rounded tracking-[1px] uppercase whitespace-nowrap shrink-0">
              {badge}
            </span>
            <p className="text-[#f9f8fa] text-sm font-bold leading-5 whitespace-nowrap overflow-hidden text-ellipsis">
              {showCountdown ? (
                <>
                  {t('message_countdown_prefix')} <CountdownText value={wave.countdown} />
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
            <span className="font-bold text-[#a077f3] text-sm">{t('cta')}</span>
            <ArrowRight className="text-[#a077f3]" size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}
