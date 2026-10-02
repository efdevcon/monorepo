import React from 'react'
import { useTranslations } from 'next-intl'
import Gnosis from './images/supporters/gnosis.svg'
import Arkiv from './images/supporters/arkiv.svg'
import Fluid from './images/supporters/fluid.svg'
import Kleros from './images/supporters/kleros.svg'
import Base from './images/supporters/base.svg'
import { sectionX, sectionInner, sectionHeading, eyebrow } from 'components/common/styles'
import { Reveal } from 'components/common/reveal/Reveal'

// Below lg the logos share a 3-column grid and scale to their column (capped at
// 56px tall); from lg there's room for a single row at a fixed 56px height.
const SUPPORTERS = [
  { name: 'Gnosis', Logo: Gnosis },
  { name: 'Arkiv', Logo: Arkiv },
  { name: 'Fluid', Logo: Fluid },
  { name: 'Kleros', Logo: Kleros },
  { name: 'Base', Logo: Base },
]

export const Supporters = () => {
  const t = useTranslations('home.supporters')
  return (
    <div className={`bg-[#7235ed] ${sectionX} py-[48px] sm:py-[64px] xl:py-[80px]`}>
      <div className={`${sectionInner} flex flex-col items-center gap-[32px] sm:gap-[48px]`}>
        <Reveal className="flex flex-col gap-[16px] text-center">
          <p className={`${eyebrow} !text-white/80`}>{t('eyebrow')}</p>
          <h2 className={`${sectionHeading} !text-white`}>{t('heading')}</h2>
        </Reveal>

        <ul className="w-full grid grid-cols-3 items-center gap-[24px] md:gap-[48px] lg:flex lg:w-auto xl:gap-[64px]">
          {SUPPORTERS.map(({ name, Logo }) => (
            <li key={name} className="flex justify-center">
              <Logo role="img" aria-label={name} className="w-full h-auto max-h-[56px] lg:w-auto lg:h-[56px]" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
