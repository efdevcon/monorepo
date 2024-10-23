import type { AppProps } from 'next/app'
import React, { useState, useEffect, useCallback } from 'react'
import { NextIntlProvider } from 'next-intl'
import Head from 'next/head'
import { PWAPrompt } from 'components/domain/app/pwa-prompt'
import 'assets/css/index.scss'
import { HistoryTracker } from 'components/domain/app/history-tracker'
import { Session as SessionType } from 'types/Session'
import { SEO } from 'components/domain/seo'
import { ScheduleState } from 'components/domain/app/schedule/Schedule'
import { Web3Provider } from 'context/web3'
import { AppContext } from 'context/app-context'
import { AccountContextProvider } from 'context/account-context-provider'
import DevaBot from 'lib/components/ai/overlay'
import { RecoilRoot, atom, useRecoilState, useRecoilValue, selector } from 'recoil'
import { useSessionData } from 'services/event-data'
import { FancyLoader } from 'lib/components/loader/loader'
import { NotificationCard } from 'components/domain/app/dc7/profile/notifications'
import { useAccountContext } from 'context/account-context'
import { ZupassProvider } from 'context/zupass'
import { SessionCard } from 'components/domain/app/dc7/sessions'
// Short on time so just doing global state here.. extract later
export const devaBotVisibleAtom = atom<boolean | string>({
  key: 'devaBotVisible',
  default: false,
})

export const sessionsAtom = atom<SessionType[]>({
  key: 'sessions',
  default: [],
})

export const notificationsAtom = atom<any[]>({
  key: 'notifications',
  default: [],
})

export const notificationsCountSelector = selector({
  key: 'notificationsCountSelector',
  get: ({ get }) => {
    if (typeof window === 'undefined') return 0

    const notifications = get(notificationsAtom)
    const seenNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]')
    return notifications.filter(notification => !seenNotifications.includes(notification.id)).length
  },
})

export const markAllAsRead = (notifications: any[]) => {
  const notificationIds = notifications.map(notification => notification.id)
  localStorage.setItem('seenNotifications', JSON.stringify(notificationIds))
  // Optionally, you can update the Recoil state to trigger a re-render
  // setNotifications([...notifications]);
}

const seenNotificationsAtom = atom<Set<string>>({
  key: 'seenNotificationsAtom',
  default:
    typeof window !== 'undefined' ? new Set(JSON.parse(localStorage.getItem('seenNotifications') || '[]')) : new Set(),
})

export const useSeenNotifications = () => {
  const [notifications, setNotifications] = useRecoilState(notificationsAtom)
  const notificationsCount = useRecoilValue(notificationsCountSelector)
  const [seenNotifications, setSeenNotifications] = useRecoilState(seenNotificationsAtom)

  const syncWithLocalStorage = useCallback(() => {
    const storedNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]')
    setSeenNotifications(new Set(storedNotifications))
  }, [setSeenNotifications])

  useEffect(() => {
    // Initial sync
    syncWithLocalStorage()

    // Listen for storage events
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

  const markAllAsRead = useCallback(() => {
    setSeenNotifications(() => {
      const updated = new Set([...notifications.map(n => n.id)])
      localStorage.setItem('seenNotifications', JSON.stringify(Array.from(updated)))
      return updated
    })

    setNotifications([...notifications])
  }, [notifications, setSeenNotifications])

  return { seenNotifications, markAllAsRead, notificationsCount }
}

const withProviders = (Component: React.ComponentType<AppProps>) => {
  return (props: AppProps) => (
    <RecoilRoot>
      <AccountContextProvider>
        <Component {...props} />
      </AccountContextProvider>
    </RecoilRoot>
  )
}

function App({ Component, pageProps }: AppProps) {
  const [devaBotVisible, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const sessions = useSessionData()
  const [notifications, setNotifications] = useRecoilState(notificationsAtom)
  const accountContext = useAccountContext()
  const { seenNotifications, markAllAsRead, notificationsCount } = useSeenNotifications()

  useEffect(() => {
    fetchNotifications()
  }, [accountContext.account])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'}/notifications`,
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
        {/* <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2B5797" />
        <meta name="msapplication-tap-highlight" content="no" /> */}
        <meta name="theme-color" content="#000000" />

        <SEO />
      </Head>

      <NextIntlProvider locale="en" messages={pageProps.messages}>
        <PWAPrompt />
        <HistoryTracker>
          <AppContext>
            <Web3Provider>
              <ZupassProvider>
                {!sessions && (
                  <div
                    data-type="loader"
                    className="h-screen w-screen flex items-center justify-center flex-col fixed top-0 left-0 gap-2"
                  >
                    <FancyLoader loading={!sessions} />
                    <p className="text-sm text-gray-500">Please wait while we prepare your Devcon Passport...</p>
                  </div>
                )}

                <Component {...pageProps} />

                {/* <AnimatePresence>
                {sessions && revealApp && (
                  <motion.div
                    className="absolute inset-0 z-10"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Component {...pageProps} />
                  </motion.div>
                )} */}
              </ZupassProvider>
            </Web3Provider>
          </AppContext>
        </HistoryTracker>
      </NextIntlProvider>

      {sessions && (
        <DevaBot
          sessions={sessions}
          onToggle={() => setDevaBotVisible(!devaBotVisible)}
          defaultPrompt={typeof devaBotVisible === 'string' ? devaBotVisible : undefined}
          toggled={!!devaBotVisible}
          notifications={accountContext.account ? notifications : undefined}
          notificationsCount={notificationsCount}
          markNotificationsAsRead={markAllAsRead}
          SessionComponent={SessionCard}
          renderNotifications={() => {
            const groupNotificationsByDay = (notifications: any[]) => {
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
              }, {})

              return Object.entries(grouped).sort(([a], [b]) => {
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
                {groupedNotifications.map(([date, notificationsForDay]: any) => (
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
    </>
  )
}

export default withProviders(App)
