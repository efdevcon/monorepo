import { AppLayout } from 'components/domain/app/Layout'
import { SideEvents } from 'components/domain/app/side-events'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import getNotionDatabase from 'components/domain/devcon-week/getNotionDatabase'
import { SEO } from 'components/domain/seo'

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <SEO title='Community Curated Side Events' />
      <SideEvents {...props} />
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      ...(await getGlobalData(context.locale, true)),
      page: DEFAULT_APP_PAGE,
      scheduleData: await getNotionDatabase(context.locale || 'en', 'cc11ba1c0daa40359710c0958da7739c'),
    },
    revalidate: 1 * 60 * 60,
  }
}
