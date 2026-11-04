import type { NextApiRequest, NextApiResponse } from 'next'
import { getUpiPrices } from 'services/upiPrices'

/**
 * Rupee (UPI) prices by Pretix item id, for the /tickets tables, the
 * comparison and the store cards. Public figures (the Pretix shop shows
 * them), so the response is CDN-cached for five minutes; `getItems` is
 * cached in-process for a minute on top.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(400).json({ code: 400, message: 'Invalid method.' })
  }
  try {
    const prices = await getUpiPrices()
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    return res.status(200).json({ code: 200, message: '', data: { prices } })
  } catch (error) {
    console.error('Unable to fetch UPI prices:', error)
    return res.status(500).json({ code: 500, message: 'Unable to fetch UPI prices' })
  }
}
