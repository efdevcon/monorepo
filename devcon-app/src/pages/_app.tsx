import type { AppProps } from 'next/app'
import React, { useState } from 'react'
import { NextIntlProvider } from 'next-intl'
import Head from 'next/head'
import { PWAPrompt } from 'components/domain/app/pwa-prompt'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { HistoryTracker } from 'components/domain/app/history-tracker'
import { SEO } from 'components/domain/seo'
import { ScheduleState } from 'components/domain/app/schedule/Schedule'
import { Web3Provider } from 'context/web3'
import { AppContext } from 'context/app-context'
import { AccountContextProvider } from 'context/account-context-provider'

const Banner = () => {
  const [isVisible, setIsVisible] = useState(true)

  // Only render in production mode
  if (process.env.NODE_ENV !== 'production' || !isVisible) return null

  return (
    <div className="bg-red-100 border-b border-red-200 py-2 fixed top-0 w-full z-50 section shadow-lg">
      <div className="flex justify-between items-center gap-2">
        <p className="text-red-700">This app is from Devcon 6 in Bogota and contains outdated information.</p>
        <button onClick={() => setIsVisible(false)} className="text-red-700 hover:text-red-900 shrink-0 !text-sm">
          UNDERSTOOD ✕
        </button>
      </div>
    </div>
  )
}

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <SEO />
      </Head>

      <NextIntlProvider locale="en" messages={pageProps.messages}>
        <Banner />
        <PWAPrompt />
        <HistoryTracker>
          <AppContext>
            <Web3Provider>
              <AccountContextProvider>
                <ScheduleState {...pageProps}>
                  <Component {...pageProps} />
                </ScheduleState>
              </AccountContextProvider>
            </Web3Provider>
          </AppContext>
        </HistoryTracker>
      </NextIntlProvider>
    </>
  )
}

export default App
