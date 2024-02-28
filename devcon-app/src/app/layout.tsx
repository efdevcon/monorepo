// import { AppLayout } from 'components/domain/app/Layout'
// import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { Libre_Franklin, Abhaya_Libre } from 'next/font/google'
// import { DEFAULT_APP_PAGE } from 'utils/constants'
// import { getGlobalData } from 'services/global'

// import { SEO } from 'components/domain/seo'
// import { GetAppNotifications } from 'services/notifications'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
// import { DataProvider } from './data-context'
import { GetSessions, GetSpeakers } from './event-data/programming'
import DataWrapper from './data-provider'

const APP_NAME = 'PWA App'
const APP_DEFAULT_TITLE = 'My Awesome PWA App'
const APP_TITLE_TEMPLATE = '%s - PWA App'
const APP_DESCRIPTION = 'Best PWA app in the world!'

// export const metadata: Metadata = {
//   applicationName: APP_NAME,
//   title: {
//     default: APP_DEFAULT_TITLE,
//     template: APP_TITLE_TEMPLATE,
//   },
//   description: APP_DESCRIPTION,
//   appleWebApp: {
//     capable: true,
//     statusBarStyle: 'default',
//     title: APP_DEFAULT_TITLE,
//     // startUpImage: [],
//   },
//   formatDetection: {
//     telephone: false,
//   },
//   openGraph: {
//     type: 'website',
//     siteName: APP_NAME,
//     title: {
//       default: APP_DEFAULT_TITLE,
//       template: APP_TITLE_TEMPLATE,
//     },
//     description: APP_DESCRIPTION,
//   },
//   twitter: {
//     card: 'summary',
//     title: {
//       default: APP_DEFAULT_TITLE,
//       template: APP_TITLE_TEMPLATE,
//     },
//     description: APP_DESCRIPTION,
//   },
// }

const fontPrimary = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-primary',
  display: 'swap',
  weight: ['200', '400'],
})

const fontSecondary = Abhaya_Libre({
  subsets: ['latin'],
  variable: '--font-secondary',
  display: 'swap',
  weight: ['400'],
})

const RootLayout = async ({ children }: any) => {
  const sessions = await GetSessions()

  return (
    <html lang="en" className={`${fontPrimary.variable} ${fontSecondary.variable}`}>
      <body>
        {/* {React.Children.map(children, child => React.cloneElement(child, { sessions }))} */}
        <DataWrapper data={{ sessions }}>{children}</DataWrapper>
        {/* <AppLayout>{children}</AppLayout> */}
      </body>
    </html>
  )
}

// export async function getStaticProps(context: any) {
//   return {
//     props: {
//       appNotifications: await GetAppNotifications(),
//       page: DEFAULT_APP_PAGE,
//     },
//   }
// }

export default RootLayout
