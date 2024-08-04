import { TicketQuota } from 'types/TicketQuota'
require('dotenv').config()

const baseUrl = 'https://ticketh.xyz/api/v1/'
const pretixOrganizerName = 'devcon'
const pretixEventName = '7'
const pretixProductId = '116'

export async function GetTicketQuota(id: string = ''): Promise<TicketQuota | undefined> {
  const productId = id || pretixProductId
  const response = await fetch(
    `${baseUrl}organizers/${pretixOrganizerName}/events/${pretixEventName}/quotas/${productId}/availability/`,
    {
      headers: {
        Authorization: `Token ${process.env.PRETIX_API_KEY}`,
      },
    }
  )

  try {
    const data = await response.json()

    if (!data) return

    return {
      id: productId,
      available_number: data.available_number,
      available: data.available,
    } as TicketQuota
  } catch (e) {
    console.log('Unable to fetch ticket availability..')
    console.error(e)
  }
}
