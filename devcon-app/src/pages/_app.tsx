import type { AppProps } from 'next/app'
import React, { useState } from 'react'
import { NextIntlProvider } from 'next-intl'
import Head from 'next/head'
import { PWAPrompt } from 'components/domain/app/pwa-prompt'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { HistoryTracker } from 'components/domain/app/history-tracker'
import { Session as SessionType } from 'types/Session'
import { SEO } from 'components/domain/seo'
import { ScheduleState } from 'components/domain/app/schedule/Schedule'
import { Web3Provider } from 'context/web3'
import { AppContext } from 'context/app-context'
import { AccountContextProvider } from 'context/account-context-provider'
import DevaBot from 'lib/components/ai/overlay'
import { RecoilRoot, atom, useRecoilState } from 'recoil'
import { useSessionData } from 'services/event-data'
import { FancyLoader } from 'lib/components/loader/loader'

export const devaBotVisibleAtom = atom({
  key: 'devaBotVisible',
  default: false,
})

export const sessionsAtom = atom<SessionType[]>({
  key: 'sessions',
  default: [],
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

  console.log(sessions)

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

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="application-name" content="Devcon Passport" />
        <meta name="apple-mobile-web-app-title" content="Devcon Passport" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2B5797" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#000000" />

        <SEO />
      </Head>

      <NextIntlProvider locale="en" messages={pageProps.messages}>
        <PWAPrompt />
        <HistoryTracker>
          <AppContext>
            <Web3Provider>
              <AccountContextProvider>
                {!sessions && (
                  <div className="h-screen w-screen flex items-center justify-center flex-col fixed top-0 left-0 gap-2">
                    <FancyLoader loading={!sessions} />
                    <p className="text-sm text-gray-500">Please wait while we prepare your Devcon Passport...</p>
                  </div>
                )}

                {/* <ScheduleState {...pageProps}> */}
                {sessions && <Component {...pageProps} />}
                {/* <Component {...pageProps} /> */}
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
