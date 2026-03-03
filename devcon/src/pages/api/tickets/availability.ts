import type { NextApiRequest, NextApiResponse } from 'next'
import { getQuotaAvailability } from 'services/pretix'

const DEFAULT_QUOTA_ID = parseInt(process.env.PRETIX_DEFAULT_QUOTA_ID || '116')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(400).json({ code: 400, message: 'Invalid method.' })
  }

  try {
    const data = await getQuotaAvailability(DEFAULT_QUOTA_ID)
    return res.status(200).json({
      code: 200,
      message: '',
      data: {
        id: String(DEFAULT_QUOTA_ID),
        available_number: data.available_number,
        available: data.available,
      },
    })
  } catch (error) {
    console.error('Unable to fetch ticket availability:', error)
    return res.status(500).json({ code: 500, message: 'Unable to fetch ticket quota' })
  }
}
