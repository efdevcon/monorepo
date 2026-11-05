import React from 'react'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll'
import { Link } from 'components/common/link'
import { ctaSecondary } from 'components/common/cta'
import { sectionX } from 'components/common/styles'
import { DEVCON_8_PHOTOS_URL } from 'config/devconIx'
import Vibe01 from './images/new/vibe-01.jpg'
import Vibe02 from './images/new/vibe-02.jpg'
import Vibe03 from './images/new/vibe-03.jpg'
import Vibe04 from './images/new/vibe-04.jpg'
import Vibe05 from './images/new/vibe-05.jpg'
import Vibe06 from './images/new/vibe-06.jpg'
import Vibe07 from './images/new/vibe-07.jpg'
import Vibe08 from './images/new/vibe-08.jpg'
import Vibe09 from './images/new/vibe-09.jpg'
import Vibe10 from './images/new/vibe-10.jpg'
import Vibe11 from './images/new/vibe-11.jpg'

// Devcon 8 event photos (3:2, 1200px wide — the marquee tile renders at
// most 596px, so 2× DPR is covered).
const IMAGES = [Vibe01, Vibe02, Vibe03, Vibe04, Vibe05, Vibe06, Vibe07, Vibe08, Vibe09, Vibe10, Vibe11]

/**
 * Auto-scrolling photo marquee — Figma node 4917:713, post-event: no section
 * label and tiles at twice the pre-event size (476×320 / 596×400) since the
 * photos are now the content rather than a teaser. Pauses on hover and under
 * prefers-reduced-motion (guard lives in the shared InfiniteScroll styles).
 * A "View all photos" CTA under the marquee points at the full album
 * (config/devconIx).
 */
export const VibeCarousel = () => {
  const t = useTranslations('home.vibe')

  return (
    <div className="pt-[32px] pb-[48px] flex flex-col gap-[20px]">
      <InfiniteScroll nDuplications={2} speed="80s" pauseOnHover marqueeClassName="!h-[320px] md:!h-[400px]">
        <div className="flex gap-4 pr-4 h-full">
          {IMAGES.map((src, i) => (
            <div
              key={i}
              className="relative w-[476px] h-[320px] md:w-[596px] md:h-[400px] rounded-2xl overflow-hidden shrink-0"
            >
              <Image src={src} alt={t('image_alt')} fill sizes="596px" className="object-cover" />
            </div>
          ))}
        </div>
      </InfiniteScroll>
      <div className={`${sectionX} mt-[12px] flex justify-center`}>
        <Link to={DEVCON_8_PHOTOS_URL} className={ctaSecondary}>
          {t('view_all')}
          <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
