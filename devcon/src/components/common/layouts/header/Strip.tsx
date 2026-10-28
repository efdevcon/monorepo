import React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from 'components/common/link'
import { DEVCON_IX_ANNOUNCEMENT_URL } from 'config/devconIx'

// Post-event announcement strip (Figma Current-work 6068:503): a 48px
// #0c1412 bar, VT323 18px mint (#a6ffe9) text with a soft glow, message left,
// the "> boot devcon9_" prompt right; the whole bar is one link. Keep id="strip":
// the header, hero and mobile foldout measure it for their offsets. px
// literals throughout: the root font-size drops to 14px ≤1024 (index.scss),
// which shrinks rem utilities. Figma only draws 1440: below md the message
// wraps at 16px and the action drops "View".
export const Strip = () => {
  const t = useTranslations('common.strip')

  return (
    <div id="strip" className="bg-[#0c1412] w-full overflow-hidden">
      <div className="section py-[8px]">
        <Link
          to={DEVCON_IX_ANNOUNCEMENT_URL}
          className="group flex items-center justify-between gap-[16px] min-h-[32px] font-terminal text-[#a6ffe9] hover:text-[#a6ffe9]"
        >
          <p className="min-w-0 text-[16px] leading-[1.4] md:text-[18px] md:whitespace-nowrap md:overflow-hidden md:text-ellipsis [text-shadow:0_0_4px_rgba(166,255,233,0.4)]">
            {t('dcix_message')}
          </p>
          {/* Same prompt as the hero terminal: "> boot devcon9_" from tablet
              up, "> boot_" on phones; the cursor blinks and holds on hover. */}
          <span className="shrink-0 text-[16px] md:text-[18px] leading-[1.5] whitespace-nowrap [text-shadow:0_0_4px_rgba(166,255,233,0.25)] transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.02]">
            <span aria-hidden>&gt; </span>
            <span className="hidden md:inline">{t('dcix_cta')}</span>
            <span className="md:hidden">{t('dcix_cta_short')}</span>
            <span aria-hidden className="motion-safe:animate-blink group-hover:animate-none">
              _
            </span>
          </span>
        </Link>
      </div>
    </div>
  )
}
