import React from 'react'
import 'styles/globals.scss'
import type { AppProps } from 'next/app'
import { Roboto, Roboto_Condensed } from 'next/font/google'
export const roboto = Roboto({ subsets: ['latin'], variable: '--font-roboto', weight: ['400', '700'], display: 'swap' })
export const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  variable: '--font-roboto-condensed',
  weight: ['400', '700'],
})
import { init } from '@socialgouv/matomo-next'

const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = '29'
let matomoAdded = false

// Safari 100vh works poorly - this is the workaround
if (typeof window !== 'undefined') {
  const appHeight = () => {
    const doc = document.documentElement
    doc.style.setProperty('--viewport-height', `${window.innerHeight}px`)
  }

  window.addEventListener('resize', appHeight)
  window.addEventListener('orientationchange', appHeight)

  appHeight()
}

function MyApp({ Component, pageProps }: AppProps) {
  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  return (
    <>
      <style jsx global>{`
        html {
          --font-roboto: ${roboto.style.fontFamily};
          --font-roboto-condensed: ${robotoCondensed.style.fontFamily};
        }
      `}</style>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
