import type { NextApiRequest, NextApiResponse } from 'next'
import { sendVoucherEmail } from 'services/voucherEmail'
import { getClientIp } from 'utils/getClientIp'
import { checkVoucherEmailRateLimit } from 'services/discountStore'

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

  // M10 (1): rate-limit per IP + per recipient. The endpoint is unauthenticated
  // and used to be unrate-limited, doubling as a phishing-assist relay
  // (Devcon-branded email blast to any address using any known-valid voucher).
  // 429 still reveals throttle state but bounds abuse rate to <=10/min/IP.
  const clientIp = getClientIp(req)
  const { allowed } = await checkVoucherEmailRateLimit(clientIp, email)
  if (!allowed) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' })
  }

  // M10 (2): constant 200/{success:true} response shape regardless of voucher
  // validity or SMTP outcome. Pre-fix code returned 500 + a discriminating
  // error message on invalid/expired codes vs valid-but-SMTP-failed, which
  // turned the endpoint into a brute-force oracle for the voucher-code
  // namespace. Errors are still logged server-side for diagnostics.
  try {
    await sendVoucherEmail(email, voucherCode)
  } catch (err) {
    console.warn('[send-voucher-email] swallowed error to suppress oracle:', err)
  }
  return res.status(200).json({ success: true })
}
