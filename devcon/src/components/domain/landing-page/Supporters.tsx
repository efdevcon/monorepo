import React from 'react'
import Image, { StaticImageData } from 'next/image'
import { useTranslations } from 'next-intl'
import Gnosis from './images/supporters/gnosis.svg'
import Arkiv from './images/supporters/arkiv.svg'
import Fluid from './images/supporters/fluid.svg'
import Kleros from './images/supporters/kleros.svg'
import Base from './images/supporters/base.svg'
import OpenZeppelin from './images/supporters/openzeppelin.svg'
import Bitget from './images/supporters/bitget.svg'
import Bitrefill from './images/supporters/bitrefill.svg'
import Circle from './images/supporters/circle.svg'
import CowSwap from './images/supporters/cow-swap.svg'
import Dedaub from './images/supporters/dedaub.svg'
import Ens from './images/supporters/ens.svg'
import Fairfood from './images/supporters/fairfood.svg'
import Nethermind from './images/supporters/nethermind.svg'
import Ordocode from './images/supporters/ordocode.svg'
import Peer from './images/supporters/peer.svg'
import TrailOfBits from './images/supporters/trail-of-bits.svg'
import World from './images/supporters/world.svg'
import crossbar from './images/supporters/impact-hubs/crossbar.png'
import DaoFund from './images/supporters/impact-hubs/dao-fund.svg'
import Ech from './images/supporters/impact-hubs/ech.svg'
import Eff from './images/supporters/impact-hubs/eff.svg'
import eag from './images/supporters/impact-hubs/eag.png'
import Eez from './images/supporters/impact-hubs/eez.svg'
import EipsInsight from './images/supporters/impact-hubs/eipsinsight.svg'
import Ethlabs from './images/supporters/impact-hubs/ethlabs.svg'
import Fileverse from './images/supporters/impact-hubs/fileverse.svg'
import Gainforest from './images/supporters/impact-hubs/gainforest.svg'
import Gcc from './images/supporters/impact-hubs/gcc.svg'
import GrapheneOS from './images/supporters/impact-hubs/grapheneos.svg'
import Growthepie from './images/supporters/impact-hubs/growthepie.svg'
import Kohaku from './images/supporters/impact-hubs/kohaku.svg'
import Lfdt from './images/supporters/impact-hubs/lfdt.svg'
import MoneyLeague from './images/supporters/impact-hubs/money-league.svg'
import Nimbus from './images/supporters/impact-hubs/nimbus.svg'
import Railgun from './images/supporters/impact-hubs/railgun.svg'
import RedGuild from './images/supporters/impact-hubs/red-guild.svg'
import Seal from './images/supporters/impact-hubs/seal.svg'
import Swarm from './images/supporters/impact-hubs/swarm.svg'
import Unicef from './images/supporters/impact-hubs/unicef.svg'
import Walletbeat from './images/supporters/impact-hubs/walletbeat.svg'
import Zisk from './images/supporters/impact-hubs/zisk.svg'
import { sectionX, sectionInner, sectionHeading, eyebrow } from 'components/common/styles'
import { Reveal } from 'components/common/reveal/Reveal'

// Logos range from near-square to ~18:1, so a shared height would make the wide
// ones huge. Where a row has no fixed height, each logo gets the same visual area
// instead (height = K / √aspect, capped), times an optional optical `scale` for
// marks that read heavier or lighter than their box. Aspect = viewBox (SVG) or
// pixel size (raster).
type LogoEntry = { name: string; href?: string; aspect?: number; scale?: number } & (
  | { Logo: React.ComponentType<React.SVGProps<SVGSVGElement>>; image?: never }
  | { image: StaticImageData; Logo?: never }
)

// A row that never wraps. height: fixed max height for every logo (else equal-area
// from k/cap). max: hard ceiling after optical scale. maxWidth: share of the container
// the row may fill before scaling down. gap: CSS length between logos.
type Row = {
  height?: number
  k?: number
  cap?: number
  max?: number
  maxWidth?: number
  gap?: string
  logos: LogoEntry[]
}

// Supporters: Fluid + Base (flagship, ~100px), then Arkiv, Gnosis, Kleros and
// OpenZeppelin at 60px in two pairs (core — four across would overflow the column and
// shrink below starter), then the rest at 40px (starter) — 3 + 3 + 3 + 2 from sm, pairs
// below sm (sized off the core rows so it always stays smaller). Impact hubs follow the scale of the tier above
// them, so they always stay smaller. Every tier shares one column (SUPPORTERS_COLUMN).
const TOP_ROW: Row = {
  k: 172,
  cap: 100,
  gap: 'min(144px, 16cqw)',
  logos: [
    { name: 'Fluid', href: 'https://fluid.io', Logo: Fluid, aspect: 248 / 83 },
    { name: 'Base', href: 'https://www.base.org', Logo: Base, aspect: 1280 / 323.84 },
  ],
}

