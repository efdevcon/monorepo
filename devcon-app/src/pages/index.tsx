import { Home } from 'components/domain/app/home'
import { AppLayout } from 'components/domain/app/Layout'
import React, { useEffect, useState } from 'react'
import { SEO } from 'components/domain/seo'
import { PageContext } from '../context/page-context'
import { useSessionData } from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { FancyLoader } from 'lib/components/loader/loader'

const Index = (props: any) => {
  const sessions = useSessionData()

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

        <div className="fixed top-0 h-full w-full flex justify-center items-center opacity-100 z-5 pointer-events-none">
          <FancyLoader loading={!sessions} />
        </div>

        {/* <div className={`${sessions ? 'loaded' : ''} loader`}>
          <div className="indicator"></div>
        </div> */}
      </AppLayout>
    </PageContext.Provider>
  )
}

export default Index
