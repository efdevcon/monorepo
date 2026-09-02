import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import { Link } from 'components/common/link'
import { ctaSecondary } from 'components/common/cta'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { shuffle } from 'utils/shuffle'
import type { RoadCommunity } from './communities'

// "Want to help create Devcon with us?" → email the ecosystem team.
const CONTACT_URL = 'mailto:ecosystem@devcon.org'

// How many logos show before "Load more" reveals the rest.
const INITIAL_COUNT = 10

function CommunityLogo({ community }: { community: RoadCommunity }) {
  const className = 'flex h-10 shrink-0 items-center justify-center transition-transform hover:scale-105 sm:h-14'
  // Logos are pre-sized WebPs (or SVGs) served from Supabase's CDN; a plain
  // <img> avoids /_next/image re-transforming them for no gain.
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={community.logo}
      alt={community.name}
      loading="lazy"
      decoding="async"
      className="h-full w-auto object-contain"
    />
  )
  if (!community.url) return <span className={className}>{img}</span>
  return (
    <Link to={community.url} className={className}>
      {img}
    </Link>
  )
}

export function RoadToDevconCommunities({ communities }: { communities: RoadCommunity[] }) {
  const t = useTranslations('road_to_devcon')
  const [showAll, setShowAll] = useState(false)
  // The random pick happens on the client only: SSR renders the server order
  // (invisible), then the grid fades in once shuffled — no hydration mismatch
  // and no visible reorder. null = not shuffled yet.
  const [shuffled, setShuffled] = useState<RoadCommunity[] | null>(null)
  useEffect(() => {
    setShuffled(shuffle(communities))
  }, [communities])

  const mounted = shuffled !== null
  const list = shuffled ?? communities
  const visible = showAll ? list : list.slice(0, INITIAL_COUNT)
  const hasMore = visible.length < list.length

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
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full outline outline-1 outline-[#221144]/10 bg-white/80 px-8 py-3.5 text-base font-bold text-[#1a0d33] transition-[background-color,transform] duration-150 ease-out hover:scale-[1.03] hover:bg-white active:scale-[0.97] sm:w-auto"
            >
              {t('communities.cta_button')}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* Logos (+ Load more) — wrap on mobile/tablet, single row on lg+ */}
        <div className="order-2 flex w-full flex-col items-center gap-8 xl:order-none">
          <div
            className={cn(
              'flex w-full flex-wrap items-center justify-center gap-x-12 gap-y-8 transition-opacity duration-150 ease-out',
              mounted ? 'opacity-100' : 'opacity-0'
            )}
          >
            {visible.map(community => (
              <CommunityLogo key={community.id} community={community} />
            ))}
          </div>
          {hasMore && (
            <button type="button" className={ctaSecondary} onClick={() => setShowAll(true)}>
              {t('communities.load_more')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default RoadToDevconCommunities
