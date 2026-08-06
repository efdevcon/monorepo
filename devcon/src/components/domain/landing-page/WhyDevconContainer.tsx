import React from 'react'
import MoonSymbol from './images/new/moon-symbol-cropped.svg'
import { DevconIntro } from './DevconIntro'
import { VideoPreview } from './VideoPreview'
import { WhyDevconIndia } from './WhyDevconIndia'
import { KeywordsSection } from './KeywordsSection'

/**
 * Wrapper for the Devcon intro + video preview that share a unified background:
 * the cropped moon symbol anchored top-center + radial purple washes fading in
 * from the sides beside the video. Matches Figma node 4917:522
 * (why-devcon-india-container).
 */
export const WhyDevconContainer = () => (
  <div
    className="relative overflow-hidden"
    style={{
      // Side washes sit beside the video (~33% down the container), Figma 4917:522.
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
      <VideoPreview />
      <WhyDevconIndia />
      <KeywordsSection />
    </div>
  </div>
)
