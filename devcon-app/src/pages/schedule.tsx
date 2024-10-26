import { AppLayout } from 'components/domain/app/Layout'
import { Schedule } from 'components/domain/app/schedule'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { useRouter } from 'next/router'
import { fetchRooms, fetchTracks, fetchEvent, fetchExpertiseLevels, fetchSessionTypes } from 'services/event-data'
import { API_URL, DEFAULT_APP_PAGE } from 'utils/constants'
import { Session } from 'components/domain/app/session'
import { Session as SessionType } from 'types/Session'
import { SEO } from 'components/domain/seo'
import { GetRelatedSessions } from '../../archived-pages/schedule/[id]'
import { useSessionData } from 'services/event-data'
import { PageContext } from '../context/page-context'
import { ScheduleState, useScheduleContext } from 'components/domain/app/schedule/Schedule'
import { FancyLoader } from 'lib/components/loader/loader'
import { SessionLayout } from 'components/domain/app/dc7/sessions'

export default pageHOC((props: any) => {
  const sessions = useSessionData()
  // const scheduleContext = useScheduleContext()
  // const { query } = useRouter()
  // const speakers = useSpeakerData()
  // const context = {
  //   navigation: props.navigationData,
  //   notification: props.notification,
  //   appNotifications: [],
  //   current: DEFAULT_APP_PAGE,
  // }

  // console.log(sessions, 'sessions?')
  // console.log(props.event, 'event?')

  return (
    <AppLayout pageTitle="Schedule" breadcrumbs={[{ label: 'Schedule' }]}>
      <SEO title="Schedule" />

      <SessionLayout sessions={sessions} event={props.event} />

      {/* {sessions ? (
        (() => {
          const sessionID = query.session
          const session = sessions.find((session: SessionType) => session.id === sessionID)
          const related = session ? GetRelatedSessions(String(sessionID), sessions) : []

          return session ? (
            <>
              <SEO
                title={session.title}
                description={session.description}
                imageUrl={`${API_URL}sessions/${session.id}/image`}
              />
              <Session session={session} relatedSessions={related} />
            </>
          ) : (
            <>
              <ScheduleState sessions={props.sessions}>
                <Schedule sessions={sessions} {...props} />
              </ScheduleState>
            </>
          )
        })()
      ) : (
        <></>
      )} */}

      <div className="fixed inset-0 h-[101vh] w-full flex justify-center items-center z-5 pointer-events-none">
        <FancyLoader loading={!sessions} />
      </div>
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      event: await fetchEvent(),
      // tracks: await fetchTracks(),
      // rooms: await fetchRooms(),
      // expertiseLevels: await fetchExpertiseLevels(),
      // sessionTypes: await fetchSessionTypes(),
    },
  }
}
