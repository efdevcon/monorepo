import type { AppProps } from 'next/app'
import { NextIntlProvider } from 'next-intl'
import Head from 'next/head'

import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { SEO } from 'components/domain/seo'

function App({ Component, pageProps }: any) {
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
