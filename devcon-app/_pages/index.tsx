import { Home } from 'components/domain/app/home'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import { GetSessions, GetSpeakers } from 'services/programming'
import { SEO } from 'components/domain/seo'
// import Button from 'lib/components/button'

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <>
        {/* <Button /> */}
        <SEO title="Dashboard" />
        <Home {...props} />
      </>
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      ...(await getGlobalData(context.locale, true)),
      page: DEFAULT_APP_PAGE,
      sessions: await GetSessions(),
      speakers: await GetSpeakers(),
    },
  }
}
