import React from 'react'
import Image from 'next/image'
import DC8Logo from 'assets/images/dc-8/dc8-logo.png'
import { Link } from 'components/common/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ctaPrimary, ctaSecondary } from 'components/common/cta'
import { EVENT_APP_ORIGIN } from 'config/eventApp'
import { sectionX, sectionInner, sectionHeading, bodyCopy } from 'components/common/styles'

export const DevconIntro = () => {
  const t = useTranslations('home.devcon_intro')
  return (
    <div className={`relative ${sectionX} pt-8 sm:pt-10 pb-[48px] lg:pb-16`}>
      <div className={`${sectionInner} flex flex-col items-center gap-[16px] text-center`}>
        <Image src={DC8Logo} alt="Devcon 8 India" className="w-[182px] h-auto" priority />

        <div className="flex flex-col items-center gap-[16px] max-w-[620px]">
          {/* The heading's \n break is desktop-only — on narrow screens it would
              strand "for" on its own line, so let the text wrap naturally there */}
          <h2 className={`${sectionHeading} sm:whitespace-pre-line`}>{t('heading')}</h2>
          <p className={`${bodyCopy} text-[#1a0d33]`}>{t('subheading')}</p>
        </div>

        {/* Intrinsic-width pills, centred: stacked on phones, side by side from
            sm. The schedule lives in the Devcon app, hence the external arrow. */}
        <div className="mt-[8px] flex flex-col sm:flex-row items-center gap-[12px]">
          <Link to="/tickets" className={ctaPrimary}>
            {t('cta')}
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
          <Link to={`${EVENT_APP_ORIGIN}/schedule`} className={ctaSecondary}>
            {t('cta_schedule')}
            <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}
