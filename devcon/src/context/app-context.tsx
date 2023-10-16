import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'
import moment, { Moment } from 'moment'
import { Notification } from 'types/Notification'
import { usePageContext } from 'context/page-context'

type AppContextProps = {
  children?: any
  notifications?: Notification[]
}

type AppContext = {
  now: null | Moment
  seenNotifications: {
    [key: string]: boolean
  }
  setSeenNotifications: Dispatch<SetStateAction<any>>
}

const Context = createContext<AppContext>({ now: null, seenNotifications: {}, setSeenNotifications: () => undefined })

export const useAppContext = () => {
  return useContext(Context)
}

export const AppContext = (props: AppContextProps) => {
  const [currentTime, setCurrentTime] = useState<Moment | null>(null)
  const pageContext = usePageContext()
  const [seenNotifications, setSeenNotifications] = useState({})

  // Sync current time periodically to keep time related functionality up to date
  useEffect(() => {
    const now = process.env.NODE_ENV === 'development' ? moment.utc() : moment.utc()

    const syncTime = () => setCurrentTime(now)

    const clear = setInterval(() => {
      syncTime()
    }, 1000 * 60)

    syncTime()

    return () => clearInterval(clear)
  }, [])

  useEffect(() => {
    if (!pageContext?.appNotifications) return

    const seenNotifications = {} as any

    pageContext.appNotifications?.forEach(notification => {
      const seen = window.localStorage.getItem(`notification-seen-${notification.id}`)

      if (seen) {
        seenNotifications[notification.id] = true
      }
    })

    setSeenNotifications(seenNotifications)
  }, [pageContext?.appNotifications])

  return (
    <Context.Provider value={{ now: currentTime, seenNotifications, setSeenNotifications }}>
      {props.children}
    </Context.Provider>
  )
}
