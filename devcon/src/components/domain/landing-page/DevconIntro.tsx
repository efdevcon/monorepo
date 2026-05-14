import React from 'react'
import Image from 'next/image'
import DC8Logo from 'assets/images/dc-8/dc8-logo.png'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

export const DevconIntro = () => {
  const t = useTranslations('home.devcon_intro')
  return (
    <div className="relative section py-8 sm:py-10">
      <div className="flex flex-col items-center gap-4 sm:gap-6 text-center">
        <Image src={DC8Logo} alt="Devcon 8 India" className="w-[140px] sm:w-[182px] h-auto" priority />

        <div className="flex flex-col items-center gap-3 sm:gap-4 max-w-[620px]">
          <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
            {t('heading')}
          </h2>
          <p className="text-sm sm:text-base text-[#1a0d33] leading-5 sm:leading-6">
            {t('subheading')}
          </p>
        </div>

        <Link
          to="/about"
          className="mt-1 sm:mt-2 w-[180px] sm:w-[200px] bg-white/80 hover:bg-white border border-[#221144]/10 rounded-full py-3 sm:py-4 inline-flex items-center justify-center gap-2 text-[#1a0d33] font-bold text-sm sm:text-base transition-colors"
        >
          {t('cta')}
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
