import React from 'react'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DragMarquee } from './DragMarquee'
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
import Vibe12 from './images/new/vibe-12.jpg'
import Vibe13 from './images/new/vibe-13.jpg'
import Vibe14 from './images/new/vibe-14.jpg'
import Vibe15 from './images/new/vibe-15.jpg'

// Devcon 8 event photos (3:2, 1200px wide — a tile is 85vw wide on phones and
// 75svh wide from md, so 2× DPR is covered up to ~800px-tall viewports).
const IMAGES = [Vibe01, Vibe02, Vibe03, Vibe04, Vibe05, Vibe06, Vibe07, Vibe08, Vibe09, Vibe10, Vibe11, Vibe12, Vibe13, Vibe14, Vibe15]

/**
 * Photo marquee — Figma node 4917:713, post-event: no section label, 3:2
 * tiles sized by width on phones (85vw, so most of a photo is in view) and
 * by height from md (half the viewport) since the photos are now the content
 * rather than a teaser, and draggable (DragMarquee: mouse drag / touch swipe, still
 * looping and drifting on its own otherwise). A "View all photos" CTA under
 * the marquee points at the full album (config/devconIx).
 */
export const VibeCarousel = () => {
  const t = useTranslations('home.vibe')

  return (
    <div className="pt-[32px] pb-[48px] flex flex-col gap-[20px]">
      <DragMarquee loopSeconds={80}>
        <div className="flex gap-4 pr-4">
          {IMAGES.map((src, i) => (
            <div
              key={i}
              className="relative w-[85vw] md:w-auto md:h-[50svh] aspect-[3/2] rounded-2xl overflow-hidden shrink-0"
            >
              <Image
                src={src}
                alt={t('image_alt')}
                fill
                sizes="(max-width: 767px) 85vw, 75vh"
                draggable={false}
                className="object-cover pointer-events-none"
              />
            </div>
          ))}
        </div>
      </DragMarquee>
      <div className={`${sectionX} mt-[12px] flex justify-center`}>
        <Link to={DEVCON_8_PHOTOS_URL} className={ctaSecondary}>
          {t('view_all')}
          <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
