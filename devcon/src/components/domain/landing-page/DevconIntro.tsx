import React from 'react'
import Image from 'next/image'
import DC8Logo from 'assets/images/dc-8/dc8-logo.png'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ctaPrimary } from 'components/common/cta'

export const DevconIntro = () => {
  const t = useTranslations('home.devcon_intro')
  return (
    <div className="relative section pt-8 sm:pt-10 pb-[48px] lg:pb-16">
      <div className="flex flex-col items-center gap-[16px] text-center">
        <Image src={DC8Logo} alt="Devcon 8 India" className="w-[182px] h-auto" priority />

        <div className="flex flex-col items-center gap-[16px] max-w-[620px]">
          {/* The heading's \n break is desktop-only — on narrow screens it would
              strand "for" on its own line, so let the text wrap naturally there */}
          <h2 className="text-[24px] sm:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b] sm:whitespace-pre-line">
            {t('heading')}
          </h2>
          <p className="text-[14px] leading-[20px] sm:text-[16px] sm:leading-[24px] text-[#1a0d33]">
            {t('subheading')}
          </p>
        </div>

        {/* Intrinsic width at every size per the mobile frame (Button 173px centered) */}
        <Link to="/tickets" className={`mt-[8px] ${ctaPrimary}`}>
          {t('cta')}
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
