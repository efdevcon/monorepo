import React from 'react'
import Image from 'next/image'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import InfiniteScroll from 'lib/components/infinite-scroll'

// Ecosystem logos — same source assets as the Supporters page
// (src/assets/images/supporters-page/figma-logos).
import LogoArbitrum from 'assets/images/supporters-page/figma-logos/arbitrum.png'
import LogoGnosis from 'assets/images/supporters-page/figma-logos/gnosis.png'
import LogoAave from 'assets/images/supporters-page/figma-logos/aave.png'
import LogoEns from 'assets/images/supporters-page/figma-logos/ens.png'
import LogoNethermind from 'assets/images/supporters-page/figma-logos/nethermind.png'
import LogoStarkware from 'assets/images/supporters-page/figma-logos/starkware.png'
import LogoAztec from 'assets/images/supporters-page/figma-logos/aztec.png'
import LogoCelo from 'assets/images/supporters-page/figma-logos/celo.png'
import LogoRailgun from 'assets/images/supporters-page/figma-logos/railgun.png'
import LogoXmtp from 'assets/images/supporters-page/figma-logos/xmtp.png'
import LogoGitcoin from 'assets/images/supporters-page/figma-logos/gitcoin.png'
import LogoTheGraph from 'assets/images/supporters-page/figma-logos/the-graph.png'
import LogoObol from 'assets/images/supporters-page/figma-logos/obol.png'
import LogoMorpho from 'assets/images/supporters-page/figma-logos/morpho.png'
import LogoCowSwap from 'assets/images/supporters-page/figma-logos/cow-swap.png'
import LogoFarcaster from 'assets/images/supporters-page/figma-logos/farcaster.png'
import LogoRadicle from 'assets/images/supporters-page/figma-logos/radicle.png'
import LogoRotki from 'assets/images/supporters-page/figma-logos/rotki.png'
import LogoSelf from 'assets/images/supporters-page/figma-logos/self.png'

// "Want to help create Devcon with us?" → community/supporter partnerships.
const CONTACT_URL = '/supporters'

const ROW_1 = [
  { src: LogoArbitrum, alt: 'Arbitrum' },
  { src: LogoGnosis, alt: 'Gnosis' },
  { src: LogoAave, alt: 'Aave' },
  { src: LogoEns, alt: 'ENS' },
  { src: LogoNethermind, alt: 'Nethermind' },
  { src: LogoStarkware, alt: 'Starkware' },
  { src: LogoAztec, alt: 'Aztec' },
  { src: LogoCelo, alt: 'Celo' },
  { src: LogoRailgun, alt: 'Railgun' },
]

const ROW_2 = [
  { src: LogoXmtp, alt: 'XMTP' },
  { src: LogoGitcoin, alt: 'Gitcoin' },
  { src: LogoTheGraph, alt: 'The Graph' },
  { src: LogoObol, alt: 'Obol' },
  { src: LogoMorpho, alt: 'Morpho' },
  { src: LogoCowSwap, alt: 'Cow Swap' },
  { src: LogoFarcaster, alt: 'Farcaster' },
  { src: LogoRadicle, alt: 'Radicle' },
  { src: LogoRotki, alt: 'Rotki' },
  { src: LogoSelf, alt: 'Self' },
]

function LogoRow({ logos, reverse }: { logos: { src: any; alt: string }[]; reverse?: boolean }) {
  return (
    <InfiniteScroll speed="80s" nDuplications={3} reverse={reverse} unpadded>
      <div className="flex items-center gap-16 pr-16">
        {logos.map(logo => (
          <Image key={logo.alt} src={logo.src} alt={logo.alt} className="h-8 w-auto object-contain" />
        ))}
      </div>
    </InfiniteScroll>
  )
}

export function RoadToDevconCommunities() {
  const t = useTranslations('road_to_devcon')
  return (
    // `.section` provides the 1312px-centered grid; `.expand` lets the marquee
    // break out to the full viewport width (edge to edge).
    <section className="section relative z-10 bg-[#ffe6f1] py-16 text-[#160b2b]">
      {/* Heading + CTA (centered column) */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[2px] text-[#7235ed]">{t('communities.eyebrow')}</p>
          <h2 className="mt-3 text-[32px] font-extrabold leading-[1.2] tracking-[-0.5px]">
            {t('communities.title')}
          </h2>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <p className="text-base font-medium text-[#1a0d33]">{t('communities.cta_text')}</p>
          <Link
            to={CONTACT_URL}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(34,17,68,0.1)] bg-white/80 px-8 py-3.5 text-base font-bold text-[#1a0d33] transition-colors hover:bg-white"
          >
            {t('communities.cta_button')}
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Logo marquee — full-bleed to the viewport edges */}
      <div className="expand mt-12 flex flex-col gap-10 overflow-hidden">
        <LogoRow logos={ROW_1} />
        <LogoRow logos={ROW_2} reverse />
      </div>
    </section>
  )
}

export default RoadToDevconCommunities
