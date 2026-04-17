import React from 'react'
import MandalaBg from './images/new/mandala-bg.svg'
import { DevconIntro } from './DevconIntro'
import { VideoPreview } from './VideoPreview'
import { KeywordsSection } from './KeywordsSection'

/**
 * Wrapper for the Devcon intro + video preview that share a unified background:
 * mandala pattern centered + radial purple gradients fading in from the sides.
 * Matches Figma node 3585:3253 (why-devcon-india-container).
 */
export const WhyDevconContainer = () => (
  <div
    className="relative overflow-hidden"
    style={{
      background:
        'radial-gradient(ellipse 65% 40% at 0% 50%, rgba(211,191,249,1) 0%, rgba(222,207,251,1) 24%, rgba(222,207,251,0) 100%), ' +
        'radial-gradient(ellipse 65% 40% at 100% 50%, rgba(211,191,249,1) 0%, rgba(222,207,251,1) 24%, rgba(222,207,251,0) 100%), ' +
        '#e4d9fc',
    }}
  >
    {/* White radial glow — behind mandala, on top of background */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse 50% 35% at 50% 15%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
      }}
    />

    {/* Mandala pattern: large, positioned toward the top, fading out at the bottom */}
    <div
      className="absolute left-1/2 top-0 w-[2000px] max-w-none pointer-events-none select-none"
      style={
        {
          '--fill-0': 'rgba(255, 255, 255, 0.95)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 20%, transparent 52%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 20%, transparent 52%)',
          transform: 'translateX(-50%) scale(85%) translateY(-30%)',
        } as React.CSSProperties
      }
    >
      <MandalaBg aria-hidden className="w-full h-auto" />
    </div>

    {/* Bottom fade to white */}
    <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-b from-transparent to-[#eae6f2] pointer-events-none" />

    <div className="relative">
      <DevconIntro />
      <VideoPreview />
      <KeywordsSection />
    </div>
  </div>
)
