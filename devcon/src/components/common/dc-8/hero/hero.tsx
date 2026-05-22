import React from 'react'
import Image from 'next/image'
import NextLink from 'next/link'
import BannerImage from './images/devcon-8-india-bg.png'
import DevconLogo from './images/devcon-8-india-logo.svg'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconTelegram from 'assets/icons/telegram.svg'
import IconEmail from 'assets/icons/ui-email.svg'
import { Link } from 'components/common/link'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { useFeaturedWave, useWaveStates } from 'hooks/useWaveStates'
import { useNow } from 'hooks/useNow'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

const HERO_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

type CountdownParts = { days: number; hours: number; mins: number; secs: number }

function splitCountdown(target: Date, now: Date): CountdownParts {
  const diff = Math.max(0, target.getTime() - now.getTime())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1000),
  }
}

const CountdownUnit = ({ value, label, width }: { value: number; label: string; width?: string }) => (
  <div className={`flex flex-col items-center justify-center text-center ${width || ''}`}>
    <p className="text-2xl font-extrabold text-white leading-[28.8px] tracking-[-0.5px]">{value}</p>
    <p className="text-xs text-[#9188a2] leading-4">{label}</p>
  </div>
)

const CountdownSeparator = () => <div className="w-px h-4 bg-white/10" aria-hidden />

export const Hero = () => {
  const t = useTranslations('home.hero')
  const stripHeight = useGetElementHeight('strip')
  const { featured } = useFeaturedWave()
  const waveStates = useWaveStates()
  const now = useNow()
  const showCountdown = featured?.status === 'countdown' && !!featured.upcoming
  const showLive = featured?.status === 'live'
  // Fallback when there's no live / countdown wave: surface the upcoming
  // TBD wave's name so the eyebrow reads "Wave 1 coming soon" instead of
  // the generic "Tickets coming soon".
  const upcomingTbd = !showCountdown && !showLive
    ? waveStates.find(s => s.status === 'tbd')
    : undefined
  const parts = showCountdown && featured?.upcoming && now ? splitCountdown(featured.upcoming, now) : null

  return (
    <div className="relative w-full h-[90vh] md:h-screen overflow-hidden">
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

      {/* Edge gradients for smooth blending */}
      <div
        className="absolute bottom-0 left-0 w-full h-[150px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(34,17,68,1) 4.5%, rgba(34,17,68,0) 100%)' }}
      />
      <div
        className="absolute top-0 left-0 h-full w-[60px] md:w-[160px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)' }}
      />
      <div
        className="absolute top-0 right-0 h-full w-[60px] md:w-[160px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)' }}
      />

      {/* Hero content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pb-6 md:pb-8 lg:pb-14">
        <div className="section">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 md:items-end md:justify-between">
            {/* Left: Logo + Location */}
            <div className="flex flex-col gap-4 md:gap-6 [filter:drop-shadow(0_2px_12px_#214)]">
              <DevconLogo className="w-[160px] md:w-[263px] h-auto text-white" />
              <div className="flex flex-col gap-1 md:gap-2 text-white">
                <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.2] tracking-[-0.5px]">{t('location')}</h1>
                <p className="text-xl md:text-4xl font-light leading-[1.2] tracking-[-0.5px]">{t('dates')}</p>
              </div>
            </div>

            {/* Right: Ticket countdown + social links */}
            <div className="flex flex-col gap-2 w-full sm:w-[315px] shrink-0">
              {/* Ticket sale widget */}
              <div className="backdrop-blur-[3px] bg-[rgba(26,13,51,0.8)] border border-solid border-[rgba(150,142,166,0.19)] rounded-lg p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {showCountdown && featured ? (
                    <div className="flex flex-col gap-3 items-center">
                      <p className="text-xs font-semibold text-[#ffa366] text-center tracking-[2px] uppercase leading-4">
                        Available on {featured.upcoming ? `${HERO_DATE_FORMATTER.format(featured.upcoming)} UTC` : ''}
                      </p>
                      {/* Countdown row — only render on client to avoid hydration mismatch */}
                      <div className="flex items-center justify-between w-full min-h-[44px]">
                        {parts && (
                          <>
                            <CountdownUnit value={parts.days} label="days" width="w-12" />
                            <CountdownSeparator />
                            <CountdownUnit value={parts.hours} label="hours" />
                            <CountdownSeparator />
                            <CountdownUnit value={parts.mins} label="mins" width="w-10" />
                            <CountdownSeparator />
                            <CountdownUnit value={parts.secs} label="secs" width="w-10" />
                          </>
                        )}
                      </div>
                    </div>
                  ) : showLive ? (
                    <p className="text-xs font-semibold text-[#aaeaba] text-center tracking-[2px] leading-none">
                      {t('tickets_launch_eyebrow_live')}
                    </p>
                  ) : upcomingTbd ? (
                    <p className="text-xs font-semibold text-[#ffa366] text-center tracking-[2px] uppercase leading-none">
                      {upcomingTbd.wave.name}
                      {upcomingTbd.wave.openLabel ? ` — ${upcomingTbd.wave.openLabel}` : ' coming soon'}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-[#ffa366] text-center tracking-[2px] leading-none">
                      {t('tickets_launch_eyebrow')}
                    </p>
                  )}
                  {featured && (
                    <div className="flex items-center justify-between font-extrabold text-sm">
                      <p className="text-white leading-[14px]">{featured.wave.name}</p>
                      <div className="flex gap-1 items-end">
                        {featured.wave.id === 'eth-early-bird' && (
                          <p className="text-[#9188a2] line-through leading-[14px]">{t('pricing_original')}</p>
                        )}
                        <p className="text-white text-base leading-4">{featured.wave.price}</p>
                      </div>
                    </div>
                  )}
                </div>

                <NextLink
                  href="/tickets"
                  className="bg-[#7235ed] hover:bg-[#6028cc] transition-colors text-[#f9f8fa] font-bold text-sm leading-none rounded-full min-h-8 py-2 pl-4 pr-3 flex gap-1 items-center justify-center w-full"
                >
                  {showLive ? t('get_tickets_button') : t('view_tickets_button')}
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </NextLink>
              </div>

              {/* Social Links */}
              <div className="backdrop-blur-[3px] bg-[rgba(26,13,51,0.8)] border border-solid border-[rgba(150,142,166,0.19)] rounded-lg px-4 py-2 flex items-center justify-center gap-4 sm:justify-between sm:gap-0 [&_path]:!fill-white">
                <p className="text-sm text-white leading-5">{t('follow_for_updates')}</p>
                <div className="flex gap-4 items-center">
                  <Link to="https://x.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                    <IconX className="w-[18px] h-[18px]" />
                  </Link>
                  <Link
                    to="https://instagram.com/efdevcon"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <IconInstagram className="w-[18px] h-[18px]" />
                  </Link>
                  <Link
                    to="https://t.me/+sitvvHw8D8EzN2Yx"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <IconTelegram className="w-[18px] h-[18px]" />
                  </Link>
                  <Link
                    to="https://paragraph.com/@efevents"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <IconEmail className="w-[18px] h-[18px]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
