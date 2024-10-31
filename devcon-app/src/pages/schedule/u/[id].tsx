import { AppLayout } from 'components/domain/app/Layout'
import React, { useEffect } from 'react'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { NoResults } from 'components/common/filter'
import { SEO } from 'components/domain/seo'
import { useRecoilValue } from 'recoil'
import { sessionsAtom } from 'pages/_app'

export default (props: any) => {
  return (
    <AppLayout pageTitle="Your personal schedule" breadcrumbs={[{ label: 'Coming soon' }]}>
      <NoResults text="Please check back later" subtext="Your personal schedule is coming soon!" />
    </AppLayout>
  )
}

export async function getServerSideProps(context: any) {
  return {
    props: {
      page: DEFAULT_APP_PAGE,
      userId: context.params.id,
      userSchedule: {},
    },
  }
}
