import type { AppProps } from 'next/app'
import React, { useEffect, useCallback, useState } from 'react'
import Head from 'next/head'
import { PWAPrompt } from 'components/domain/app/pwa-prompt'
import 'assets/css/index.scss'
import { Session as SessionType } from 'types/Session'
import { SEO } from 'components/domain/seo'
import { Web3Provider } from 'context/web3'
import { AppContext } from 'context/app-context'
import { AccountContextProvider } from 'context/account-context-provider'
import DevaBot from 'lib/components/ai/overlay'
import { useSessionData } from 'services/event-data'
import { NotificationCard } from 'components/domain/app/dc7/profile/notifications'
import { useAccountContext } from 'context/account-context'
import { ZupassProvider } from 'context/zupass'
import { SessionCard } from 'components/domain/app/dc7/sessions'
import { Speaker as SpeakerType } from 'types/Speaker'
import router, { useRouter } from 'next/router'
import { Toaster } from 'lib/components/ui/toaster'
import { usePathname } from 'next/navigation'
import { DataProvider } from 'context/data'
import { init } from '@socialgouv/matomo-next'
import { useAppStore, useSeenNotifications, initialFilterState, initialSpeakerFilterState } from 'store/app-store'

const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = process.env.PUBLIC_MATOMO_SITE_ID || '38'
let matomoAdded = false

// Re-export for backwards compatibility with other files
export { initialFilterState, initialSpeakerFilterState }

// Dismissable banner for Devcon 8 prep
function Devcon8Banner() {
  const [dismissed, setDismissed] = useState(true) // Start hidden to avoid flash

  useEffect(() => {
    const isDismissed = localStorage.getItem('devcon8-banner-dismissed') === 'true'
    setDismissed(isDismissed)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('devcon8-banner-dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#7d52f4] text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
      <span>
        🚧 We're preparing the app for Devcon 8 in Mumbai — some features may be unavailable or behave unexpectedly.
      </span>
      <button
        onClick={handleDismiss}
        className="ml-2 hover:opacity-80 font-bold text-lg leading-none"
        aria-label="Dismiss banner"
      >
        ×
      </button>
    </div>
  )
}

// @ts-ignore
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  // @ts-ignore
  window.workbox !== undefined &&
  !window.location.pathname.includes('/room-screens')
) {
  // @ts-ignore
  const wb = window.workbox

  const promptNewVersionAvailable = (event: any) => {
    // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
    // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
    // You may want to customize the UI prompt accordingly.
    if (confirm('New update downloaded, please refresh.')) {
      wb.addEventListener('controlling', (event: any) => {
        window.location.reload()
      })

      // Send a message to the waiting service worker, instructing it to activate.
      wb.messageSkipWaiting()
    } else {
      console.log(
        'User rejected to reload the web app, keep using old version. New version will automatically load when user opens the app next time.'
      )
    }
  }

  wb.addEventListener('waiting', promptNewVersionAvailable)
}

const withProviders = (Component: React.ComponentType<AppProps>) => {
  return (props: AppProps) => (
    <DataProvider>
      <Web3Provider>
        <AccountContextProvider>
          <ZupassProvider>
            <Component {...props} />
          </ZupassProvider>
        </AccountContextProvider>
      </Web3Provider>
    </DataProvider>
  )
}

function App({ Component, pageProps }: AppProps) {
  const devaBotVisible = useAppStore(state => state.devaBotVisible)
  const setDevaBotVisible = useAppStore(state => state.setDevaBotVisible)
  const sessions = useSessionData()
  const notifications = useAppStore(state => state.notifications)
  const setNotifications = useAppStore(state => state.setNotifications)
  const setRooms = useAppStore(state => state.setRooms)
  const accountContext = useAccountContext()
  const { seenNotifications, markAllAsRead, notificationsCount, syncWithLocalStorage } = useSeenNotifications()
  const routerInstance = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  // Sync seen notifications with localStorage on mount and storage events
  useEffect(() => {
    syncWithLocalStorage()

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'seenNotifications') {
        syncWithLocalStorage()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [syncWithLocalStorage])

  useEffect(() => {
    if (pageProps.rooms) {
      setRooms(pageProps.rooms)
    }
  }, [pageProps, setRooms])

  useEffect(() => {
    fetchNotifications()
  }, [accountContext.account])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'https://api.devcon.org'}/notifications`,
        { credentials: 'include' }
      )
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  return (
    <>
      <Devcon8Banner />
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="application-name" content="Devcon Passport" />
        <meta name="apple-mobile-web-app-title" content="Devcon Passport" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />

        <SEO />
      </Head>

      <AppContext>
        <PWAPrompt />

        <Component {...pageProps} />

        {sessions && (
          <DevaBot
            botVersion="devcon-app"
            sessions={sessions}
            onToggle={(message: string | boolean) => setDevaBotVisible(message)}
            defaultPrompt={typeof devaBotVisible === 'string' ? devaBotVisible : undefined}
            setDefaultPrompt={() => setDevaBotVisible(true)}
            toggled={!!devaBotVisible}
            notifications={notifications || undefined}
            notificationsCount={notificationsCount}
            markNotificationsAsRead={markAllAsRead}
            SessionComponent={SessionCard}
            renderNotifications={() => {
              const groupNotificationsByDay = (notifications: any[]): [string, any[]][] => {
                const grouped = notifications.reduce((acc, notification) => {
                  const date = new Date(notification.sendAt)
                  const today = new Date()
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)

                  let key
                  if (date.toDateString() === today.toDateString()) {
                    key = 'Today'
                  } else if (date.toDateString() === yesterday.toDateString()) {
                    key = 'Yesterday'
                  } else {
                    key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  }

                  if (!acc[key]) {
                    acc[key] = []
                  }
                  acc[key].push(notification)
                  return acc
                }, {} as Record<string, any[]>)

                return (Object.entries(grouped) as [string, any[]][]).sort(([a], [b]) => {
                  if (a === 'Today') return -1
                  if (b === 'Today') return 1
                  if (a === 'Yesterday') return -1
                  if (b === 'Yesterday') return 1
                  return new Date(b).getTime() - new Date(a).getTime()
                })
              }

              const groupedNotifications = groupNotificationsByDay(notifications)

              return (
                <>
                  {groupedNotifications.map(([date, notificationsForDay]: [string, any[]]) => (
                    <div key={date} className="w-full">
                      <p className="font-semibold my-2">{date}</p>
                      {notificationsForDay.map((notification: any) => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          seen={seenNotifications.has(notification.id)}
                        />
                      ))}
                    </div>
                  ))}
                </>
              )
            }}
          />
        )}
      </AppContext>
      <Toaster />
    </>
  )
}

export default withProviders(App)
