import React from 'react'
import Image from 'next/image'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import PlanTripMumbai from './images/new/plan-trip-mumbai.jpg'
import { ctaSecondary } from 'components/common/cta'
import { sectionX, sectionInner, sectionHeading, eyebrow, bodyCopy, leadCopy } from 'components/common/styles'

/**
 * "Plan your trip" — Figma node 4917:955. Copy + travel-guide CTA on the left,
 * Mumbai photo on the right (stacked below the copy on mobile).
 */
export const PlanYourTrip = () => {
  const t = useTranslations('home.plan_trip')

  return (
    <div className={`${sectionX} py-[48px] lg:py-[64px]`}>
      <div className={`${sectionInner} grid grid-cols-1 lg:grid-cols-2 gap-[32px] lg:gap-16 items-center`}>
        <div className="flex flex-col items-start gap-[16px]">
          <div className="flex flex-col gap-[16px]">
            <p className={eyebrow}>{t('eyebrow')}</p>
            <h2 className={sectionHeading}>{t('heading')}</h2>
          </div>
          <div className="flex flex-col gap-[12px]">
            <p className={leadCopy}>{t('lead')}</p>
            <p className={`${bodyCopy} text-[#221144]`}>{t('body')}</p>
          </div>
          <Link to="/travel-guide" className={`w-full md:w-auto mt-[8px] ${ctaSecondary}`}>
            {t('cta')}
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="relative w-full aspect-[624/364] rounded-2xl overflow-hidden">
          <Image
            src={PlanTripMumbai}
            alt={t('image_alt')}
            fill
            sizes="(max-width: 1023px) 100vw, 624px"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  )
}
