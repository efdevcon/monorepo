import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from 'components/common/link'
import { EVENT_APP_ORIGIN } from 'config/eventApp'

// Site-wide app callout (Figma 5241:547 desktop, 5240:69234 tablet,
// 5240:69535 mobile): the schedule is live in the Devcon app. Static copy, no
// wave state, and shown on every page — /tickets included — so the ticketing
// strip's route guard is gone with it. The whole bar is one link to the app;
// "Devcon Web App" in the message is purple-200 (#c4aaf7). Keep id="strip":
// the header, hero and mobile foldout measure it for their offsets. px
// literals throughout: the root font-size drops to 14px ≤1024 (index.scss),
// which shrinks rem utilities. min-h 32 + 8px padding keeps the bar at Figma's
// 48px now that the logomark no longer props it open.
export const Strip = () => {
  const t = useTranslations('common.strip')

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-[8px]">
        <Link
          to={EVENT_APP_ORIGIN}
          className="group flex items-center justify-between gap-[16px] min-h-[32px] text-white hover:text-white"
        >
          <p className="min-w-0 text-[12px] leading-[16px] md:text-[14px] md:leading-[20px] md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
            {t.rich('app_message', {
              app: chunks => <span className="font-bold text-[#c4aaf7]">{chunks}</span>,
            })}
          </p>
          <span className="flex items-center gap-[4px] md:gap-[8px] shrink-0 transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.02]">
            <span className="font-bold text-[12px] leading-[16px] tracking-[0.25px] md:text-[14px] md:leading-none md:tracking-normal">
              {/* "Visit Devcon App" from tablet up, just "Devcon App" on phones */}
              <span className="hidden md:inline">{t('app_cta')}</span>
              <span className="md:hidden">{t('app_cta_short')}</span>
            </span>
            <ArrowUpRight className="w-[12px] h-[12px] md:w-[14px] md:h-[14px]" strokeWidth={2.5} />
          </span>
        </Link>
      </div>
    </div>
  )
}
