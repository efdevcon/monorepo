import React from 'react'
import { Link } from 'components/common/link'
import { CircleFadingArrowUp, Newspaper, CalendarPlus2, HandHeart, ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Translatable text comes from intl; these are the per-card layout meta (icon + link)
const cardMeta = [
  { icon: CircleFadingArrowUp, href: 'https://forum.devcon.org', external: true },
  { icon: Newspaper, href: 'https://devcon.org/Devcon__Devconnect_Presskit.pdf', external: true },
  { icon: CalendarPlus2, href: '/ecosystem-program', external: false },
  { icon: HandHeart, href: '/form/volunteer-waitlist', external: false },
]

export const ContributeAndSupport = () => {
  const t = useTranslations('home.contribute')
  const cards = t.raw('cards') as Array<{ title: string; body: string; cta?: string; disabled?: string }>
  return (
    <div className="bg-[#e4d9fc] pt-12 sm:pt-[88px] pb-16 sm:pb-[104px] px-5 sm:px-8 md:px-16 flex flex-col items-center gap-8 sm:gap-12">
      <div className="text-center max-w-[720px] flex flex-col gap-3 sm:gap-4">
        <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
          {t('heading')}
        </h2>
        <p className="text-sm sm:text-base text-[#1a0d33] leading-5 sm:leading-6">
          {t('subheading')}
        </p>
      </div>

      <div className="w-full max-w-[1312px] grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {cards.map((c, i) => {
          const meta = cardMeta[i]
          const Icon = meta.icon
          return (
            <div
              key={i}
              className="bg-white border border-[#221144]/10 rounded-2xl p-5 sm:p-6 flex flex-col gap-3 sm:gap-4 justify-between min-h-[148px] sm:min-h-[168px]"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold text-[#160b2b] leading-[26px]">{c.title}</h3>
                  <Icon className="w-8 h-8 text-[#7235ed]" strokeWidth={1.75} />
                </div>
                <p className="text-sm sm:text-base text-[#221144] leading-5 sm:leading-6">{c.body}</p>
              </div>

              {c.cta && meta.href && (
                <Link
                  to={meta.href}
                  className="inline-flex items-center gap-2 text-[#7235ed] font-bold text-base hover:opacity-80 transition-opacity"
                >
                  {c.cta}
                  {meta.external ? (
                    <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  )}
                </Link>
              )}
              {c.disabled && <p className="text-base font-bold text-[#594d73]">{c.disabled}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
