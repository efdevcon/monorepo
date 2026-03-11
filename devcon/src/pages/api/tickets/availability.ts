import type { NextApiRequest, NextApiResponse } from 'next'
import { getQuotaAvailability } from 'services/pretix'
import { hasAvailableVouchers } from 'services/discountStore'
import { TICKETING } from 'config/ticketing'

const DEFAULT_QUOTA_ID = TICKETING.pretix.defaultQuotaId

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(400).json({ code: 400, message: 'Invalid method.' })
  }

  try {
    const [data, vouchersAvailable] = await Promise.all([
      getQuotaAvailability(DEFAULT_QUOTA_ID),
      hasAvailableVouchers().catch(() => undefined),
    ])
    return res.status(200).json({
      code: 200,
      message: '',
      data: {
        id: String(DEFAULT_QUOTA_ID),
        available_number: data.available_number,
        available: data.available,
        vouchers_available: vouchersAvailable,
      },
    })
  } catch (error) {
    console.error('Unable to fetch ticket availability:', error)
    return res.status(500).json({ code: 500, message: 'Unable to fetch ticket quota' })
  }
}
