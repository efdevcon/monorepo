import React from 'react'
import { Link } from 'components/common/link'
import { MicVocal, Users, HandHeart, ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Reveal, RevealGroup } from 'components/common/reveal/Reveal'

// Translatable text comes from intl; these are the per-card layout meta (icon + link)
const cardMeta = [
  { icon: MicVocal, href: '/speaker-applications', external: false },
  { icon: Users, href: 'https://forum.devcon.org/t/rfp-13-devcon-8-india-community-hubs/8657', external: true },
  { icon: HandHeart, href: '/form/volunteer', external: false },
]

/**
 * "Help make Devcon happen" — Figma node 4917:966. Three contributor cards
 * (Speak / Community Hub / Volunteer), successor to ContributeAndSupport.
 */
export const GetInvolved = () => {
  const t = useTranslations('home.contribute')
  const cards = (t.raw('cards') as Array<{ title: string; body: string; cta: string }>).slice(0, cardMeta.length)

  return (
    <div className="px-[20px] md:px-[32px] xl:px-[64px] pt-[48px] xl:pt-[64px] pb-[104px] flex flex-col items-center gap-[32px] sm:gap-[48px]">
      <div className="text-center max-w-[720px] flex flex-col gap-[16px]">
        <p className="text-[14px] font-semibold text-[#7235ed] tracking-[2px] uppercase leading-none">{t('eyebrow')}</p>
        <h2 className="text-[24px] sm:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
          {t('heading')}
        </h2>
        <p className="text-[14px] leading-[20px] sm:text-[16px] sm:leading-[24px] text-[#1a0d33]">{t('subheading')}</p>
      </div>

      <RevealGroup className="w-full max-w-[1312px] grid grid-cols-1 lg:grid-cols-3 gap-[16px]">
        {cards.map((c, i) => {
          const meta = cardMeta[i]
          const Icon = meta.icon
          return (
            // Whole card is the link — travel-guide hotel-card interaction
            // (scale on hover/press, shadow on hover). Figma 4920:98735 spacing:
            // 24px padding, 24px body→CTA gap, natural height in single column.
            <Reveal key={i} delay={i * 120}>
            <Link
              to={meta.href}
              className="group h-full bg-white/50 backdrop-blur-[6px] hover:bg-white outline outline-1 outline-[rgba(34,17,68,0.1)] rounded-2xl p-[24px] flex flex-col gap-[24px] justify-between lg:min-h-[224px] transition-[background-color,box-shadow,transform] duration-150 [transition-timing-function:ease-out] hover:shadow-md motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
            >
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[20px] font-extrabold text-[#160b2b] leading-[26px]">{c.title}</h3>
                  <Icon className="w-[32px] h-[32px] shrink-0 text-[#7235ed]" strokeWidth={1.75} />
                </div>
                <p className="text-[14px] leading-[20px] sm:text-[16px] sm:leading-[24px] text-[#221144]">{c.body}</p>
              </div>

              <span className="inline-flex items-center gap-2 text-[#7235ed] font-bold text-[16px] leading-none group-hover:underline">
                {c.cta}
                {meta.external ? (
                  <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                ) : (
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                )}
              </span>
            </Link>
            </Reveal>
          )
        })}
      </RevealGroup>
    </div>
  )
}
