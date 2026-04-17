import React from 'react'
import { VenueDetails } from './VenueDetails'
import { WhyDevconContainer } from './WhyDevconContainer'
import { WhatToExpect } from './WhatToExpect'
import { PhotoGallery } from './PhotoGallery'
import { DevconSEAStats } from './DevconSEAStats'
import { ContributeAndSupport } from './ContributeAndSupport'
import { ArtOverlay } from './ArtOverlay'
import { FaqSection } from './FaqSection'
import { EarlyBirdBanner } from './EarlyBirdBanner'

export const LandingPage = () => {
  return (
    <div>
      <VenueDetails />
      <WhyDevconContainer />
      <WhatToExpect />
      <PhotoGallery />
      <DevconSEAStats />
      <ContributeAndSupport />
      <ArtOverlay />
      <FaqSection />
      <EarlyBirdBanner />
    </div>
  )
}
