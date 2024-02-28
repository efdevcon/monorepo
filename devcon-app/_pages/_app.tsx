import type { AppProps } from 'next/app'
import React from 'react'
import { NextIntlProvider } from 'next-intl'
import Head from 'next/head'
import { PWAPrompt } from 'components/domain/app/pwa-prompt'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { HistoryTracker } from 'components/domain/app/history-tracker'
import { SEO } from 'components/domain/seo'
import { ScheduleState } from 'components/domain/app/schedule/Schedule'

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
        <PWAPrompt />
        <HistoryTracker>
          <ScheduleState {...pageProps}>
            <Component {...pageProps} />
            {/* <ComponentWithSchedule {...pageProps} /> */}
          </ScheduleState>
        </HistoryTracker>
      </NextIntlProvider>
    </>
  )
}

export default App
