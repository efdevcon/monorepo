import { Home } from 'components/domain/app/home'
import { AppLayout } from 'components/domain/app/Layout'
// import { pageHOC } from 'context/pageHOC'
import React from 'react'
// import { DEFAULT_APP_PAGE } from 'utils/constants'
// import { getGlobalData } from 'services/global'
// import { GetSessions, GetSpeakers } from 'services/programming'
import { SEO } from 'components/domain/seo'
// import Button from 'lib/components/button'
import { PageContext } from '../context/page-context'
// import moment from 'moment'
// import { fetchSessions, fetchSpeakers } from 'services/event-data'

import { useSessionData, useSpeakerData } from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'

export default (props: any) => {
  // const eventData = useEventData()
  // const sessions = eventData?.sessions
  const sessions = useSessionData()
  // const speakers = useSpeakerData()
  const context = {
    navigation: props.navigationData,
    notification: props.notification,
    appNotifications: [],
    current: DEFAULT_APP_PAGE,
  }

  return (
    <PageContext.Provider value={context}>
      <AppLayout>
        <SEO title="Dashboard" />
        {sessions ? <Home {...props} sessions={sessions} /> : <></>}

        <div className={`${sessions ? 'loaded' : ''} loader`}>
          <div className="indicator"></div>
        </div>
      </AppLayout>
    </PageContext.Provider>
  )
}

// export async function getStaticProps(context: any) {
//   return {
//     props: {
//       // ...(await getGlobalData(context.locale, true)),
//       page: DEFAULT_APP_PAGE,
//       // sessions: await GetSessions(),
//       // speakers: await GetSpeakers(),
//     },
//   }
// }
