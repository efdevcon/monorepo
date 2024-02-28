import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import UsernameSettings from 'components/domain/app/account/settings/Username'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { GetBlogs } from 'services/blogs'
import { getGlobalData } from 'services/global'
import { DEFAULT_APP_PAGE } from 'utils/constants'

export default pageHOC((props: any) => {
  return <AppLayout>
    <PrivatePage>
      <UsernameSettings {...props} />
    </PrivatePage>
  </AppLayout>
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