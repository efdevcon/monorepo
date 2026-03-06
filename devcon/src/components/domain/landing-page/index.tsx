import React from 'react'
import { DevconIntro } from './DevconIntro'
import { KeywordsSection } from './KeywordsSection'
import { WhyDevconIndia } from './WhyDevconIndia'
import { LargeCallout } from './LargeCallout'
import { WhatToExpect } from './WhatToExpect'
import { DevconBanner } from './DevconBanner'
import { ContributeSupport } from './ContributeSupport'
import { NarrativeBlock } from './NarrativeBlock'
import { FaqSection } from './FaqSection'
import { TicketBanner } from './TicketBanner'
import css from './landing-page.module.scss'

export const LandingPage = () => {
  return (
    <div className={css['page-content']}>
      <DevconIntro />
      <KeywordsSection />
      <WhyDevconIndia />
      <LargeCallout />
      <WhatToExpect />
      <DevconBanner />
      <ContributeSupport />
      <NarrativeBlock />
      <FaqSection />
      <TicketBanner />
    </div>
  )
}
