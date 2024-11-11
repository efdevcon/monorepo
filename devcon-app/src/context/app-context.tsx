import { createContext, useContext, useEffect, useState } from 'react'
import moment, { Moment } from 'moment'

type AppContextProps = {
  children?: any
}

type AppContext = {
  now: null | Moment
}

const Context = createContext<AppContext>({ now: null })

export const useAppContext = () => {
  return useContext(Context)
}

export const AppContext = (props: AppContextProps) => {
  const [currentTime, setCurrentTime] = useState<Moment | null>(null)

  // Sync current time periodically to keep time related functionality up to date
  useEffect(() => {
    // const mockedTime = moment.utc('2024-10-23T19:00:00Z').utcOffset(7)
    // const mockedTime = moment.utc('2024-11-14T05:39:00Z').add(7, 'hours') // First day devcon
    // // const mockedTime = moment.utc('2024-11-13T09:30:00Z') // Second day devcon
    // // const mockedTime = moment.utc('2024-11-14T08:00:00Z') // Third day devcon
    // // const mockedTime = moment.utc('2024-11-15T08:00:00Z') // Fourth day devcon
    // setCurrentTime(mockedTime)

    // return

    const clear = setInterval(() => {
      setCurrentTime(moment.utc().add(7, 'hours'))
    }, 1000 * 60)

    setCurrentTime(moment.utc().add(7, 'hours'))

    return () => clearInterval(clear)
  }, [])

  return <Context.Provider value={{ now: currentTime }}>{props.children}</Context.Provider>
}
