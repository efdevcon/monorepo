import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import DC8Logo from 'assets/images/dc-8/dc8-logo.png'
import { sectionX, sectionInner, sectionHeading, leadCopy, bodyCopy } from 'components/common/styles'
import { DEVCON_8_RECAP_VIDEO_URL } from 'config/devconIx'
import { getVideoId } from 'utils/video'

// Vertical side labels either side of the video (desktop only) — the old
// ticket-sales video's treatment, reusing its home.video strings.
const SIDE_LABEL =
  'hidden lg:block absolute top-1/2 uppercase tracking-[3px] text-sm text-[#1a0d33] whitespace-nowrap pointer-events-none z-10'
import { Reveal } from 'components/common/reveal/Reveal'

// Post-event intro: the "Devcon returns…" copy and ticket CTAs are replaced by
// a thank-you (devconnect.org's recap hero, shorter) and the embedded recap
// video (config/devconIx). Sits on WhyDevconContainer's moon + purple washes
// like the intro it replaces.
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
            <p className={leadCopy}>{t('closing')}</p>
            <p className={`${bodyCopy} text-[#221144]`}>{t('body')}</p>
          </div>
        </div>

        {/* Recap video at the old ticket-sales video's size: full width,
            1200px max, with 88px reserved at lg+ so the vertical side labels
            stay visible. relative stays on the Reveal so the labels keep their
            containing block after the entrance transform clears. */}
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
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1a0d33] outline outline-1 outline-[rgba(34,17,68,0.1)] shadow-[0_8px_24px_rgba(34,17,68,0.15)]">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${getVideoId(DEVCON_8_RECAP_VIDEO_URL)}`}
              title={t('video_title')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </Reveal>
      </div>
    </div>
  )
}
