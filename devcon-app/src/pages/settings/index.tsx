import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import SettingsPage from 'components/domain/app/account/Settings'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { GetBlogs } from 'services/blogs'
import { DEFAULT_APP_PAGE } from 'utils/constants'

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
      blogs: await GetBlogs(),
      page: DEFAULT_APP_PAGE,
    },
  }
}