const CORE_SUPPORTERS: LogoEntry[] = [
  { name: 'Arkiv', href: 'https://arkiv.network', Logo: Arkiv, aspect: 1389 / 320 },
  { name: 'Gnosis', href: 'https://www.gnosis.io', Logo: Gnosis, aspect: 878 / 230 },
  { name: 'Kleros', href: 'https://kleros.io', Logo: Kleros, aspect: 185 / 48 },
  { name: 'OpenZeppelin', href: 'https://www.openzeppelin.com', Logo: OpenZeppelin, aspect: 552 / 80 },
]

const OTHER_SUPPORTERS: LogoEntry[] = [
  { name: 'Bitget', href: 'https://www.bitget.com', Logo: Bitget, aspect: 266 / 80 },
  { name: 'Bitrefill', href: 'https://www.bitrefill.com', Logo: Bitrefill, aspect: 328 / 80 },
  { name: 'Circle', href: 'https://www.circle.com', Logo: Circle, aspect: 312 / 80 },
  { name: 'CoW Swap', href: 'https://cow.fi', Logo: CowSwap, aspect: 390 / 60 },
  { name: 'Dedaub', href: 'https://dedaub.com', Logo: Dedaub, aspect: 602 / 80 },
  { name: 'ENS', href: 'https://ens.domains', Logo: Ens, aspect: 255 / 80 },
  { name: 'Fair Food Data', href: 'https://fairfooddata.org', Logo: Fairfood, aspect: 369 / 70.2 },
  { name: 'Nethermind', href: 'https://www.nethermind.io', Logo: Nethermind, aspect: 586 / 80 },
  { name: 'OrdoCode', href: 'https://ordocode.ai', Logo: Ordocode, aspect: 432 / 80 },
  { name: 'Peer', href: 'https://peer.xyz', Logo: Peer, aspect: 228 / 80 },
  { name: 'Trail of Bits', href: 'https://www.trailofbits.com', Logo: TrailOfBits, aspect: 133 / 80 },
  { name: 'World', href: 'https://world.org', Logo: World, aspect: 317 / 80 },
]

const IMPACT_HUBS: LogoEntry[] = [
  { name: 'Crossbar', href: 'https://crossbar-inc.com', image: crossbar, scale: 1.15 },
  { name: 'DAO FUND', href: 'https://thedao.fund', Logo: DaoFund, aspect: 81 / 80 },
  { name: 'ECH Institute', href: 'https://echinstitute.org', Logo: Ech, aspect: 197 / 81 },
  { name: 'Electronic Frontier Foundation', href: 'https://www.eff.org', Logo: Eff, aspect: 327 / 80 },
  { name: 'EIPsInsight', href: 'https://eipsinsight.com', Logo: EipsInsight, aspect: 442 / 80 },
  { name: 'Ethereum Applications Guild', href: 'https://ethappsguild.org', image: eag, scale: 1.15 },
  { name: 'Ethereum Economic Zone', href: 'https://eez.io', Logo: Eez, aspect: 170 / 80, scale: 1.2 },
  { name: 'Ethlabs', href: 'https://ethlabs.org', Logo: Ethlabs, aspect: 401 / 80, scale: 0.75 },
  { name: 'Fileverse', href: 'https://fileverse.io', Logo: Fileverse, aspect: 296 / 80 },
  { name: 'Gainforest', href: 'https://www.gainforest.earth', Logo: Gainforest, aspect: 380 / 80 },
  { name: 'GCC', href: 'https://www.gccofficial.org/en', Logo: Gcc, aspect: 311 / 80 },
  { name: 'GrapheneOS', href: 'https://grapheneos.org', Logo: GrapheneOS, aspect: 344 / 80 },
  { name: 'growthepie', href: 'https://www.growthepie.com', Logo: Growthepie, aspect: 292 / 80 },
  { name: 'Kohaku', href: 'https://github.com/ethereum/kohaku', Logo: Kohaku, aspect: 294 / 80 },
  { name: 'LF Decentralized Trust', href: 'https://www.lfdecentralizedtrust.org', Logo: Lfdt, aspect: 698.7 / 39.1 },
  { name: 'Money League', href: 'https://league.money', Logo: MoneyLeague, aspect: 81 / 80 },
  { name: 'Nimbus', href: 'https://nimbus.team', Logo: Nimbus, aspect: 86 / 67 },
  { name: 'Railgun', href: 'https://railgun.org', Logo: Railgun, aspect: 493 / 80 },
  { name: 'SEAL', href: 'https://securityalliance.org', Logo: Seal, aspect: 262 / 80 },
  { name: 'Swarm', href: 'https://www.ethswarm.org', Logo: Swarm, aspect: 296 / 80 },
  { name: 'The Red Guild', href: 'https://theredguild.org', Logo: RedGuild, aspect: 529 / 80 },
  { name: 'UNICEF', href: 'https://www.unicefventurefund.org', Logo: Unicef, aspect: 337 / 80 },
  { name: 'Walletbeat', href: 'https://www.walletbeat.fyi', Logo: Walletbeat, aspect: 327 / 80, scale: 1.1 },
  { name: 'ZisK', href: 'https://zisk.technology', Logo: Zisk, aspect: 327 / 153 },
]

