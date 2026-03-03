import React from 'react'
// import { IntlProvider } from 'next-intl'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { SEO } from 'components/domain/seo'
import { init } from '@socialgouv/matomo-next'
// import { SessionProvider } from 'next-auth/react'
// import { Web3ModalProvider } from 'context/web3modal'
import { RecoilRoot } from 'recoil'
// import DevaBot from 'lib/components/ai/overlay'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { TICKETING_ENV, TICKETING } from 'config/ticketing'

const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = '8'
let matomoAdded = false

function App({ Component, pageProps }: any) {
  const router = useRouter()
  const isStorePage = router.pathname.startsWith('/tickets/store')

  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <RecoilRoot>
        <SEO />
        {TICKETING_ENV !== 'production' && isStorePage && (
          <div style={{ position: 'fixed', bottom: 12, right: 12, background: '#f59e0b', color: '#000', padding: '8px 16px', fontSize: '16px', fontWeight: 700, borderRadius: 8, zIndex: 9999, pointerEvents: 'none', opacity: 0.9 }}>
            {new URL(TICKETING.pretix.baseUrl).hostname.split('.')[0]} pretix shop
          </div>
        )}

        {/* <IntlProvider messages={pageProps.messages} locale="en"> */}
        {/* <SessionProvider session={pageProps.session}> */}
        {/* <Web3ModalProvider> */}
        <Component {...pageProps} />
        {/* </Web3ModalProvider> */}
        {/* </SessionProvider> */}
        {/* </IntlProvider> */}
      </RecoilRoot>
    </>
  )
}

export default App
