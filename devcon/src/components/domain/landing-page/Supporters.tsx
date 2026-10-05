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
// ones huge. Each gets the same visual area instead (height = K / √aspect, capped),
// then rows wrap and centre. Supporters use a larger K/cap than impact hubs.
// Aspect = viewBox (SVG) or pixel size (raster).
type LogoEntry = { name: string; aspect?: number } & (
  | { Logo: React.ComponentType<React.SVGProps<SVGSVGElement>>; image?: never }
  | { image: StaticImageData; Logo?: never }
)

// Fixed rows that never wrap: Fluid + Base (equal-area sizing), Arkiv, Gnosis and
// Kleros at 44px, then the rest at 36px as 4 + 3. Those heights are maximums — each
// row scales down as a unit once it no longer fits the container width (FitRow).
// maxWidth: share of the container the row may fill before it starts scaling down.
type Row = { height?: number; maxWidth?: number; logos: LogoEntry[] }

const SUPPORTER_ROWS: Row[] = [
  {
    maxWidth: 0.8,
    logos: [
      { name: 'Fluid', Logo: Fluid, aspect: 248 / 83 },
      { name: 'Base', Logo: Base, aspect: 1280 / 323.84 },
    ],
  },
  {
    height: 44,
    logos: [
      { name: 'Arkiv', Logo: Arkiv, aspect: 1389 / 320 },
      { name: 'Gnosis', Logo: Gnosis, aspect: 878 / 230 },
      { name: 'Kleros', Logo: Kleros, aspect: 185 / 48 },
    ],
  },
  {
    height: 36,
    logos: [
      { name: 'Bitget', Logo: Bitget, aspect: 266 / 80 },
      { name: 'CoW Swap', Logo: CowSwap, aspect: 390 / 60 },
      { name: 'ENS', Logo: Ens, aspect: 255 / 80 },
      { name: 'Fair Food Data', Logo: Fairfood, aspect: 226 / 43 },
    ],
  },
  {
    height: 36,
    logos: [
      { name: 'Nethermind', Logo: Nethermind, aspect: 586 / 80 },
      { name: 'Trail of Bits', Logo: TrailOfBits, aspect: 133 / 80 },
      { name: 'World', Logo: World, aspect: 317 / 80 },
    ],
  },
]

const IMPACT_HUBS: LogoEntry[] = [
  { name: 'Crossbar', image: crossbar },
  { name: 'Ethereum Applications Guild', image: eag },
  { name: 'Ethereum Economic Zone', Logo: Eez, aspect: 170 / 80 },
  { name: 'Ethlabs', Logo: Ethlabs, aspect: 401 / 80 },
  { name: 'growthepie', Logo: Growthepie, aspect: 292 / 80 },
  { name: 'LF Decentralized Trust', Logo: Lfdt, aspect: 698.7 / 39.1 },
  { name: 'Nimbus', Logo: Nimbus, aspect: 86 / 67 },
  { name: 'Railgun', Logo: Railgun, aspect: 493 / 80 },
  { name: 'Swarm', Logo: Swarm, aspect: 296 / 80 },
  { name: 'UNICEF', Logo: Unicef, aspect: 337 / 80 },
  { name: 'Walletbeat', Logo: Walletbeat, aspect: 327 / 80 },
]

const logoAspect = ({ image, aspect }: LogoEntry) => (image ? image.width / image.height : aspect!)
const equalAreaHeight = (logo: LogoEntry, k: number, cap: number) =>
  Math.round(Math.min(cap, k / Math.sqrt(logoAspect(logo))))

const LogoImage = ({ logo, className }: { logo: LogoEntry; className: string }) =>
  logo.image ? (
    <Image src={logo.image} alt={logo.name} className={className} />
  ) : (
    <logo.Logo role="img" aria-label={logo.name} className={className} />
  )

// One non-wrapping row. Each logo's height is min(its max height, its share of the
// container width): (100cqw − gaps) × h / naturalWidth, where naturalWidth is the
// row's width at max heights. cqw resolves against the nearest inline-size container.
// Rows sharing a fixed height scale together, fitted to the widest of them, so a
// shorter row in the same tier never ends up bigger than its neighbour.
const FIT_ROW_GAP = 'min(56px, 6cqw)'
const rowHeights = ({ logos, height }: Row) => logos.map(logo => height ?? equalAreaHeight(logo, 96, 56))
const rowNaturalWidth = (row: Row) => rowHeights(row).reduce((sum, h, i) => sum + h * logoAspect(row.logos[i]), 0)

const FitRow = ({ row, rows }: { row: Row; rows: Row[] }) => {
  const heights = rowHeights(row)
  const fitTo =
    row.height === undefined
      ? row
      : rows.filter(r => r.height === row.height).reduce((a, b) => (rowNaturalWidth(b) > rowNaturalWidth(a) ? b : a))
  const available = `(${(fitTo.maxWidth ?? 1) * 100}cqw - ${fitTo.logos.length - 1} * ${FIT_ROW_GAP})`
  const naturalWidth = rowNaturalWidth(fitTo)
  return (
    <ul className="flex items-center justify-center" style={{ gap: FIT_ROW_GAP }}>
      {row.logos.map((logo, i) => (
        <li
          key={logo.name}
          className="flex"
          style={
            { '--h': `min(${heights[i]}px, calc(${available} * ${heights[i] / naturalWidth}))` } as React.CSSProperties
          }
        >
          <LogoImage logo={logo} className="w-auto h-[var(--h)]" />
        </li>
      ))}
    </ul>
  )
}

const LogoList = ({ logos, k, cap, className }: { logos: LogoEntry[]; k: number; cap: number; className: string }) => (
  <ul className={`flex flex-wrap items-center justify-center ${className}`}>
    {logos.map(logo => (
      <li
        key={logo.name}
        className="flex"
        style={{ '--h': `${equalAreaHeight(logo, k, cap)}px` } as React.CSSProperties}
      >
        <LogoImage logo={logo} className="w-auto h-[calc(var(--h)*0.7)] sm:h-[var(--h)]" />
      </li>
    ))}
  </ul>
)

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
          {SUPPORTER_ROWS.map((row, i) => (
            <FitRow key={i} row={row} rows={SUPPORTER_ROWS} />
          ))}
        </div>

        <div className="w-full flex flex-col items-center gap-[24px] pt-[16px] sm:gap-[32px] sm:pt-[24px]">
          <p className={`${eyebrow} !text-white/80`}>{t('impact_hubs')}</p>
          <LogoList
            logos={IMPACT_HUBS}
            k={72}
            cap={40}
            className="gap-x-[32px] gap-y-[24px] sm:gap-x-[48px] sm:gap-y-[32px] max-w-[1200px]"
          />
        </div>
      </div>
    </div>
  )
}
