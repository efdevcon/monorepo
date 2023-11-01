import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import SettingsPage from 'components/domain/app/account/Settings'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { GetBlogs } from 'services/blogs'
import { GetNavigationData } from 'services/navigation'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getMessages } from 'utils/intl'
import { getGlobalData } from 'services/global'

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <PrivatePage>
        <SettingsPage {...props} />
      </PrivatePage>
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      ...(await getGlobalData(context.locale, true)),
      blogs: await GetBlogs(),
      page: DEFAULT_APP_PAGE,
    },
  }
}
