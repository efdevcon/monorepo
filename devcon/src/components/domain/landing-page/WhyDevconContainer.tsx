import React from 'react'
import MoonSymbol from './images/new/moon-symbol-cropped.svg'
import { DevconIntro } from './DevconIntro'
import { LivingConstellation } from './living-constellation'

/**
 * Wrapper for the Devcon intro + confirmed speakers, which share one
 * background: the cropped moon symbol anchored top-center + radial purple
 * washes fading in from the sides. Based on Figma node 4917:522
 * (why-devcon-india-container), which held the ticket-sales video where the
 * speaker grid now sits; the Why Devcon India / keywords blocks it also held
 * render after the supporters section instead (see landing-page/index).
 */
export const WhyDevconContainer = () => (
  <div
    className="relative overflow-hidden"
    style={{
      // Side washes at ~33% down the container, Figma 4917:522.
      // No base fill — the section is transparent over the page-level
      // #fbfafc→#eaeefe gradient (Figma group 4935:2865).
      background:
        'radial-gradient(ellipse 50% 53% at 0% 33%, rgba(211,191,249,1) 0%, rgba(222,207,251,1) 24%, rgba(222,207,251,0) 100%), ' +
        'radial-gradient(ellipse 50% 53% at 100% 33%, rgba(211,191,249,1) 0%, rgba(222,207,251,1) 24%, rgba(222,207,251,0) 100%)',
    }}
  >
    {/* Cropped moon symbol behind the intro — fixed design size, centered (Figma 4917:523) */}
    <div
      aria-hidden
      className="absolute left-1/2 -translate-x-1/2 top-0 w-[1438px] h-[1010px] max-w-none pointer-events-none select-none"
    >
      <MoonSymbol className="w-full h-full" />
    </div>

    <div className="relative">
      <DevconIntro />
      <LivingConstellation />
    </div>
  </div>
)
