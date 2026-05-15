import type { NextApiRequest, NextApiResponse } from 'next'
import { getAssignedVoucher } from '../../../services/discountStore'

// Read from the same globalThis stores that redeem-self writes to
const g = globalThis as unknown as {
  __selfVoucherStore?: Map<string, string>
  __selfErrorStore?: Map<string, string>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const userId = req.query.userId as string
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  // Check in-memory store first (fast path)
  const voucherCode = g.__selfVoucherStore?.get(userId)
  if (voucherCode) {
    return res.status(200).json({ voucherCode })
  }

  const errorReason = g.__selfErrorStore?.get(userId)
  if (errorReason) {
    return res.status(200).json({ error: true, reason: errorReason })
  }

  // Supabase fallback: handles server restarts clearing the in-memory Map
  try {
    const voucher = await getAssignedVoucher(userId)
    if (voucher) {
      return res.status(200).json({ voucherCode: voucher.code })
    }
  } catch (err) {
    console.error('[self-voucher] Supabase fallback error:', err)
  }

  return res.status(404).json({ error: 'No voucher found. Verification may still be in progress.' })
}
