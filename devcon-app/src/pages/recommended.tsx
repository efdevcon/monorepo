import { AppLayout } from 'components/domain/app/Layout'
import { Speakers } from 'components/domain/app/speakers'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { useRouter } from 'next/router'
import { Speaker as SpeakerType } from 'types/Speaker'
import {
  fetchSessions,
  fetchRooms,
  fetchTracks,
  fetchEvent,
  fetchExpertiseLevels,
  fetchSessionTypes,
} from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { RecommendedSpeakers } from 'components/domain/app/speakers/recommended'

export default pageHOC((props: any) => {
  return (
    <AppLayout pageTitle="Recommended" breadcrumbs={[{ label: 'Recommended' }]}>
      <RecommendedSpeakers />
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      // ...(await getGlobalData(context.locale, true)),
      // sessions,
      page: DEFAULT_APP_PAGE,
      // speakers: speakersWithSessions,
      tracks: await fetchTracks(),
      // eventDays: await fetchEventDays(),
      rooms: await fetchRooms(),
      expertiseLevels: await fetchExpertiseLevels(),
      sessionTypes: await fetchSessionTypes(),
    },
  }
}
