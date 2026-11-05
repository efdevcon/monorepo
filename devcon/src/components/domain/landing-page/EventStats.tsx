import React from 'react'
import { useTranslations } from 'next-intl'
import { CountingNumber } from 'components/common/counting-number/CountingNumber'
import { sectionX, sectionInner, sectionHeading, eyebrow, glassCard } from 'components/common/styles'
import { Reveal, RevealGroup } from 'components/common/reveal/Reveal'

// Devcon 8 India in numbers — labels live in home.stats.items, index-matched
// to this array. Sessions + speakers come from Pretalx (devcon8, confirmed
// submissions and the speakers on them, pulled 2026-11-05: 373 / 401), rounded
// down to the nearest 50 so the "+" holds.
const STATS = [
  { number: 6000, suffix: '+' },
  { number: 120, suffix: '+' },
  { number: 350, suffix: '+' },
  { number: 400, suffix: '+' },
]

export const EventStats = () => {
  const t = useTranslations('home.stats')
  const labels = t.raw('items') as string[]
  return (
    <div className={`relative ${sectionX} pb-[48px] sm:pb-[64px]`}>
      <div className={`${sectionInner} flex flex-col gap-[32px] sm:gap-[40px]`}>
        <Reveal className="flex flex-col gap-[16px]">
          <p className={eyebrow}>{t('eyebrow')}</p>
          <h2 className={sectionHeading}>{t('heading')}</h2>
        </Reveal>
        <RevealGroup className="grid grid-cols-2 lg:grid-cols-4 gap-[12px] sm:gap-[16px]">
          {STATS.map((stat, i) => (
            <Reveal key={i} delay={i * 80}>
              <div
                className={`${glassCard} flex flex-col gap-[4px] p-[20px] sm:p-[24px] shadow-[0_2px_8px_rgba(34,17,68,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]`}
              >
                <p className="text-[32px] sm:text-[40px] font-extrabold tracking-[-0.5px] leading-[1.1] text-[#160b2b]">
                  <CountingNumber number={stat.number} suffix={stat.suffix} />
                </p>
                <p className="text-[14px] sm:text-[16px] leading-[24px] text-[#1a0d33]">{labels[i]}</p>
              </div>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </div>
  )
}
