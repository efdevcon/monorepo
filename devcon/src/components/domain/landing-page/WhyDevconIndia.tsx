import React from 'react'
import { Link } from 'components/common/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CountingNumber } from 'components/common/counting-number/CountingNumber'
import { STAT_META } from 'components/common/india-stats/stats'
import { ctaSecondary } from 'components/common/cta'
import { sectionHeading, eyebrow, bodyCopy, leadCopy, glassCard } from 'components/common/styles'

/**
 * "Why Devcon India" block — Figma node 4917:617. Shares the stat figures and
 * citations with the About page via STAT_META; descriptions live in
 * home.why_india.stats (index-matched).
 */
export const WhyDevconIndia = () => {
  const t = useTranslations('home.why_india')
  const stats = t.raw('stats') as Array<{ desc: string }>

  return (
    <div className="relative section py-[48px]">
      <div className="flex flex-col gap-[32px] sm:gap-[48px]">
        <div className="flex flex-col gap-[24px] sm:gap-[32px]">
          <div className="flex flex-col gap-[16px]">
            <p className={eyebrow}>{t('eyebrow')}</p>
            <h2 className={sectionHeading}>{t('heading')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] md:gap-16">
            <p className={leadCopy}>{t('lead')}</p>
            <p className={`${bodyCopy} text-[#221144]`}>{t('body')}</p>
          </div>
        </div>

        {/* Stats callout — glass card, 4-up desktop / stacked mobile */}
        <div className={`${glassCard} p-[20px] sm:px-[40px] sm:py-[32px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px] sm:gap-[32px] shadow-[0_2px_8px_rgba(34,17,68,0.06),0_1px_2px_rgba(34,17,68,0.1),inset_0_-2px_16px_rgba(255,255,255,0.66)]`}>
          {STAT_META.map((meta, i) => (
            <div key={i} className="flex flex-col items-start gap-[12px]">
              <div className="flex flex-col gap-[8px]">
                <p className="font-extrabold text-[24px] leading-[28.8px] tracking-[-0.5px] text-[#160b2b]">
                  <CountingNumber number={meta.number} prefix={meta.prefix} suffix={meta.suffix} decimalPlaces={meta.decimals} />
                </p>
                <p className="text-[16px] leading-[24px] text-[#1a0d33]">{stats[i]?.desc}</p>
              </div>
              <a
                href={meta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[12px] leading-[16px] font-bold tracking-[0.25px] text-[#7235ed] hover:opacity-80 transition-opacity duration-150 ease-out"
              >
                {meta.source} <ArrowUpRight size={12} strokeWidth={2.5} />
              </a>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link to="/about" className={`w-full md:w-auto ${ctaSecondary}`}>
            {t('about_cta')}
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}
