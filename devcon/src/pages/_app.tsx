import React from 'react'
import { NextIntlProvider } from 'next-intl'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { SEO } from 'components/domain/seo'
import { init } from '@socialgouv/matomo-next'

const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = '8'
let matomoAdded = false

function App({ Component, pageProps }: any) {
  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  return (
    <>
      <SEO />

      <NextIntlProvider messages={pageProps.messages}>
        <Component {...pageProps} />
      </NextIntlProvider>
    </>
  )
}

export default App
