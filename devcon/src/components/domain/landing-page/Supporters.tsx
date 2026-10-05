import React from 'react'
import Image, { StaticImageData } from 'next/image'
import { useTranslations } from 'next-intl'
import Gnosis from './images/supporters/gnosis.svg'
import Arkiv from './images/supporters/arkiv.svg'
import Fluid from './images/supporters/fluid.svg'
import Kleros from './images/supporters/kleros.svg'
import Base from './images/supporters/base.svg'
import Bitget from './images/supporters/bitget.svg'
import CowSwap from './images/supporters/cow-swap.svg'
import Ens from './images/supporters/ens.svg'
import Fairfood from './images/supporters/fairfood.svg'
import Nethermind from './images/supporters/nethermind.svg'
import TrailOfBits from './images/supporters/trail-of-bits.svg'
import World from './images/supporters/world.svg'
import crossbar from './images/supporters/impact-hubs/crossbar.png'
import eag from './images/supporters/impact-hubs/eag.avif'
import Eez from './images/supporters/impact-hubs/eez.svg'
import Ethlabs from './images/supporters/impact-hubs/ethlabs.svg'
import Growthepie from './images/supporters/impact-hubs/growthepie.svg'
import Lfdt from './images/supporters/impact-hubs/lfdt.svg'
import Nimbus from './images/supporters/impact-hubs/nimbus.svg'
import Railgun from './images/supporters/impact-hubs/railgun.svg'
import Swarm from './images/supporters/impact-hubs/swarm.svg'
import Unicef from './images/supporters/impact-hubs/unicef.svg'
import Walletbeat from './images/supporters/impact-hubs/walletbeat.svg'
import { sectionX, sectionInner, sectionHeading, eyebrow } from 'components/common/styles'
import { Reveal } from 'components/common/reveal/Reveal'

// Logos range from near-square to ~18:1, so a shared height would make the wide
// ones huge. Where a row has no fixed height, each logo gets the same visual area
// instead (height = K / √aspect, capped), times an optional optical `scale` for
// marks that read heavier or lighter than their box. Aspect = viewBox (SVG) or
// pixel size (raster).
type LogoEntry = { name: string; aspect?: number; scale?: number } & (
  | { Logo: React.ComponentType<React.SVGProps<SVGSVGElement>>; image?: never }
  | { image: StaticImageData; Logo?: never }
)

// A row that never wraps. height: fixed max height for every logo (else equal-area
// from k/cap). maxWidth: share of the container the row may fill before scaling down.
// gap: CSS length between logos.
type Row = { height?: number; k?: number; cap?: number; maxWidth?: number; gap?: string; logos: LogoEntry[] }

// Supporters: Fluid + Base, then Arkiv, Gnosis and Kleros at 44px, then the rest at
// 36px — 4 + 3 from sm, pairs below sm (sized off row 2 so it always stays bigger).
// Impact hubs follow the scale of the tier above them, so they always stay smaller.
const TOP_ROW: Row = {
  maxWidth: 0.8,
  logos: [
    { name: 'Fluid', Logo: Fluid, aspect: 248 / 83 },
    { name: 'Base', Logo: Base, aspect: 1280 / 323.84 },
  ],
}

const SECOND_ROW: Row = {
  height: 44,
  logos: [
    { name: 'Arkiv', Logo: Arkiv, aspect: 1389 / 320 },
    { name: 'Gnosis', Logo: Gnosis, aspect: 878 / 230 },
    { name: 'Kleros', Logo: Kleros, aspect: 185 / 48 },
  ],
}

const OTHER_SUPPORTERS: LogoEntry[] = [
  { name: 'Bitget', Logo: Bitget, aspect: 266 / 80 },
  { name: 'CoW Swap', Logo: CowSwap, aspect: 390 / 60 },
  { name: 'ENS', Logo: Ens, aspect: 255 / 80 },
  { name: 'Fair Food Data', Logo: Fairfood, aspect: 369 / 70.2 },
  { name: 'Nethermind', Logo: Nethermind, aspect: 586 / 80 },
  { name: 'Trail of Bits', Logo: TrailOfBits, aspect: 133 / 80 },
  { name: 'World', Logo: World, aspect: 317 / 80 },
]

const IMPACT_HUBS: LogoEntry[] = [
  { name: 'Crossbar', image: crossbar, scale: 1.15 },
  { name: 'Ethereum Applications Guild', image: eag, scale: 1.15 },
  { name: 'Ethereum Economic Zone', Logo: Eez, aspect: 170 / 80, scale: 1.2 },
  { name: 'Ethlabs', Logo: Ethlabs, aspect: 401 / 80, scale: 0.75 },
  { name: 'growthepie', Logo: Growthepie, aspect: 292 / 80 },
  { name: 'LF Decentralized Trust', Logo: Lfdt, aspect: 698.7 / 39.1 },
  { name: 'Nimbus', Logo: Nimbus, aspect: 86 / 67 },
  { name: 'Railgun', Logo: Railgun, aspect: 493 / 80 },
  { name: 'Swarm', Logo: Swarm, aspect: 296 / 80 },
  { name: 'UNICEF', Logo: Unicef, aspect: 337 / 80 },
  { name: 'Walletbeat', Logo: Walletbeat, aspect: 327 / 80, scale: 1.1 },
]