const CORE_HEIGHT = 60
const OTHER_HEIGHT = 40
const HUB_K = 64
const HUB_CAP = 34
// Mobile hubs share the core row's (heavy) shrink, which leaves wide wordmarks tiny,
// so there they size up to just under tier 3's height (never past it, even with
// optical scale) — enough below starter that the two tiers still read apart.
const HUB_K_MOBILE = 86
const HUB_MAX_MOBILE = 32

const chunk = <T,>(items: T[], sizes: number[]) => {
  let i = 0
  return sizes.map(n => items.slice(i, (i += n)))
}

const CORE_ROWS: Row[] = chunk(CORE_SUPPORTERS, [2, 2]).map(logos => ({ height: CORE_HEIGHT, logos }))
const OTHER_ROWS_DESKTOP: Row[] = chunk(OTHER_SUPPORTERS, [3, 3, 3, 3]).map(logos => ({ height: OTHER_HEIGHT, logos }))
const OTHER_ROWS_MOBILE: Row[] = chunk(OTHER_SUPPORTERS, [2, 2, 2, 2, 2, 2]).map(logos => ({
  height: OTHER_HEIGHT,
  logos,
}))
const HUB_ROWS_DESKTOP: Row[] = chunk(IMPACT_HUBS, [5, 5, 5, 5, 4]).map(logos => ({
  k: HUB_K,
  cap: HUB_CAP,
  gap: 'min(48px, 5cqw)',
  logos,
}))
const HUB_ROWS_MOBILE: Row[] = chunk(IMPACT_HUBS, [3, 3, 3, 3, 2, 3, 3, 2, 2]).map(logos => ({
  k: HUB_K_MOBILE,
  cap: HUB_MAX_MOBILE,
  max: HUB_MAX_MOBILE,
  gap: 'min(48px, 7cqw)',
  logos,
}))

const logoAspect = ({ image, aspect }: LogoEntry) => (image ? image.width / image.height : aspect!)
const equalAreaHeight = (logo: LogoEntry, k: number, cap: number) =>
  Math.round(Math.min(cap, k / Math.sqrt(logoAspect(logo))) * (logo.scale ?? 1))

const LogoImage = ({ logo, className }: { logo: LogoEntry; className: string }) =>
  logo.image ? (
    <Image src={logo.image} alt={logo.name} className={className} />
  ) : (
    <logo.Logo role="img" aria-label={logo.name} className={className} />
  )

const rowHeights = ({ logos, height, k = 96, cap = 56, max = Infinity }: Row) =>
  logos.map(logo => height ?? Math.min(max, equalAreaHeight(logo, k, cap)))
const rowNaturalWidth = (row: Row) => rowHeights(row).reduce((sum, h, i) => sum + h * logoAspect(row.logos[i]), 0)
const widestRow = (rows: Row[]) => rows.reduce((a, b) => (rowNaturalWidth(b) > rowNaturalWidth(a) ? b : a))

// Below sm the core rows are width-bound (two wordmarks across a phone), and sizing
// starter and impact off the widest one at full height would leave starter at ⅔ of
// core. Fitting them to this shorter copy keeps starter at ⅚ of core instead.
const CORE_MOBILE_REF: Row = { ...widestRow(CORE_ROWS), height: 48 }

// Each logo's height is min(its max height, its share of the container width in
// every reference row): (maxWidth·100cqw − gaps) × h / naturalWidth per row in
// `fitTo` (default: the row itself). Rows fitted to the same reference share one
// scale, so a lower tier never ends up bigger than the tier above it. cqw resolves
// against the nearest inline-size container.
const DEFAULT_GAP = 'min(56px, 6cqw)'
// Logo links get an invisible ::after hit area that fills half the gap on every side
// (--gap within the row, --row-gap between rows), never under 44px. White focus ring
// so it shows on the purple.
const LOGO_LINK =
  "relative flex rounded-[4px] hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-[max(44px,calc(100%_+_var(--gap)))] after:h-[max(44px,calc(100%_+_var(--row-gap)))] after:content-['']"
