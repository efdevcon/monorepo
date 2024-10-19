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
import DevaBot from 'lib/components/ai/overlay'
import { RecoilRoot, atom, useRecoilState } from 'recoil'
import { useSessionData } from 'services/event-data'

export const devaBotVisibleAtom = atom({
  key: 'devaBotVisible',
  default: false,
})

const withRecoil = (Component: React.ComponentType<AppProps>) => {
  return (props: AppProps) => (
    <RecoilRoot>
      <Component {...props} />
    </RecoilRoot>
  )
}

function App({ Component, pageProps }: AppProps) {
  const [devaBotVisible, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const sessions = useSessionData()

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
          <AppContext>
            <Web3Provider>
              <AccountContextProvider>
                {/* <ScheduleState {...pageProps}> */}
                <Component {...pageProps} />
                {/* </ScheduleState> */}
              </AccountContextProvider>
            </Web3Provider>
          </AppContext>
        </HistoryTracker>
      </NextIntlProvider>

      <DevaBot sessions={sessions} onToggle={() => setDevaBotVisible(!devaBotVisible)} toggled={devaBotVisible} />
    </>
  )
}

export default withRecoil(App)
