import React, { useState } from 'react'
import DC7 from './images/new/dc7-logo.svg'
import SEA from './images/new/dc7-sea.svg'
import Prism from './images/new/dc7-prism.svg'
import { useTranslations } from 'next-intl'
import { CountingNumber } from 'components/common/counting-number/CountingNumber'

const STAT_TEXT =
  'text-[28px] leading-[36px] sm:text-[32px] sm:leading-[36px] lg:leading-[32px] xl:text-[40px] xl:leading-[40px] tracking-[-0.5px]'

// Counts up on scroll like the India stats; the "+" holds its space (opacity
// only, no layout shift) and fades in once the number lands on its target.
const Stat = ({ value, suffix, label }: { value: number; suffix?: string; label: string }) => {
  const [done, setDone] = useState(false)
  return (
    <p className={STAT_TEXT}>
      <span className="font-extrabold">
        <CountingNumber number={value} suffix={suffix} onComplete={() => setDone(true)} />
        <span className={`transition-opacity duration-300 ease-out ${done ? 'opacity-100' : 'opacity-0'}`}>+</span>
      </span>{' '}
      {label}
    </p>
  )
}

export const DevconSEAStats = () => {
  const t = useTranslations('home.stats')
  return (
    <div className="bg-[#7235ed] relative px-[20px] md:px-[32px] xl:px-[64px] pt-16 pb-[48px] sm:py-16 xl:py-20 flex flex-col items-center justify-center gap-4 overflow-hidden">
      {/* Section label — pinned top-center at every breakpoint (Figma 4917:15194) */}
      <p className="absolute top-5 sm:top-6 xl:top-8 left-1/2 -translate-x-1/2 text-[14px] font-semibold text-[#f9f8fa] tracking-[0.5px] uppercase whitespace-nowrap">
        {t('label')}
      </p>

      {/* Background DC7 SEA logo (low opacity) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[139px] sm:w-[507px] sm:h-40 opacity-5 flex items-center pointer-events-none select-none">
        <DC7 aria-hidden className="absolute left-0 top-[27%] w-[42%] h-auto" />
        <Prism aria-hidden className="absolute left-[41%] top-0 w-[18%] h-auto" />
        <SEA aria-hidden className="absolute right-0 top-[27%] w-[39%] h-auto" />
      </div>

      <div className="relative flex flex-col sm:flex-row flex-wrap gap-[24px] sm:gap-10 xl:gap-20 items-center justify-center text-[#f9f8fa] text-center">
        <Stat value={700} label={t('speakers_label')} />
        <Stat value={600} label={t('sessions_label')} />
        <Stat value={12} suffix="K" label={t('attendees_label')} />
      </div>
    </div>
  )
}
