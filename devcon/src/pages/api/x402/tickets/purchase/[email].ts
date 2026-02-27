/**
 * Simplified ticket purchase endpoint
 * GET /api/x402/tickets/purchase/alice@example.com → 402 (first signer claims)
 *
 * Derives attendee name from email local part, auto-selects cheapest
 * available admission ticket, fills required questions with defaults,
 * and delegates to the main purchase handler.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTicketPurchaseInfo } from 'services/pretix'
import { purchaseHandler } from './index'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = req.query.email as string

  // PAYMENT-SIGNATURE retry: delegate directly
  const paymentSigHeader = (req.headers['payment-signature'] ?? req.headers['PAYMENT-SIGNATURE']) as string | undefined
  if (paymentSigHeader) {
    return purchaseHandler(req, res, { requirePayer: false })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET /api/x402/tickets/purchase/<email>' })
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email is required in the URL path' })
  }

  // Derive name from email local part (before @)
  const localPart = email.split('@')[0]
  const name = localPart.charAt(0).toUpperCase() + localPart.slice(1)

  try {
    const ticketInfo = await getTicketPurchaseInfo()

    // Pick cheapest available admission ticket (no voucher required)
    const availableAdmission = ticketInfo.tickets
      .filter((t) => t.available && t.isAdmission && !t.requireVoucher)
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))

    const cheapest = availableAdmission[0]
    if (!cheapest) {
      return res.status(404).json({ success: false, error: 'No tickets currently available' })
    }

    // Auto-fill required questions with sensible defaults
    const answers: { questionId: number; answer: string | number | string[] }[] = []
    for (const q of ticketInfo.questions) {
      // Only answer questions that apply to this ticket (or apply to all)
      if (q.appliesToItems.length > 0 && !q.appliesToItems.includes(cheapest.id)) continue
      // Skip optional questions and dependent questions
      if (!q.required) continue
      if (q.dependsOn) continue

      const qLower = q.question.toLowerCase()

      if (q.type === 'C' && q.options.length > 0) {
        // Single choice: pick first option
        answers.push({ questionId: q.id, answer: q.options[0].id })
      } else if (q.type === 'M' && q.options.length > 0) {
        // Multiple choice: pick first option
        answers.push({ questionId: q.id, answer: [String(q.options[0].id)] })
      } else if (q.type === 'B') {
        // Boolean: default true
        answers.push({ questionId: q.id, answer: 'True' })
      } else if (qLower.includes('name') || qLower.includes('nombre')) {
        answers.push({ questionId: q.id, answer: name })
      } else if (qLower.includes('email') || qLower.includes('correo')) {
        answers.push({ questionId: q.id, answer: email })
      } else if (qLower.includes('company') || qLower.includes('organization') || qLower.includes('empresa')) {
        answers.push({ questionId: q.id, answer: '-' })
      } else {
        // Generic fallback for required free-text questions
        answers.push({ questionId: q.id, answer: '-' })
      }
    }

    // Build PurchaseRequest body and delegate to main handler as POST
    // (GET in purchaseHandler goes to discovery mode; we need order creation)
    req.body = {
      email,
      tickets: [{ itemId: cheapest.id, quantity: 1 }],
      answers,
      attendee: {
        name: { given_name: name, family_name: name },
        email,
      },
    }
    req.method = 'POST'

    return purchaseHandler(req, res, { requirePayer: false, ticketInfo })
  } catch (error) {
    console.error('[purchase/email] Error:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to create simplified purchase: ${(error as Error).message}`,
    })
  }
}
