/**
 * Purchase API - Create Pretix order with a redirect-based payment provider
 * POST /api/x402/tickets/fiat-purchase
 *
 * Accepts an optional `paymentProvider` field (default: 'stripe').
 * Supported providers: 'stripe', 'walletconnect'.
 * Returns the order code and payment URL for redirect.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { isEmail } from 'utils/validators'
import { getTicketPurchaseInfo, getEventSettings, createOrder, validateVoucher, applyVoucherDiscount, VoucherInfo } from 'services/pretix'
import { checkPurchaseRateLimit } from 'services/ticketStore'
import { PretixOrderCreateRequest, PretixOrderPosition, PretixAnswerInput } from 'types/pretix'

interface FiatPurchaseRequest {
  email: string
  tickets: {
    itemId: number
    variationId?: number
    quantity?: number
  }[]
  addons?: {
    itemId: number
    variationId?: number
    quantity?: number
  }[]
  answers: {
    questionId: number
    answer: string | number | string[]
  }[]
  attendee: {
    name: {
      given_name: string
      family_name: string
    }
    email?: string
    company?: string
    country?: string
  }
  voucher?: string
  paymentProvider?: 'stripe' | 'walletconnect'
}

interface FiatPurchaseResponse {
  success: true
  orderCode: string
  orderSecret: string
  paymentUrl: string
  total: string
  currency: string
}

interface ErrorResponse {
  success: false
  error: string
  details?: string[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FiatPurchaseResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Rate limit by IP
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  try {
    await checkPurchaseRateLimit(clientIp)
  } catch {
    return res.status(429).json({ success: false, error: 'Too many purchase attempts. Please try again later.' })
  }

  try {
    const body = req.body as FiatPurchaseRequest

    // Validate request
    const errors: string[] = []
    if (!body.email || typeof body.email !== 'string' || !isEmail(body.email)) {
      errors.push('Valid email is required')
    }
    if (!body.tickets || !Array.isArray(body.tickets) || body.tickets.length === 0) {
      errors.push('At least one ticket is required')
    } else {
      for (const ticket of body.tickets) {
        const q = ticket.quantity ?? 1
        if (!Number.isInteger(q) || q < 1 || q > 10) {
          errors.push('Ticket quantity must be an integer between 1 and 10')
          break
        }
      }
    }
    if (body.addons && Array.isArray(body.addons)) {
      for (const addon of body.addons) {
        const q = addon.quantity ?? 1
        if (!Number.isInteger(q) || q < 1 || q > 10) {
          errors.push('Addon quantity must be an integer between 1 and 10')
          break
        }
      }
    }
    const eventSettings = await getEventSettings()
    if (eventSettings.attendee_names_required) {
      if (!body.attendee || !body.attendee.name) {
        errors.push('Attendee name is required')
      } else {
        if (!body.attendee.name.given_name) errors.push('Attendee given name is required')
        if (!body.attendee.name.family_name) errors.push('Attendee family name is required')
      }
    }
    if (!body.answers || !Array.isArray(body.answers)) {
      errors.push('Answers array is required')
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Invalid request', details: errors })
    }

    // Fetch current ticket info
    const ticketInfo = await getTicketPurchaseInfo()
    const itemsById = new Map(ticketInfo.tickets.map((t) => [t.id, t]))

    // Validate voucher if provided
    let voucherInfo: VoucherInfo | null = null
    if (body.voucher) {
      voucherInfo = await validateVoucher(body.voucher)
      if (!voucherInfo.valid) {
        return res.status(400).json({
          success: false,
          error: `Invalid voucher: ${voucherInfo.error}`,
        })
      }
    }

    // Build order positions
    const positions: PretixOrderPosition[] = []

    for (const ticket of body.tickets) {
      const item = itemsById.get(ticket.itemId)
      if (!item) {
        return res.status(400).json({ success: false, error: `Invalid ticket ID: ${ticket.itemId}` })
      }
      if (!item.available) {
        return res.status(400).json({ success: false, error: `Ticket not available: ${item.name}` })
      }

      let price = item.price
      let name = item.name

      if (ticket.variationId) {
        const variation = item.variations.find((v) => v.id === ticket.variationId)
        if (!variation) {
          return res.status(400).json({
            success: false,
            error: `Invalid variation ID: ${ticket.variationId} for ticket ${ticket.itemId}`,
          })
        }
        price = variation.price
        name = `${item.name} - ${variation.name}`
      }

      // Apply voucher discount to applicable tickets
      if (voucherInfo && (!voucherInfo.itemId || voucherInfo.itemId === item.id)) {
        price = applyVoucherDiscount(price, voucherInfo)
      }

      const quantity = ticket.quantity || 1
      for (let i = 0; i < quantity; i++) {
        const answers: PretixAnswerInput[] = body.answers
          .filter((a) => {
            const question = ticketInfo.questions.find((q) => q.id === a.questionId)
            if (!question) return false
            if (!a.answer && a.answer !== 0) return false
            if (Array.isArray(a.answer) && a.answer.length === 0) return false
            if (typeof a.answer === 'string' && a.answer.trim() === '') return false
            return question.appliesToItems.length === 0 || question.appliesToItems.includes(item.id)
          })
          .map((a) => {
            const question = ticketInfo.questions.find((q) => q.id === a.questionId)
            if (question && (question.type === 'C' || question.type === 'M')) {
              const rawIds = Array.isArray(a.answer)
                ? a.answer.map((v) => parseInt(String(v)))
                : [parseInt(String(a.answer))]
              const optionIds = rawIds.filter(id => !isNaN(id))
              if (optionIds.length === 0) {
                return { question: a.questionId, answer: '', options: [] }
              }
              const selectedOption = question.options.find((o) => o.id === optionIds[0])
              return {
                question: a.questionId,
                answer: selectedOption?.answer || String(optionIds[0]),
                options: optionIds,
              }
            }
            // Boolean questions: Pretix's REST API requires the literal strings
            // "true" or "false" (lowercase). Our radio buttons use capitalized
            // values ("True"/"False") and we also accept JS booleans, so
            // normalize at the boundary to whatever the API expects.
            if (question && question.type === 'B') {
              const raw = Array.isArray(a.answer) ? a.answer[0] : a.answer
              const normalized = String(raw).toLowerCase() === 'true' ? 'true' : 'false'
              return { question: a.questionId, answer: normalized }
            }
            return {
              question: a.questionId,
              answer: Array.isArray(a.answer) ? a.answer.join(', ') : String(a.answer),
            }
          })
          .filter((a) => a && a.answer && a.answer.trim() !== '')

        positions.push({
          item: item.id,
          variation: ticket.variationId || null,
          price,
          attendee_name: null,
          attendee_name_parts: body.attendee?.name || {},
          attendee_email: body.attendee?.email || body.email,
          company: body.attendee?.company || null,
          street: null,
          zipcode: null,
          city: null,
          country: body.attendee?.country || null,
          state: null,
          addon_to: null,
          subevent: null,
          answers,
          seat: null,
          voucher: (voucherInfo && (!voucherInfo.itemId || voucherInfo.itemId === item.id)) ? body.voucher || null : null,
        })
      }
    }

    // Process add-ons
    if (body.addons) {
      for (const addon of body.addons) {
        const item = itemsById.get(addon.itemId)
        if (!item) {
          return res.status(400).json({ success: false, error: `Invalid addon ID: ${addon.itemId}` })
        }
        let addonPrice = item.price
        if (addon.variationId) {
          const variation = item.variations.find((v) => v.id === addon.variationId)
          if (!variation) {
            return res.status(400).json({
              success: false,
              error: `Invalid variation ID: ${addon.variationId} for addon ${addon.itemId}`,
            })
          }
          addonPrice = variation.price
        }
        const quantity = addon.quantity || 1
        for (let i = 0; i < quantity; i++) {
          positions.push({
            item: item.id,
            variation: addon.variationId || null,
            price: addonPrice,
            attendee_name: null,
            attendee_name_parts: {},
            attendee_email: null,
            company: null,
            street: null,
            zipcode: null,
            city: null,
            country: null,
            state: null,
            addon_to: 0, // linked to first ticket position
            subevent: null,
            answers: [],
            seat: null,
            voucher: null,
          })
        }
      }
    }

    // Determine payment provider (default: stripe)
    const provider = body.paymentProvider === 'walletconnect' ? 'walletconnect' : 'stripe'

    const pretixOrder: PretixOrderCreateRequest = {
      email: body.email,
      locale: 'en',
      sales_channel: 'web',
      payment_provider: provider,
      positions,
      send_email: true,
    }

    console.log(`[Purchase] Creating Pretix order with ${provider} payment...`)
    const order = await createOrder(pretixOrder)
    console.log(`[Purchase] Order created:`, order.code)

    // Extract payment URL from the order
    const paymentUrl = order.payments?.[0]?.payment_url
    if (!paymentUrl) {
      console.error(`[Purchase] No payment URL in order response`)
      return res.status(500).json({
        success: false,
        error: `No payment URL returned from payment provider. ${provider} may not be configured.`,
      })
    }

    console.log(`[Purchase] Payment URL received for order:`, order.code)

    return res.status(200).json({
      success: true,
      orderCode: order.code,
      orderSecret: order.secret,
      paymentUrl,
      total: order.total,
      currency: ticketInfo.event.currency,
    })
  } catch (error) {
    console.error('Error creating fiat purchase:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to create order: ${(error as Error).message}`,
    })
  }
}
