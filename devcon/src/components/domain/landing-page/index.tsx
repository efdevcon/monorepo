import React from 'react'
import { VenueDetails } from 'components/common/VenueDetails'
import { WhyDevconContainer } from './WhyDevconContainer'
// import { WhyDevconIndia } from './WhyDevconIndia'
import { KeywordsSection } from './KeywordsSection'
import { JoinTheEvent } from './JoinTheEvent'
import { VibeCarousel } from './VibeCarousel'
import { TracksSection } from './TracksSection'
import { Supporters } from './Supporters'
import { AttendDevcon } from './AttendDevcon'
import { FaqSection } from './FaqSection'
import { EarlyBirdBanner } from './EarlyBirdBanner'

interface LandingPageProps {
  faqItems?: Array<{ question: string; answer: string }>
}

export const LandingPage = ({ faqItems }: LandingPageProps) => {
  return (
    <div>
      <VenueDetails />
      {/* Intro copy + Get tickets CTA with the confirmed speakers on the same
          moon/purple-wash backdrop, then supporters and the ticket comparison —
          the sections buyers care about most this close to the event. The
          #fbfafc→#eaeefe wash is Figma group 4935:2865. */}
      <div className="bg-gradient-to-b from-[#fbfafc] to-[#eaeefe]">
        <WhyDevconContainer />
      </div>
      <Supporters />
      {/* Its jaali strip is drawn to tuck under the purple band above, and it
          ends on #efe7fd, which the next wash picks up. */}
      <AttendDevcon />
      {/* Shared backdrop for keywords → tracks: one vertical wash the sections
          sit on transparently — their own gradients (peach ellipses) layer on
          top of it. Starts where AttendDevcon's gradient ends so the seam is
          invisible, and settles on the periwinkle the tracks sat on before. */}
      <div className="bg-gradient-to-b from-[#efe7fd] to-[#eaeefe]">
        {/* Why Devcon India — parked for now. */}
        {/* <WhyDevconIndia /> */}
        <KeywordsSection />
        <JoinTheEvent />
        <VibeCarousel />
        <TracksSection />
      </div>
      <FaqSection items={faqItems} />
      <EarlyBirdBanner />
    </div>
  )
}
