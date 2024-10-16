// import { Home } from 'components/domain/app/home'
import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { SEO } from 'components/domain/seo'
import { useSessionData } from 'services/event-data'
import { FancyLoader } from 'lib/components/loader/loader'
import { Dashboard } from 'components/domain/app/dc7/dashboard'
import AppIcon from 'assets/icons/app-tiles.svg'

const Index = (props: any) => {
  const sessions = useSessionData()

  return (
    <AppLayout pageTitle="Dashboard" breadcrumbs={[{ label: 'icon', icon: AppIcon }, { label: 'Overview' }]}>
      <SEO title="Dashboard" />
      {/* {sessions ? <Home {...props} sessions={sessions} /> : <></>} */}

      {sessions ? <Dashboard {...props} sessions={sessions} /> : <></>}

      <div className="fixed top-0 h-full w-full flex justify-center items-center opacity-100 z-5 pointer-events-none">
        <FancyLoader loading={!sessions} />
      </div>
    </AppLayout>
  )
}

export default Index
