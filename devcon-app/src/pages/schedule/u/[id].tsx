import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { API_URL, DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import { Schedule } from 'components/domain/app/schedule'
import { GetTracks } from 'services/page'
import { fetchEvent } from 'services/event-data'
import { NoResults } from 'components/common/filter'
import { SEO } from 'components/domain/seo'

export default pageHOC((props: any) => {
  if (!props.userSchedule) {
    return (
      <AppLayout>
        <NoResults text="Sorry Agenda Not found" subtext="Please try another link or go back to the schedule." />
      </AppLayout>
    )
  }

  if (!props.userSchedule.publicSchedule) {
    return (
      <AppLayout>
        <NoResults text="Agenda is not public" subtext="Please try another link or go back to the schedule." />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <SEO
        title={`${props.userSchedule.username}'s schedule`}
        description="Sign up for the Devcon Passport App to customize, plan and share your own Devcon Bogotá Experience."
      />
      {/* imageUrl={`${API_URL}api/image/user?id=${props.userId}`} /> */}
      <Schedule {...props} sessions={props.userSchedule.sessions} />
    </AppLayout>
  )
})

export async function getServerSideProps(context: any) {

  return {
    props: {
      page: DEFAULT_APP_PAGE,
      event: await fetchEvent(),
      userId: context.params.id,
      userSchedule: null, // TODO: Move to Devcon API
      tracks: await GetTracks(),
    },
  }
}
