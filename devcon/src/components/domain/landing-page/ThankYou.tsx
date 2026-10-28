import React from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import DC8Logo from 'assets/images/dc-8/dc8-logo.png'
import VideoPreview from './images/video-preview.png'
import { sectionX, sectionInner, sectionHeading, leadCopy, bodyCopy } from 'components/common/styles'

// Vertical side labels either side of the video (desktop only) — the old
// ticket-sales video's treatment, reusing its home.video strings.
const SIDE_LABEL =
  'hidden lg:block absolute top-1/2 uppercase tracking-[3px] text-sm text-[#1a0d33] whitespace-nowrap pointer-events-none z-10'
import { Reveal } from 'components/common/reveal/Reveal'

// Post-event intro: the "Devcon returns…" copy and ticket CTAs are replaced by
// a thank-you (devconnect.org's recap hero, shorter) and a recap-video
// placeholder — a 16:9 card with a play glyph that becomes the embed once the
// video is cut. Sits on WhyDevconContainer's moon + purple washes like the
// intro it replaces.
export const ThankYou = () => {
  const t = useTranslations('home.thank_you')
  const tVideo = useTranslations('home.video')
  return (
    <div className={`relative ${sectionX} pt-8 sm:pt-10 pb-[48px] lg:pb-16`}>
      <div className={`${sectionInner} flex flex-col items-center gap-[32px] sm:gap-[40px] text-center`}>
        <div className="flex flex-col items-center gap-[16px]">
          <Image src={DC8Logo} alt="Devcon 8 India" className="w-[182px] h-auto" priority />
          <div className="flex flex-col items-center gap-[16px] max-w-[720px]">
            <h2 className={`${sectionHeading} sm:whitespace-pre-line`}>{t('heading')}</h2>
            <p className={leadCopy}>{t('lead')}</p>
            <p className={`${bodyCopy} text-[#221144]`}>{t('body')}</p>
          </div>
        </div>

        {/* Recap video placeholder, at the old ticket-sales video's size: full
            width, 1200px max, with 88px reserved at lg+ so the vertical side
            labels stay visible. relative stays on the Reveal so the labels
            keep their containing block after the entrance transform clears. */}
        <Reveal className="relative w-full lg:w-[calc(100%-88px)] mx-auto lg:max-w-[1200px]">
          <p
            className={`${SIDE_LABEL} right-full mr-6`}
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            {tVideo('conference_label')}
          </p>
          <p className={`${SIDE_LABEL} left-full ml-6 -translate-y-1/2`} style={{ writingMode: 'vertical-rl' }}>
            {tVideo('location_label')}
          </p>
          <div
            role="img"
            aria-label={t('video_placeholder')}
            className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1a0d33] outline outline-1 outline-[rgba(34,17,68,0.1)] shadow-[0_8px_24px_rgba(34,17,68,0.15)]"
          >
            <Image
              src={VideoPreview}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover opacity-60"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(26,13,51,0.85) 0%, rgba(26,13,51,0.2) 60%)' }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[16px]">
              <span className="flex h-[64px] w-[64px] sm:h-[80px] sm:w-[80px] items-center justify-center rounded-full bg-white/90 text-[#7235ed] shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
                <Play
                  className="ml-[3px] h-[28px] w-[28px] sm:h-[34px] sm:w-[34px]"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
              <span className="rounded-full bg-[rgba(26,13,51,0.8)] px-[16px] py-[8px] text-[12px] sm:text-[14px] font-semibold tracking-[0.5px] uppercase text-white backdrop-blur-[3px]">
                {t('video_placeholder')}
              </span>
            </div>
            {/* Caption from sm up only: on a phone-width 16:9 card it collides
                with the centred play glyph + "coming soon" pill. */}
            <div className="hidden sm:block absolute left-[32px] bottom-[24px] text-left text-white">
              <p className="text-[12px] sm:text-[14px] font-semibold tracking-[2px] uppercase leading-none text-white/80">
                {t('video_eyebrow')}
              </p>
              <p className="mt-[8px] text-[18px] sm:text-[24px] font-extrabold tracking-[-0.5px] leading-[1.2]">
                {t('video_title')}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
