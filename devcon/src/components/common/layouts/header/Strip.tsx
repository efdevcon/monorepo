import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from 'components/common/link'
import Logomark from 'assets/icons/devcon-8-india-logomark.svg'
import { EVENT_APP_ORIGIN } from 'config/eventApp'

// Site-wide app callout (Figma 5241:547 desktop, 5240:69234 tablet,
// 5240:69535 mobile): the schedule is live in the Devcon app. Static copy, no
// wave state, and shown on every page — /tickets included — so the ticketing
// strip's route guard is gone with it. Keep id="strip": the header, hero and
// mobile foldout measure it for their offsets. px literals throughout: the
// root font-size drops to 14px ≤1024 (index.scss), which shrinks rem utilities.
export const Strip = () => {
  const t = useTranslations('common.strip')

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-[8px]">
        <div className="flex items-center justify-between gap-[16px]">
          {/* Logomark box is 22px wide (the header glyph below it is 22px, so
              their centres line up) and the 20px gap puts the message's first
              letter on the header wordmark's left edge. */}
          <div className="flex items-center md:gap-[20px] min-w-0">
            <span className="hidden md:flex w-[22px] shrink-0 justify-center" aria-hidden="true">
              <Logomark className="w-[18.78px] h-[32px]" />
            </span>
            <p className="text-white text-[12px] leading-[16px] md:text-[14px] md:leading-[20px] md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
              {t('app_message')}
            </p>
          </div>
          <Link
            to={EVENT_APP_ORIGIN}
            className="flex items-center gap-[4px] md:gap-[8px] shrink-0 text-white transition-transform hover:scale-[1.02]"
          >
            <span className="font-bold text-[12px] leading-[16px] tracking-[0.25px] md:text-[14px] md:leading-none md:tracking-normal">
              {/* "Visit Devcon App" from tablet up, just "Devcon App" on phones */}
              <span className="hidden md:inline">{t('app_cta')}</span>
              <span className="md:hidden">{t('app_cta_short')}</span>
            </span>
            <ArrowUpRight className="w-[12px] h-[12px] md:w-[14px] md:h-[14px]" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}
