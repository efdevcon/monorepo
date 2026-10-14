// Public, no auth: is this token still open? Polled by the buyer page so a
// share closed from the admin flips to "already used" without a refresh.
// Answers nothing else (no title, no URL); tokens are unguessable anyway.
import type { NextApiRequest, NextApiResponse } from 'next'
import { getShareByToken } from 'services/qr-shares'
import { ENV, fail } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed')
  const token = String(req.query.token ?? '').toLowerCase()
  if (!/^[a-z2-7]{12}$/.test(token)) return fail(res, 400, 'bad token')
  res.setHeader('Cache-Control', 'no-store')
  try {
    const share = await getShareByToken(token, ENV)
    return res.status(200).json({ success: true, open: !!share && share.status !== 'closed' })
  } catch {
    // Unknown right now: say open, the next poll will tell.
    return res.status(200).json({ success: true, open: true })
  }
}
