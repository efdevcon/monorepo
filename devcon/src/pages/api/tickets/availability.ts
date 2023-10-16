import type { NextApiRequest, NextApiResponse } from 'next'
import { GetTicketQuota } from 'services/tickets'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const data = await GetTicketQuota()
    if (data) {
      return res.status(200).send({ code: 200, message: '', data: data })
    }
    
    return res.status(500).send({ code: 500, message: 'Unable to fetch ticket quota' })
  }

  return res.status(400).send({ code: 400, message: 'Invalid method.' })
}