const HUB_K = 56
const HUB_CAP = 30

const chunk = <T,>(items: T[], sizes: number[]) => {
  let i = 0
  return sizes.map(n => items.slice(i, (i += n)))
}

const OTHER_ROWS_DESKTOP: Row[] = chunk(OTHER_SUPPORTERS, [4, 3]).map(logos => ({ height: 36, logos }))
const OTHER_ROWS_MOBILE: Row[] = chunk(OTHER_SUPPORTERS, [2, 2, 2, 1]).map(logos => ({ height: 36, logos }))
const HUB_ROWS_DESKTOP: Row[] = chunk(IMPACT_HUBS, [4, 4, 3]).map(logos => ({
  k: HUB_K,
  cap: HUB_CAP,
  gap: 'min(48px, 5cqw)',
  logos,
}))
const HUB_ROWS_MOBILE: Row[] = chunk(IMPACT_HUBS, [3, 3, 3, 2]).map(logos => ({
  k: HUB_K,
  cap: HUB_CAP,
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

const rowHeights = ({ logos, height, k = 96, cap = 56 }: Row) =>
  logos.map(logo => height ?? equalAreaHeight(logo, k, cap))
const rowNaturalWidth = (row: Row) => rowHeights(row).reduce((sum, h, i) => sum + h * logoAspect(row.logos[i]), 0)
const widestRow = (rows: Row[]) => rows.reduce((a, b) => (rowNaturalWidth(b) > rowNaturalWidth(a) ? b : a))

// Each logo's height is min(its max height, its share of the container width in
// every reference row): (maxWidth·100cqw − gaps) × h / naturalWidth per row in
// `fitTo` (default: the row itself). Rows fitted to the same reference share one
// scale, so a lower tier never ends up bigger than the tier above it. cqw resolves
// against the nearest inline-size container.
const DEFAULT_GAP = 'min(56px, 6cqw)'
// Each row enters with the same one-shot Reveal as the section heading.
const FitRow = ({ row, fitTo = [row], className }: { row: Row; fitTo?: Row[]; className?: string }) => {
  const heights = rowHeights(row)
  const shares = fitTo.map(ref => {
    const available = `(${(ref.maxWidth ?? 1) * 100}cqw - ${ref.logos.length - 1} * ${ref.gap ?? DEFAULT_GAP})`
    return { available, naturalWidth: rowNaturalWidth(ref) }
  })
  return (
    <Reveal className={className}>
      <ul className="flex items-center justify-center" style={{ gap: row.gap ?? DEFAULT_GAP }}>
        {row.logos.map((logo, i) => {
          const fits = shares.map(({ available, naturalWidth }) => `calc(${available} * ${heights[i] / naturalWidth})`)
          return (
            <li
              key={logo.name}
              className="flex"
              style={{ '--h': `min(${heights[i]}px, ${fits.join(', ')})` } as React.CSSProperties}
            >
              <LogoImage logo={logo} className="w-auto h-[var(--h)]" />
            </li>
          )
        })}
      </ul>
    </Reveal>
  )
}

export const Supporters = () => {
  const t = useTranslations('home.supporters')
  return (
    <div className={`bg-[#7235ed] ${sectionX} py-[48px] sm:py-[64px] xl:py-[80px]`}>
      <div className={`${sectionInner} flex flex-col items-center gap-[32px] sm:gap-[48px]`}>
        <Reveal className="flex flex-col gap-[16px] text-center">
          <p className={`${eyebrow} !text-white/80`}>{t('eyebrow')}</p>
          <h2 className={`${sectionHeading} !text-white`}>{t('heading')}</h2>
        </Reveal>

        <div className="w-full flex flex-col items-center gap-[32px] sm:gap-[40px] [container-type:inline-size]">
          <FitRow row={TOP_ROW} />
          <FitRow row={SECOND_ROW} />
          {OTHER_ROWS_DESKTOP.map((row, i) => (
            <FitRow key={i} row={row} fitTo={[widestRow(OTHER_ROWS_DESKTOP)]} className="hidden sm:block" />
          ))}
          {OTHER_ROWS_MOBILE.map((row, i) => (
            <FitRow key={i} row={row} fitTo={[row, SECOND_ROW]} className="sm:hidden" />
          ))}
        </div>

        <div className="w-full flex flex-col items-center gap-[24px] pt-[16px] sm:gap-[32px] sm:pt-[24px] [container-type:inline-size]">
          <Reveal>
            <p className={`${eyebrow} !text-white/80`}>{t('impact_hubs')}</p>
          </Reveal>
          {HUB_ROWS_DESKTOP.map((row, i) => (
            <FitRow
              key={i}
              row={row}
              fitTo={[widestRow(HUB_ROWS_DESKTOP), widestRow(OTHER_ROWS_DESKTOP)]}
              className="hidden sm:block"
            />
          ))}
          {HUB_ROWS_MOBILE.map((row, i) => (
            <FitRow key={i} row={row} fitTo={[widestRow(HUB_ROWS_MOBILE), SECOND_ROW]} className="sm:hidden" />
          ))}
        </div>
      </div>
    </div>
  )
}
