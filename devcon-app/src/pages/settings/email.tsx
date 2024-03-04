import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import EmailSettings from 'components/domain/app/account/settings/Email'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { GetBlogs } from 'services/blogs'
import { DEFAULT_APP_PAGE } from 'utils/constants'
// import { getGlobalData } from 'services/global'

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <PrivatePage>
        <EmailSettings {...props} />
      </PrivatePage>
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      // ...(await getGlobalData(context.locale, true)),
      blogs: await GetBlogs(),
      page: DEFAULT_APP_PAGE,
    },
  }
}
