import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { getVoucherCodes } from 'utils/vouchers'
import { GetDiscount } from '../validate/[id]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string
  console.log(req.method, '/api/discounts/claim/[id]', id)

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  // M12: the session's identity must match the URL id we're looking up.
  // Without `session.id !== id` enforcement, any logged-in user could
  // claim any discount-list member's voucher (incl. ~395 100%-off
  // entries). Both ETH addresses and GitHub usernames in the discount
  // lists are stored lowercase, so we compare the lowercase forms to
  // tolerate case-different but equivalent identities.
  const sessionId = ((session as { id?: string })?.id || '').toLowerCase()
  const urlId = (id || '').toLowerCase()
  if (!sessionId || sessionId !== urlId) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const data = GetDiscount(id)
  if (data.discounts.length === 0) {
    return res.status(400).json({ error: 'Not eligible for a discount' })
  }

  const discount = data.discounts[0]
  const voucher = await getVoucherCodes(discount.type as any, discount.index)
  if (!voucher) {
    return res.status(400).json({ error: 'No voucher available' })
  }

  res.status(200).json({
    data: {
      id,
      session,
      discount: discount,
      voucher: voucher,
    },
  })
}
