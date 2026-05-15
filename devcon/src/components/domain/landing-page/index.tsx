import React from 'react'
import { VenueDetails } from './VenueDetails'
import { WhyDevconContainer } from './WhyDevconContainer'
import { WhatToExpect } from './WhatToExpect'
import { PhotoGallery } from './PhotoGallery'
import { DevconSEAStats } from './DevconSEAStats'
import { LivingConstellation } from './living-constellation'
import { ContributeAndSupport } from './ContributeAndSupport'
import { ArtOverlay } from './ArtOverlay'
import { FaqSection } from './FaqSection'
import { EarlyBirdBanner } from './EarlyBirdBanner'

interface LandingPageProps {
  faqItems?: Array<{ question: string; answer: string }>
}

export const LandingPage = ({ faqItems }: LandingPageProps) => {
  return (
    <div>
      <VenueDetails />
      <WhyDevconContainer />
      <WhatToExpect />
      <PhotoGallery />
      <DevconSEAStats />
      <LivingConstellation />
      <ContributeAndSupport />
      <ArtOverlay />
      <FaqSection items={faqItems} />
      <EarlyBirdBanner />
    </div>
  )
}
