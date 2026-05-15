/**
 * Validate Voucher API
 * POST /api/x402/tickets/validate-voucher
 *
 * Validates a voucher code against Pretix and returns discount info
 * with applicable tickets and their discounted prices.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { validateVoucher, applyVoucherDiscount, getTicketPurchaseInfo } from 'services/pretix'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { code } = req.body
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return res.status(400).json({ success: false, error: 'Voucher code is required' })
  }

  try {
    const voucher = await validateVoucher(code.trim())

    if (!voucher.valid) {
      return res.status(200).json({ success: true, valid: false, error: voucher.error })
    }

    // Get ticket info to compute applicable tickets + discounted prices
    const ticketInfo = await getTicketPurchaseInfo()
    const admissionTickets = ticketInfo.tickets.filter((t) => t.isAdmission && t.available)

    const applicableTickets = admissionTickets
      .filter((t) => !voucher.itemId || t.id === voucher.itemId)
      .map((t) => ({
        id: t.id,
        name: t.name,
        originalPrice: t.price,
        discountedPrice: applyVoucherDiscount(t.price, voucher),
      }))

    return res.status(200).json({
      success: true,
      valid: true,
      code: voucher.code,
      priceMode: voucher.priceMode,
      value: voucher.value,
      itemId: voucher.itemId,
      applicableTickets,
    })
  } catch (error) {
    console.error('Error validating voucher:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to validate voucher: ${(error as Error).message}`,
    })
  }
}
