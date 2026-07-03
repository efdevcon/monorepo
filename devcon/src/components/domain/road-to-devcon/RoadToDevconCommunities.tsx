import React from 'react'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Community logos live in public/road-to-devcon/communities/ — same convention
// the rest of the Road to Devcon feature uses (Hero/Programs load from here).
const ASSET_BASE = '/road-to-devcon/communities'

// "Want to help create Devcon with us?" → email the ecosystem team.
const CONTACT_URL = 'mailto:ecosystem@devcon.org'

// The 4 Road to Devcon community co-creators (order per the design). Logos are
// wordmark PNGs sized to a uniform height (ETH Mumbai bakes its own white pill
// into the asset).
const COMMUNITIES = [
  { name: 'Devfolio', src: `${ASSET_BASE}/devfolio.png`, href: 'https://devfolio.co/discover' },
  { name: 'ETH Mumbai', src: `${ASSET_BASE}/eth-mumbai.png`, href: 'https://www.ethmumbai.in/' },
  { name: 'Aya', src: `${ASSET_BASE}/aya.png`, href: 'https://theayacommunity.com/' },
  { name: 'ETH Pune', src: `${ASSET_BASE}/eth-pune.png`, href: 'https://www.ethpune.com/' },
]

export function RoadToDevconCommunities() {
  const t = useTranslations('road_to_devcon')
  return (
    <section className="section relative z-10 bg-[#ffe6f1] py-16 text-[#160b2b]">
      {/* Stacked & centered on mobile → tablet → sm-desktop; on xl the heading +
          CTA share one row (heading left, CTA right) with the logos below. The
          `contents` wrapper keeps the mobile DOM order (Heading → Logos → CTA,
          via `order-*`) while pairing heading + CTA into a row on xl. */}
      <div className="flex flex-col items-center gap-10 text-center md:gap-12 xl:gap-16">
        <div className="contents xl:flex xl:w-full xl:flex-row xl:items-end xl:justify-between xl:gap-6">
          {/* Heading */}
          <div className="order-1 flex flex-col items-center gap-4 xl:order-none xl:flex-1 xl:items-start xl:text-left">
            <p className="text-sm font-semibold uppercase tracking-[2px] text-[#7235ed]">{t('communities.eyebrow')}</p>
            <h2 className="text-2xl font-extrabold leading-[1.2] tracking-[-0.5px] sm:text-[32px]">
              {t('communities.title')}
            </h2>
          </div>

          {/* CTA */}
          <div className="order-3 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:items-center xl:order-none xl:shrink-0">
            <p className="text-base font-medium text-[#1a0d33]">{t('communities.cta_text')}</p>
            <Link
              to={CONTACT_URL}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full border border-[rgba(34,17,68,0.1)] bg-white/80 px-8 py-3.5 text-base font-bold text-[#1a0d33] transition-colors hover:bg-white sm:w-auto"
            >
              {t('communities.cta_button')}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* Logos — wrap 2×2 on mobile/tablet, single row on lg+ */}
        <div className="order-2 flex w-full flex-wrap items-center justify-center gap-x-12 gap-y-8 xl:order-none">
          {COMMUNITIES.map(community => (
            <Link
              key={community.name}
              to={community.href}
              className="flex h-10 shrink-0 items-center justify-center transition-transform hover:scale-105 sm:h-16"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={community.src} alt={community.name} className="h-full w-auto object-contain" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default RoadToDevconCommunities
