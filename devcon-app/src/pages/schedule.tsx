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
import cn from 'classnames'
import { sessionsAtom } from './_app'
import { useRecoilValue } from 'recoil'

export default pageHOC((props: any) => {
  const sessions = useRecoilValue(sessionsAtom)

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
  // console.log(props.rooms)

  return (
    <AppLayout pageTitle="Schedule" breadcrumbs={[{ label: 'Schedule' }]}>
      <SEO
        title="Schedule"
        imageUrl={`https://devcon-social.netlify.app/schedule/${props.event.sourceId}/opengraph-image`}
      />

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

      {/* <div
        className={cn(
          'fixed top-0 left-0 h-full w-full justify-center items-center opacity-90 bg-white z-5 pointer-events-none flex flex-col gap-2 transition-opacity duration-500',
          sessions && 'opacity-0'
        )}
      >
        <FancyLoader loading={!sessions} />
        Fetching schedule data...
      </div> */}
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      event: await fetchEvent(),
      rooms: await fetchRooms(),
      // tracks: await fetchTracks(),
      // expertiseLevels: await fetchExpertiseLevels(),
      // sessionTypes: await fetchSessionTypes(),
    },
  }
}
