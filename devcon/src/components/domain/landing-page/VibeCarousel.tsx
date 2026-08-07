import React from 'react'
import Image from 'next/image'
import { MoveRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll'
import { sectionX, sectionInner, sectionLabel } from 'components/common/styles'
import VibeOpening from './images/new/vibe-opening.jpg'
import VibeJd from './images/new/vibe-jd.jpg'
import VibeCrowd from './images/new/vibe-crowd.jpg'
import VibeAt from './images/new/vibe-at.jpg'
import VibeYoga from './images/new/vibe-yoga.jpg'
import VibeAya from './images/new/vibe-aya.jpg'
import VibeCowork from './images/new/vibe-cowork.jpg'
import VibePres from './images/new/vibe-pres.jpg'
import VibeNym from './images/new/vibe-nym.jpg'
import VibeRog from './images/new/vibe-rog.jpg'
import VibeSupporters from './images/new/vibe-supporters.jpg'

const IMAGES = [
  VibeOpening,
  VibeJd,
  VibeYoga,
  VibeAt,
  VibeCrowd,
  VibeAya,
  VibeCowork,
  VibePres,
  VibeNym,
  VibeRog,
  VibeSupporters,
]

/**
 * Auto-scrolling photo marquee — Figma node 4917:713. Full-bleed tiles with a
 * static "Catch the Devcon vibe" label; pauses on hover and under
 * prefers-reduced-motion (guard lives in the shared InfiniteScroll styles).
 */
export const VibeCarousel = () => {
  const t = useTranslations('home.vibe')

  return (
    <div className="pt-[32px] pb-[48px] flex flex-col gap-[20px]">
      <div className={sectionX}>
        <div className={`${sectionInner} flex items-center justify-end gap-2 text-[#594d73]`}>
          <p className={`${sectionLabel} leading-6`}>{t('label')}</p>
          <MoveRight className="w-4 h-4" strokeWidth={2} />
        </div>
      </div>
      <InfiniteScroll nDuplications={2} speed="80s" pauseOnHover marqueeClassName="!h-[160px] md:!h-[200px]">
        <div className="flex gap-4 pr-4 h-full">
          {IMAGES.map((src, i) => (
            <div
              key={i}
              className="relative w-[238px] h-[160px] md:w-[298px] md:h-[200px] rounded-2xl overflow-hidden shrink-0"
            >
              <Image src={src} alt={t('image_alt')} fill sizes="298px" className="object-cover" />
            </div>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  )
}
