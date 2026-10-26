import React from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'components/common/link'
import { EVENT_APP_ORIGIN } from 'config/eventApp'
import { SpeakerGrid } from './SpeakerGrid'
import { CONSTELLATION_SPEAKERS } from './speakers-data'
import { sectionX, sectionInner, sectionHeading, eyebrow, bodyCopy } from 'components/common/styles'
import { ctaSecondary } from 'components/common/cta'

// Confirmed Devcon 8 speakers: a card grid that reads at a glance (name, role,
// organisation, track) and opens a focused card on click — see SpeakerGrid for
// the focus / return choreography. No background of its own: it sits inside
// the intro section (WhyDevconContainer) under the Get tickets CTA, on that
// section's moon + purple washes, so only bottom padding here.
export function LivingConstellation() {
  const t = useTranslations('home.speakers')
  return (
    <section id="confirmed-speakers" className="relative w-full">
      <div className={`relative ${sectionX} pb-[48px] sm:pb-[64px]`}>
        <div className={`${sectionInner} flex flex-col gap-[32px] sm:gap-[40px]`}>
          <div className="flex flex-col gap-[16px]">
            <p className={eyebrow}>{t('eyebrow')}</p>
            <h2 className={sectionHeading}>{t('heading')}</h2>
          </div>
          <SpeakerGrid speakers={CONSTELLATION_SPEAKERS} />
          <div className="flex flex-col items-center gap-[24px]">
            <p className={`${bodyCopy} text-center text-[#1a0d33]`}>{t('added_weekly')}</p>
            <Link
              to={`${EVENT_APP_ORIGIN}/speakers`}
              className={ctaSecondary}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {t('view_all_app')}
              <ArrowUpRight className="w-[16px] h-[16px]" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
