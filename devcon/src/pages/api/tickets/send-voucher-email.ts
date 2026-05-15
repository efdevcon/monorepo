import type { NextApiRequest, NextApiResponse } from 'next'
import { sendVoucherEmail } from 'services/voucherEmail'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { email, voucherCode } = req.body

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email address is required' })
  }

  if (!voucherCode || typeof voucherCode !== 'string' || !voucherCode.trim()) {
    return res.status(400).json({ success: false, error: 'Voucher code is required' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'Invalid email address format' })
  }

  const result = await sendVoucherEmail(email, voucherCode)

  if (result.success) {
    return res.status(200).json({ success: true })
  }
  return res.status(500).json({ success: false, error: result.error })
}
