import React from 'react'
import { VenueDetails } from 'components/common/VenueDetails'
import { WhyDevconContainer } from './WhyDevconContainer'
import { VibeCarousel } from './VibeCarousel'
import { ArchiveCallout } from './ArchiveCallout'
import { Supporters } from './Supporters'

// Post-event home: venue bar under the hero (Figma 6068:461), then thank-you
// + recap video, the event in numbers and the top of the speaker lineup on
// one moon/purple-wash backdrop, the photo marquee and the archive pointer
// on its tail, and the supporters band to close. The pre-event sections
// (tracks, attend, keywords, join, FAQ, ticket banner) are out.
export const LandingPage = () => {
  return (
    <div>
      <VenueDetails />
      {/* The #fbfafc→#eaeefe wash is Figma group 4935:2865; the marquee and
          archive callout sit transparently on its tail. */}
      <div className="bg-gradient-to-b from-[#fbfafc] to-[#eaeefe]">
        <WhyDevconContainer />
        <VibeCarousel />
        <ArchiveCallout />
      </div>
      <Supporters />
    </div>
  )
}