// Each row enters with the same one-shot Reveal as the section heading.
const FitRow = ({ row, fitTo = [row], className }: { row: Row; fitTo?: Row[]; className?: string }) => {
  const t = useTranslations('home.supporters')
  const heights = rowHeights(row)
  const shares = fitTo.map(ref => {
    const available = `(${(ref.maxWidth ?? 1) * 100}cqw - ${ref.logos.length - 1} * ${ref.gap ?? DEFAULT_GAP})`
    return { available, naturalWidth: rowNaturalWidth(ref) }
  })
  return (
    <Reveal className={className}>
      <ul
        className="flex items-center justify-center gap-[var(--gap)]"
        style={{ '--gap': row.gap ?? DEFAULT_GAP } as React.CSSProperties}
      >
        {row.logos.map((logo, i) => {
          const fits = shares.map(({ available, naturalWidth }) => `calc(${available} * ${heights[i] / naturalWidth})`)
          return (
            <li
              key={logo.name}
              className="flex"
              style={{ '--h': `min(${heights[i]}px, ${fits.join(', ')})` } as React.CSSProperties}
            >
              {logo.href ? (
                <a href={logo.href} target="_blank" rel="noopener noreferrer" className={LOGO_LINK}>
                  <LogoImage logo={logo} className="w-auto h-[var(--h)]" />
                  <span className="sr-only">{t('opens_new_tab')}</span>
                </a>
              ) : (
                <LogoImage logo={logo} className="w-auto h-[var(--h)]" />
              )}
            </li>
          )
        })}
      </ul>
    </Reveal>
  )
}

// A labelled tier: eyebrow + its rows. Each tier is its own inline-size container
// (all are full width, so cqw resolves the same across tiers). The row gap is 28px on
// mobile so the smallest logos (~17px) still get a 44px-tall hit area.
const Tier = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="w-full flex flex-col items-center gap-[24px] sm:gap-[32px] [container-type:inline-size]">
    <Reveal>
      <p className={`${eyebrow} !text-white/85`}>{label}</p>
    </Reveal>
    <div className="w-full flex flex-col items-center [--row-gap:28px] sm:[--row-gap:32px] gap-[var(--row-gap)]">
      {children}
    </div>
  </div>
)

// Every tier fits one shared column, so the widest tier is never a lower one.
const SUPPORTERS_COLUMN = 'max-w-[880px]'

export const Supporters = () => {
  const t = useTranslations('home.supporters')
  return (
    <div className={`bg-[#7235ed] ${sectionX} py-[48px] sm:py-[64px] xl:py-[80px]`}>
      <div className={`${sectionInner} flex flex-col items-center gap-[32px] sm:gap-[48px]`}>
        <Reveal className="flex flex-col gap-[16px] text-center">
          <p className={`${eyebrow} !text-white/85`}>{t('eyebrow')}</p>
          <h2 className={`${sectionHeading} !text-white`}>{t('heading')}</h2>
        </Reveal>

        <div className={`w-full ${SUPPORTERS_COLUMN} flex flex-col items-center gap-[40px] sm:gap-[56px]`}>
          <Tier label={t('flagship')}>
            <FitRow row={TOP_ROW} />
          </Tier>
          <Tier label={t('core')}>
            {CORE_ROWS.map((row, i) => (
              <FitRow key={i} row={row} fitTo={[widestRow(CORE_ROWS)]} />
            ))}
          </Tier>
          <Tier label={t('starter')}>
            {OTHER_ROWS_DESKTOP.map((row, i) => (
              <FitRow key={i} row={row} fitTo={[widestRow(OTHER_ROWS_DESKTOP)]} className="hidden sm:block" />
            ))}
            {OTHER_ROWS_MOBILE.map((row, i) => (
              <FitRow key={i} row={row} fitTo={[row, CORE_MOBILE_REF]} className="sm:hidden" />
            ))}
          </Tier>
          <Tier label={t('impact_hubs')}>
            {HUB_ROWS_DESKTOP.map((row, i) => (
              <FitRow
                key={i}
                row={row}
                fitTo={[widestRow(HUB_ROWS_DESKTOP), widestRow(OTHER_ROWS_DESKTOP)]}
                className="hidden sm:block"
              />
            ))}
            {HUB_ROWS_MOBILE.map((row, i) => (
              <FitRow key={i} row={row} fitTo={[widestRow(HUB_ROWS_MOBILE), CORE_MOBILE_REF]} className="sm:hidden" />
            ))}
          </Tier>
        </div>
      </div>
    </div>
  )
}
