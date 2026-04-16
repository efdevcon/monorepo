import React, { useState } from 'react'
import Image from 'next/image'
import VideoPoster from './images/new/video-preview.jpg'
import { Play } from 'lucide-react'

export const VideoPreview = () => {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative pb-10">
      <div className="section">
        <div className="relative">
          {/* Vertical side labels — 24px outside the video on each side (desktop only) */}
          <p
            className="hidden lg:block absolute right-full top-1/2 mr-6 uppercase tracking-[3px] text-sm text-[#1a0d33] whitespace-nowrap pointer-events-none z-10"
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            Ethereum Developer Conference
          </p>
          <p
            className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-6 uppercase tracking-[3px] text-sm text-[#1a0d33] whitespace-nowrap pointer-events-none z-10"
            style={{ writingMode: 'vertical-rl' }}
          >
            Mumbai India · 3–6 November 2026
          </p>

          {/* Video container with rounded corners and shadow */}
          <div className="relative aspect-[1312/610] rounded-2xl overflow-hidden border border-[rgba(34,17,68,0.1)] shadow-[0_2px_2px_0_rgba(22,11,43,0.1),0_20px_25px_0_rgba(22,11,43,0.1),0_8px_10px_0_rgba(22,11,43,0.1)]">
            {!playing && (
              <>
                <Image
                  src={VideoPoster}
                  alt="Mumbai video preview"
                  fill
                  className="object-cover scale-[1.035] translate-y-[0.5%]"
                  priority={false}
                />
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label="Play video"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-20 rounded-full bg-[rgba(32,16,63,0.3)] border border-white/20 backdrop-blur-[6px] flex items-center justify-center hover:bg-[rgba(32,16,63,0.5)] transition-colors z-10 cursor-pointer"
                >
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </button>
              </>
            )}
            {playing && (
              <iframe
                src="https://www.youtube.com/embed/st_A7rRr9tk?autoplay=1&modestbranding=1&rel=0"
                title="Devcon Mumbai"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full block border-0 scale-[1.02]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
