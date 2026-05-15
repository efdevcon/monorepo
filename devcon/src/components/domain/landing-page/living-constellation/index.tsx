import React from 'react'
import Dc8MoonBg from 'assets/icons/dc8-moon-bg.svg'
import { LivingConstellationDesktop } from './LivingConstellationDesktop'
import { LivingConstellationMobile } from './LivingConstellationMobile'
import { AnimatedGradientBackground } from './AnimatedGradientBackground'
import { CONSTELLATION_SPEAKERS } from './speakers-data'

// Warm pastel palette — peach, pink, lavender, blue. Each circle is its own
// drifting blob so the section never looks like a flat fill.
const BACKGROUND_COLORS = ['#FFE5D6', '#FFD7E4', '#E0D7FF', '#D7E4FF', '#FFEEDE', '#F4D7FF']

// Section wrapper for the rotating speakers showcase. Renders the desktop
// (multi-ring parallax) layout at md+ and the single-orbit mobile layout
// below md. Both components are mounted simultaneously and one is shown via
// Tailwind responsive utilities — they hold their own state independently.
export function LivingConstellation() {
  return (
    <section className="relative w-full overflow-hidden flex flex-col items-center py-10 min-[1300px]:py-0">
      <AnimatedGradientBackground colors={BACKGROUND_COLORS} speed={11} blur="heavy" />
      {/* Decorative DC8 moon glyph between the gradient and the cards. The SVG
          ships with opacity 0.25 baked into the artwork — no extra fade
          needed. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Dc8MoonBg className="h-[90%] w-auto max-w-none select-none" />
      </div>
      <div className="relative w-full h-[600px] min-[1300px]:hidden">
        <LivingConstellationMobile speakers={CONSTELLATION_SPEAKERS} />
      </div>
      <div className="relative hidden w-full aspect-[14/10] min-h-[720px] max-h-[980px] min-[1300px]:block">
        <LivingConstellationDesktop speakers={CONSTELLATION_SPEAKERS} />
      </div>
    </section>
  )
}
