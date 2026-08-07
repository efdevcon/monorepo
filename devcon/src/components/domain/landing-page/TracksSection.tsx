import React from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { APPLY_URL, TRACK_IMAGES } from 'components/common/tracks/track-images'
import { ctaSecondary } from 'components/common/cta'
import { sectionX, sectionInner, sectionHeading, eyebrow, bodyCopy } from 'components/common/styles'
import { Reveal, RevealGroup } from 'components/common/reveal/Reveal'

// Home grid order (Figma 4928:1283) differs from the speaker_applications.tracks.items
// array order — indices into that array, row by row.
const DISPLAY_ORDER = [0, 1, 2, 3, 6, 4, 7, 5, 8]

/**
 * "This year's tracks" — Figma node 4928:1277. Static track badges (no flip
 * interaction, unlike the Speak at Devcon page) + Apply to Speak card. Track
 * titles come from the shared speaker_applications intl namespace.
 */
export const TracksSection = () => {
  const t = useTranslations('home.tracks')
  const tSpeaker = useTranslations('speaker_applications')
  const trackItems = (tSpeaker.raw('tracks.items') as Array<{ title: string }>).slice(0, TRACK_IMAGES.length)

  return (
    <div className={`${sectionX} py-[48px] sm:py-[64px] flex flex-col gap-[32px] sm:gap-[48px]`}>
      <Reveal className={`flex flex-col gap-[16px] ${sectionInner} w-full`}>
        <p className={eyebrow}>{t('eyebrow')}</p>
        <h2 className={sectionHeading}>{t('heading')}</h2>
        <p className={`${bodyCopy} text-[#1a0d33]`}>{t('body')}</p>
      </Reveal>

      <RevealGroup className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 ${sectionInner} w-full`}>
        {DISPLAY_ORDER.map((idx, i) => (
          <Reveal key={idx} delay={i * 60} className="flex flex-col items-center gap-4 p-[12px] md:p-4 rounded-2xl">
            <Image
              src={TRACK_IMAGES[idx]}
              alt=""
              className="w-[120px] lg:w-[160px] h-auto"
              sizes="(max-width: 1024px) 120px, 160px"
            />
            <p className="text-[18px] leading-[22px] md:text-[20px] md:leading-[24px] font-bold tracking-[-0.5px] text-center text-[#160b2b]">
              {trackItems[idx]?.title}
            </p>
          </Reveal>
        ))}

        {/* Apply to Speak card */}
        <Reveal
          delay={DISPLAY_ORDER.length * 60}
          className="col-span-2 md:col-span-3 lg:col-span-1 flex flex-col sm:flex-row lg:flex-col items-center sm:justify-center lg:justify-center gap-[16px] p-[16px] sm:px-6 lg:p-[16px] rounded-2xl bg-[#ece3fd] outline outline-1 outline-[rgba(255,255,255,0.33)]"
        >
          <p className="text-[16px] leading-[24px] text-[#1a0d33] text-center sm:text-left lg:text-center">
            {t('apply_prompt')}
          </p>
          <a
            href={APPLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full sm:w-auto lg:w-full shrink-0 ${ctaSecondary}`}
          >
            {t('apply_cta')}
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </a>
        </Reveal>
      </RevealGroup>
    </div>
  )
}
