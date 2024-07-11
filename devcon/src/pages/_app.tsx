import React from 'react'
import { IntlProvider } from 'next-intl'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { SEO } from 'components/domain/seo'
import { init } from '@socialgouv/matomo-next'
import { SessionProvider } from 'next-auth/react'
import { Web3ModalProvider } from 'context/web3modal'

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

      <IntlProvider messages={pageProps.messages} locale="en">
        <SessionProvider session={pageProps.session}>
          <Web3ModalProvider>
            <Component {...pageProps} />
          </Web3ModalProvider>
        </SessionProvider>
      </IntlProvider>
    </>
  )
}

export default App
