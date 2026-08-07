import React from 'react'
import { useTranslations } from 'next-intl'
import { TicketComparison } from 'components/domain/tickets/TicketComparison'
import { PlanYourTrip } from './PlanYourTrip'
import { GetInvolved } from './GetInvolved'
import { Reveal } from 'components/common/reveal/Reveal'
import { sectionX, sectionInner } from 'components/common/styles'

/**
 * "Attend Devcon" composite — Figma node 4917:814. Marigold→lavender gradient
 * wrapper holding the jaali border, ticket comparison table, Plan your trip,
 * and Help make Devcon happen, closed off by a bottom-cropped moon glyph row.
 */
export const AttendDevcon = () => {
  const t = useTranslations('home.attend')

  // isolate: new stacking context so the moon row's -z-10 sits above this
  // section's own background instead of dropping behind it
  return (
    <div className="relative isolate overflow-x-clip bg-gradient-to-b from-[#fff0e6] to-[#efe7fd]">
      {/* Corner peach washes behind the ticket table (Figma 4917:815) */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[900px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 0% 0%, rgba(255,224,204,1) 0%, rgba(255,224,204,0.9) 24%, rgba(255,224,204,0) 100%), ' +
            'radial-gradient(ellipse 50% 40% at 100% 0%, rgba(255,224,204,1) 0%, rgba(255,224,204,0.9) 24%, rgba(255,224,204,0) 100%)',
        }}
      />

      {/* Jaali border strip across the top — a CSS-repeated background (the SVG lives in
          /public/dc8 so it isn't inlined into every home HTML response, and repeat-x tiles
          it at any viewport width). Flipped so the pattern hangs downward; nudged up 4px
          (-top on the abs child, NOT a negative margin — overflow:clip does not create a
          BFC, so -mt collapses through and shifts the whole section instead) so the
          pattern's flat base tucks under the purple band above. */}
      <div aria-hidden className="relative h-16 lg:h-[84px] overflow-x-clip pointer-events-none select-none">
        <div className="absolute inset-x-0 -top-1 h-full -scale-y-100 bg-repeat-x bg-[position:center_top] bg-[length:1095px_100%] lg:bg-[length:1438px_100%] bg-[url('/dc8/jaali-purple-border.svg')]" />
      </div>

      <div className={`relative ${sectionX} pt-[32px] sm:pt-24 pb-10 sm:pb-[104px]`}>
        <div className={sectionInner}>
          <Reveal>
            <TicketComparison eyebrow={t('eyebrow')} />
          </Reveal>
        </div>
      </div>

      <div className="relative">
        <PlanYourTrip />
        <GetInvolved />
      </div>

      {/* Moon glyph row, flush with the section bottom (Figma 4917:966 bottom deco) —
          CSS-repeated background instead of 16 inline SVGs. -z-10 keeps it above the
          root background but under the content, which otherwise sits below it in
          paint order at small widths. */}
      <div
        aria-hidden
        className="absolute bottom-0 inset-x-0 -z-10 h-[100px] md:h-[131px] opacity-30 pointer-events-none select-none bg-repeat-x bg-[position:center_bottom] bg-[length:100px_100%] md:bg-[length:131px_100%] bg-[url('/dc8/dc8-moon-element.svg')]"
      />
    </div>
  )
}
