import React from 'react'
import { useTranslations } from 'next-intl'
import { TicketComparison } from 'components/domain/tickets/TicketComparison'
import { PlanYourTrip } from './PlanYourTrip'
import { GetInvolved } from './GetInvolved'
import JaaliBorder from './images/new/jaali-purple-border.svg'
import MoonElement from './images/new/dc8-moon-element.svg'
import { Reveal } from 'components/common/reveal/Reveal'

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

      {/* Jaali border strip across the top — pre-tiled 1438px-wide export, repeated for ultra-wide screens.
          Flipped so the pattern hangs downward; the tiles are nudged up 4px (relative, NOT a negative
          margin — overflow:clip does not create a BFC, so -mt collapses through and shifts the whole
          section instead) so the pattern's flat base tucks under the purple band above. */}
      <div aria-hidden className="relative h-16 lg:h-[84px] overflow-x-clip pointer-events-none select-none">
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 flex h-full -scale-y-100">
          <JaaliBorder className="w-[1095px] lg:w-[1438px] h-full shrink-0" />
          <JaaliBorder className="w-[1095px] lg:w-[1438px] h-full shrink-0" />
        </div>
      </div>

      <div className="relative px-[20px] md:px-[32px] xl:px-[64px] pt-[32px] sm:pt-24 pb-10 sm:pb-[104px]">
        <div className="max-w-[1312px] mx-auto">
          <Reveal>
            <TicketComparison eyebrow={t('eyebrow')} />
          </Reveal>
        </div>
      </div>

      <div className="relative">
        <PlanYourTrip />
        <GetInvolved />
      </div>

      {/* Moon glyph row, flush with the section bottom (Figma 4917:966 bottom deco).
          -z-10 keeps it above the root background but under the content, which
          otherwise sits below it in paint order at small widths. */}
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 -translate-x-1/2 -z-10 flex opacity-30 pointer-events-none select-none"
      >
        {Array.from({ length: 16 }, (_, i) => (
          <MoonElement key={i} className="w-[100px] h-[100px] md:w-[131px] md:h-[131px] shrink-0" />
        ))}
      </div>
    </div>
  )
}
