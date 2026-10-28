import React from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from 'components/common/link'
import { ctaPrimary } from 'components/common/cta'
import { sectionX, sectionInner, eyebrow } from 'components/common/styles'
import { Reveal } from 'components/common/reveal/Reveal'
import { DEVCON_IX_ANNOUNCEMENT_URL } from 'config/devconIx'
import Terminal from './images/dcix-terminal.png'

// Post-event teaser for the next edition, straight under the hero (whose
// bottom gradient settles on #221144, which this section continues). Figma
// Current-work 6068:341 — PLACEHOLDER layout until that frame can be read:
// copy + CTA on the left, the "Press ENTER to start" terminal on the right,
// stacked (terminal first) below lg.
export const DevconIxTeaser = () => {
  const t = useTranslations('home.devcon_ix')
  return (
    <div className={`bg-[#221144] ${sectionX} py-[48px] sm:py-[64px] xl:py-[80px]`}>
      <div
        className={`${sectionInner} grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] items-center gap-[32px] lg:gap-[64px]`}
      >
        <Reveal className="order-2 lg:order-1 flex flex-col items-center lg:items-start gap-[16px] text-center lg:text-left">
          <p className={`${eyebrow} !text-[#c4aaf7]`}>{t('eyebrow')}</p>
          <h2 className="text-[28px] sm:text-[40px] font-extrabold tracking-[-0.5px] leading-[1.15] text-white">
            {t('heading')}
          </h2>
          <p className="text-[16px] leading-[24px] sm:text-[18px] sm:leading-[27px] text-white/80 max-w-[520px]">
            {t('body')}
          </p>
          <Link to={DEVCON_IX_ANNOUNCEMENT_URL} className={`${ctaPrimary} mt-[8px]`}>
            {t('cta')}
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </Reveal>
        <Reveal delay={120} className="order-1 lg:order-2 flex justify-center">
          <Image src={Terminal} alt={t('terminal_alt')} className="w-full max-w-[520px] h-auto" sizes="520px" />
        </Reveal>
      </div>
    </div>
  )
}
