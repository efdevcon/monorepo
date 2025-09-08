import { useState, useEffect } from 'react'
import moment, { Moment } from 'moment'

export const useNow = (override?: string | Date | Moment): Moment => {
  const [now, setNow] = useState(() => 
    override ? moment(override) : moment()
  )

  useEffect(() => {
    if (override) {
      setNow(moment(override))
      return
    }

    const updateNow = () => setNow(moment())
    
    // Update every minute
    const interval = setInterval(updateNow, 60000)
    
    return () => clearInterval(interval)
  }, [override])

  return now
}