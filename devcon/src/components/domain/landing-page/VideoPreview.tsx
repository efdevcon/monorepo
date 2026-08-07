import React, { useState } from 'react'
import Image from 'next/image'
import VideoPoster from './images/new/video-thumbnail.jpg'
import { Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Reveal } from 'components/common/reveal/Reveal'
import { sectionX, sectionInner } from 'components/common/styles'

export const VideoPreview = () => {
  const t = useTranslations('home.video')
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative pb-10">
      <div className={sectionX}>
        <div className={sectionInner}>
        {/* 88px reserved at lg+ so the vertical side labels stay fully visible
            even when the video would otherwise fill the content column */}
        <div className="w-full lg:w-[calc(100%-88px)] mx-auto lg:max-w-[1200px]">
          {/* relative stays on the Reveal so the side labels keep their containing
              block after the entrance transform clears */}
          <Reveal className="relative">
          {/* Vertical side labels — 24px outside the video on each side (desktop only) */}
          <p
            className="hidden lg:block absolute right-full top-1/2 mr-6 uppercase tracking-[3px] text-sm text-[#1a0d33] whitespace-nowrap pointer-events-none z-10"
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            {t('conference_label')}
          </p>
          <p
            className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-6 uppercase tracking-[3px] text-sm text-[#1a0d33] whitespace-nowrap pointer-events-none z-10"
            style={{ writingMode: 'vertical-rl' }}
          >
            {t('location_label')}
          </p>

          {/* Video container — standard YouTube 16:9 aspect */}
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-[rgba(34,17,68,0.1)] shadow-[0_2px_2px_0_rgba(22,11,43,0.1),0_20px_25px_0_rgba(22,11,43,0.1),0_8px_10px_0_rgba(22,11,43,0.1)]">
            {!playing && (
              <>
                <Image
                  src={VideoPoster}
                  alt="Mumbai video preview"
                  fill
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                  priority={false}
                />
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label={t('play_aria')}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-20 rounded-full bg-[rgba(32,16,63,0.3)] border border-white/20 backdrop-blur-[6px] flex items-center justify-center hover:bg-[rgba(32,16,63,0.5)] transition-[background-color,transform] duration-150 ease-out motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] z-10 cursor-pointer"
                >
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </button>
              </>
            )}
            {playing && (
              <iframe
                src="https://www.youtube.com/embed/9SIfBzdmrvQ?autoplay=1&modestbranding=1&rel=0"
                title="Devcon Mumbai"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full block border-0"
              />
            )}
          </div>
          </Reveal>
        </div>
        </div>
      </div>
    </div>
  )
}
