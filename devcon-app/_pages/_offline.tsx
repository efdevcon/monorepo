import React from 'react'
import { pageHOC } from 'context/pageHOC'
import { GetPage } from 'services/page'
import { getGlobalData } from 'services/global'
import { AppLayout } from 'components/domain/app/Layout'
import { Link } from 'components/common/link'
import { AppNav } from 'components/domain/app/navigation'
import { DEFAULT_APP_PAGE } from 'utils/constants'

const Offline = pageHOC(() => {
  return (
    <AppLayout>
      <>
        <AppNav
          nested
          links={[
            {
              title: 'Offline',
            },
          ]}
        />

        <div className="section clear-top clear-bottom">
          <p>
            You are currently offline and this page was not cached.&nbsp;
            <Link to="/" className="generic">
              Go back to home.
            </Link>
          </p>
        </div>
      </>
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context, true)

  return {
    props: {
      ...globalData,
      page: DEFAULT_APP_PAGE,
    },
  }
}

export default Offline
