import React from 'react'
import { useTranslations } from 'next-intl'
import { AnimatedGradientBackground } from './AnimatedGradientBackground'
import { SpeakerGrid } from './SpeakerGrid'
import { CONSTELLATION_SPEAKERS } from './speakers-data'
import { sectionX, sectionInner, sectionHeading, eyebrow, bodyCopy } from 'components/common/styles'

// Warm pastel palette — peach, pink, lavender, blue. Each circle is its own
// drifting blob so the section never looks like a flat fill.
const BACKGROUND_COLORS = ['#FFE5D6', '#FFD7E4', '#E0D7FF', '#D7E4FF', '#FFEEDE', '#F4D7FF']

// Section wrapper for the confirmed Devcon 8 speakers: a card grid that reads
// at a glance (name, role, organisation, track) and opens a focused card on
// click — see SpeakerGrid for the focus / return choreography.
export function LivingConstellation() {
  const t = useTranslations('home.speakers')
  return (
    <section id="confirmed-speakers" className="relative w-full overflow-hidden">
      <AnimatedGradientBackground colors={BACKGROUND_COLORS} speed={11} blur="heavy" />
      <div className={`relative ${sectionX} py-[48px] sm:py-[64px]`}>
        <div className={`${sectionInner} flex flex-col gap-[32px] sm:gap-[40px]`}>
          <div className="flex flex-col gap-[16px]">
            <p className={eyebrow}>{t('eyebrow')}</p>
            <h2 className={sectionHeading}>{t('heading')}</h2>
            <p className={`${bodyCopy} text-[#1a0d33]`}>{t('body')}</p>
          </div>
          <SpeakerGrid speakers={CONSTELLATION_SPEAKERS} />
        </div>
      </div>
    </section>
  )
}
