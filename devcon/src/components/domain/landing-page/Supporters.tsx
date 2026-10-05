import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Gnosis from './images/supporters/gnosis.svg'
import Arkiv from './images/supporters/arkiv.svg'
import Fluid from './images/supporters/fluid.svg'
import Kleros from './images/supporters/kleros.svg'
import Base from './images/supporters/base.svg'
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

// Two tiers, each a centred row at a fixed logo height: Fluid + Base at full size,
// then Gnosis, Arkiv and Kleros slightly smaller.
const SUPPORTER_TIERS = [
  {
    logoClass: 'h-[40px] sm:h-[56px]',
    gapClass: 'gap-[32px] sm:gap-[64px]',
    supporters: [
      { name: 'Fluid', Logo: Fluid },
      { name: 'Base', Logo: Base },
    ],
  },
  {
    logoClass: 'h-[24px] sm:h-[32px] md:h-[44px]',
    gapClass: 'gap-[24px] md:gap-[48px]',
    supporters: [
      { name: 'Gnosis', Logo: Gnosis },
      { name: 'Arkiv', Logo: Arkiv },
      { name: 'Kleros', Logo: Kleros },
    ],
  },
]

// Impact hub logos range from near-square to ~18:1, so a shared height would make
// the wide ones huge. Each gets the same visual area instead (height = K / √aspect,
// capped at 40px), scaled down to 70% below sm. Aspect = viewBox (SVG) or pixel size.
const IMPACT_HUBS = [
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

const hubLogoHeight = (aspect: number) => Math.round(Math.min(40, 72 / Math.sqrt(aspect)))
const hubLogoClass = 'w-auto h-[calc(var(--h)*0.7)] sm:h-[var(--h)]'

export const Supporters = () => {
  const t = useTranslations('home.supporters')
  return (
    <div className={`bg-[#7235ed] ${sectionX} py-[48px] sm:py-[64px] xl:py-[80px]`}>
      <div className={`${sectionInner} flex flex-col items-center gap-[32px] sm:gap-[48px]`}>
        <Reveal className="flex flex-col gap-[16px] text-center">
          <p className={`${eyebrow} !text-white/80`}>{t('eyebrow')}</p>
          <h2 className={`${sectionHeading} !text-white`}>{t('heading')}</h2>
        </Reveal>

        <div className="flex flex-col items-center gap-[24px] sm:gap-[40px]">
          {SUPPORTER_TIERS.map(({ logoClass, gapClass, supporters }, i) => (
            <ul key={i} className={`flex items-center justify-center ${gapClass}`}>
              {supporters.map(({ name, Logo }) => (
                <li key={name} className="flex">
                  <Logo role="img" aria-label={name} className={`w-auto ${logoClass}`} />
                </li>
              ))}
            </ul>
          ))}
        </div>

        <div className="w-full flex flex-col items-center gap-[24px] pt-[16px] sm:gap-[32px] sm:pt-[24px]">
          <p className={`${eyebrow} !text-white/80`}>{t('impact_hubs')}</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-[32px] gap-y-[24px] sm:gap-x-[48px] sm:gap-y-[32px] max-w-[1200px]">
            {IMPACT_HUBS.map(({ name, Logo, image, aspect }) => {
              const h = hubLogoHeight(image ? image.width / image.height : aspect!)
              const style = { '--h': `${h}px` } as React.CSSProperties
              return (
                <li key={name} className="flex" style={style}>
                  {image ? (
                    <Image src={image} alt={name} className={hubLogoClass} />
                  ) : (
                    Logo && <Logo role="img" aria-label={name} className={hubLogoClass} />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
