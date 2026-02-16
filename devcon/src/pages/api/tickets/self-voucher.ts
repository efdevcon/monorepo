import type { NextApiRequest, NextApiResponse } from 'next'

// Read from the same globalThis store that redeem-self writes to
const g = globalThis as unknown as { __selfVoucherStore?: Map<string, string> }

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const userId = req.query.userId as string
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  const voucherCode = g.__selfVoucherStore?.get(userId)
  if (!voucherCode) {
    return res.status(404).json({ error: 'No voucher found. Verification may still be in progress.' })
  }

  return res.status(200).json({ voucherCode })
}
