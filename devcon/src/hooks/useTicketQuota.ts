import { useEffect, useState } from 'react'
import { TicketQuota } from 'types/TicketQuota'
import { useInterval } from './useInterval'

export function useTicketQuota(quota: TicketQuota | undefined, interval: number = 10000) {
  const [availability, setAvailability] = useState<TicketQuota | undefined>(quota)

  useEffect(() => {
    async function asyncEffect() {
      await trySetQuota()
    }

    asyncEffect()
  }, [])

  useInterval(async () => {
    await trySetQuota()
  }, interval)

  async function trySetQuota() {
    // 'Sold out' for testing purposes
    // setAvailability({
    //   id: '5',
    //   available_number: 0,
    //   available: false,
    // })
    // return

    try {
      const response = await fetch('/api/tickets/availability')
      const body = await response.json()
      setAvailability(body.data)
      return
    } catch (e) {
      console.log('Unable to fetch availability')
    }
  }

  return availability
}
