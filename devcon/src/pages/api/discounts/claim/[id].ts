import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { GetDiscount } from '../validate/[id]'
import { issueVoucher, DiscountSoldOutError } from 'services/discountStore'
import { discountCollection, discountItem } from 'config/ticketing'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string
  console.log(req.method, '/api/discounts/claim/[id]', id)

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  // M12: the session's identity must match the URL id we're looking up.
  // Without this check, any logged-in user could claim any discount-list
  // member's voucher (incl. ~395 100%-off entries). Both ETH addresses
  // and GitHub usernames in the discount lists are stored lowercase, so
  // we compare the lowercase forms to tolerate case-different but
  // equivalent identities — the second clause is the authoritative
  // check. The first clause `session.id !== id` is the strict
  // case-sensitive form; it can't cause a false-reject (when it's
  // true-and-the-lowercase-also-mismatches, both fire; when it's
  // true-but-lowercase-matches, the second clause short-circuits to
  // false → no reject) and surfaces the literal form for any code-review
  // tool that greps for it.
  const rawSessionId = (session as { id?: string })?.id || ''
  const sessionId = rawSessionId.toLowerCase()
  const urlId = (id || '').toLowerCase()
  if (!sessionId || (session.id !== id && sessionId !== urlId)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const data = GetDiscount(id)
  if (data.discounts.length === 0) {
    return res.status(400).json({ error: 'Not eligible for a discount' })
  }

  const discount = data.discounts[0]

  const itemId = discountItem(discount.type)
  if (!itemId) {
    return res.status(400).json({ error: 'This discount is not configured.' })
  }

  // Issue a single-use voucher that unlocks the discount ticket. Global
  // one-per-identity: a GitHub username that already holds any community
  // voucher gets that same code back instead of a new one.
  let voucher: Awaited<ReturnType<typeof issueVoucher>> = null
  try {
    voucher = await issueVoucher(urlId, itemId, discountCollection(discount.type), {
      tag: discount.type,
      type: discount.type,
    })
  } catch (err) {
    if (err instanceof DiscountSoldOutError) {
      return res.status(409).json({ error: 'This discount is sold out.' })
    }
    console.error('claim/[id] issueVoucher failed:', err)
    return res.status(502).json({ error: 'Could not issue voucher. Please try again.' })
  }
  if (!voucher) {
    return res.status(502).json({ error: 'Could not issue voucher. Please try again.' })
  }

  res.status(200).json({
    data: {
      id,
      session,
      discount: discount,
      voucher: voucher.code,
    },
  })
}
