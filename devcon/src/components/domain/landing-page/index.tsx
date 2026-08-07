import React from 'react'
import { VenueDetails } from 'components/common/VenueDetails'
import { WhyDevconContainer } from './WhyDevconContainer'
import { JoinTheEvent } from './JoinTheEvent'
import { VibeCarousel } from './VibeCarousel'
import { TracksSection } from './TracksSection'
import { DevconSEAStats } from './DevconSEAStats'
import { LivingConstellation } from './living-constellation'
import { AttendDevcon } from './AttendDevcon'
import { FaqSection } from './FaqSection'
import { EarlyBirdBanner } from './EarlyBirdBanner'
import css from './landing-page.module.scss'

interface LandingPageProps {
  faqItems?: Array<{ question: string; answer: string }>
}

export const LandingPage = ({ faqItems }: LandingPageProps) => {
  return (
    <div className={css['home-gutters']}>
      <VenueDetails />
      {/* Shared backdrop for intro → tracks: one vertical wash the sections sit
          on transparently (Figma group 4935:2865) — their own gradients (purple
          side washes, peach ellipses) layer on top of it. */}
      <div className="bg-gradient-to-b from-[#fbfafc] to-[#eaeefe]">
        <WhyDevconContainer />
        <JoinTheEvent />
        <VibeCarousel />
        <TracksSection />
      </div>
      <LivingConstellation />
      <DevconSEAStats />
      <AttendDevcon />
      <FaqSection items={faqItems} />
      <EarlyBirdBanner />
    </div>
  )
}
