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

const isBrowser = typeof window !== 'undefined'

export const AppContext = (props: AppContextProps) => {
  const [currentTime, setCurrentTime] = useState<Moment | null>(null)
  const pageContext = usePageContext()
  const [seenNotifications, setSeenNotifications] = useState({})

  // Sync current time periodically to keep time related functionality up to date
  useEffect(() => {
    const clear = setInterval(() => {
      setCurrentTime(moment.utc().subtract(5, 'hours'))
    }, 1000 * 60)

    // setCurrentTime(moment.utc())
    setCurrentTime(moment.utc().subtract(5, 'hours'))

    return () => clearInterval(clear)
  }, [])

  useEffect(() => {
    if (!pageContext?.appNotifications) return

    const seenNotifications = {} as any

    if (!isBrowser) return
    pageContext.appNotifications?.forEach(notification => {
      try {
        const seen = window.localStorage.getItem(`notification-seen-${notification.id}`)

        if (seen) {
          seenNotifications[notification.id] = true
        }
      } catch (error) {
        console.log(error)
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
