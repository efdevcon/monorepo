import LoginPage from 'components/domain/app/account/Login'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { SEO } from 'components/domain/seo'

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <SEO title="Passport" description="Your personalized passport to the Devcon experience." />
      <LoginPage {...props} />
    </AppLayout>
  )
})

// export async function getStaticProps(context: any) {
//   return {
//     props: {
//       ...(await getGlobalData(context.locale, true)),
//       page: DEFAULT_APP_PAGE,
//     },
//   }
// }
