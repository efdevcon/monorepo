import React from 'react'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from 'components/common/link'
import { DEVCON_IX_ANNOUNCEMENT_URL } from 'config/devconIx'

// Site-wide post-event callout: Devcon IX is coming to Lisbon. Same bar as the
// Devcon-app strip it replaces (Figma 5241:547 desktop, 5240:69234 tablet,
// 5240:69535 mobile): static copy, shown on every page, the whole bar is one
// link to the announcement; "Devcon IX Lisbon" in the message is purple-200
// (#c4aaf7). Keep id="strip": the header, hero and mobile foldout measure it
// for their offsets. px literals throughout: the root font-size drops to 14px
// ≤1024 (index.scss), which shrinks rem utilities. min-h 32 + 8px padding
// keeps the bar at Figma's 48px.
export const Strip = () => {
  const t = useTranslations('common.strip')

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-[8px]">
        <Link
          to={DEVCON_IX_ANNOUNCEMENT_URL}
          className="group flex items-center justify-between gap-[16px] min-h-[32px] text-white hover:text-white"
        >
          <p className="min-w-0 text-[12px] leading-[16px] md:text-[14px] md:leading-[20px] md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
            {t.rich('dcix_message', {
              event: chunks => <span className="font-bold text-[#c4aaf7]">{chunks}</span>,
            })}
          </p>
          <span className="flex items-center gap-[4px] md:gap-[8px] shrink-0 transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.02]">
            <span className="font-bold text-[12px] leading-[16px] tracking-[0.25px] md:text-[14px] md:leading-none md:tracking-normal">
              {/* "View announcement" from tablet up, just "Announcement" on phones */}
              <span className="hidden md:inline">{t('dcix_cta')}</span>
              <span className="md:hidden">{t('dcix_cta_short')}</span>
            </span>
            <ArrowRight className="w-[12px] h-[12px] md:w-[14px] md:h-[14px]" strokeWidth={2.5} />
          </span>
        </Link>
      </div>
    </div>
  )
}
