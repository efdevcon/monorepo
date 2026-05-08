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
import {
  getTicketPurchaseInfo,
  getEventSettings,
  createOrder,
  validateVoucher,
  applyVoucherDiscount,
  VoucherInfo,
  getItems,
  getCategories,
} from 'services/pretix'
import { checkPurchaseRateLimit } from 'services/ticketStore'
import {
  PretixOrderCreateRequest,
  PretixOrderPosition,
  PretixAnswerInput,
  PretixItem,
  PretixCategory,
} from 'types/pretix'
import { getClientIp } from 'utils/getClientIp'

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

/**
 * Mirror Pretix `_create_order()` business rules locally before POSTing to the
 * organizer-privileged REST endpoint. The REST endpoint deliberately skips
 * most of these checks (it's for operator comps/overrides) so any storefront
 * that POSTs there inherits operator privileges. Pretix recommends routing
 * through their hosted cart for buyer-driven orders; this validator is the
 * stopgap until that migration lands.
 *
 * Rejects on first failure with a one-line reason. Caller returns 400.
 */
function validateCartAgainstPretixRules(
  body: FiatPurchaseRequest,
  rawItems: PretixItem[],
  categories: PretixCategory[],
  voucherInfo: VoucherInfo | null,
  ticketAnswers: { questionId: number }[],
  questionsByItem: Map<number, { id: number; required: boolean }[]>,
): string | null {
  const itemById = new Map(rawItems.map(i => [i.id, i]))
  const categoryById = new Map(categories.map(c => [c.id, c]))
  const now = Date.now()

  // Aggregate per-item ticket quantity so max_per_order can be enforced
  // against the total, not individual positions.
  const ticketQtyByItem = new Map<number, number>()
  for (const t of body.tickets) {
    ticketQtyByItem.set(t.itemId, (ticketQtyByItem.get(t.itemId) || 0) + (t.quantity || 1))
  }

  const checkItem = (item: PretixItem, isAddon: boolean, parentItemId: number | null): string | null => {
    if (!item.active) return `Item not active: ${item.id}`
    if (item.available_from && now < new Date(item.available_from).getTime()) {
      return `Item not yet on sale: ${item.id}`
    }
    if (item.available_until && now > new Date(item.available_until).getTime()) {
      return `Item no longer on sale: ${item.id}`
    }
    if (item.sales_channels && item.sales_channels.length > 0 && !item.sales_channels.includes('web')) {
      return `Item not available on web sales channel: ${item.id}`
    }
    if (item.require_membership) {
      // Storefront has no membership context; reject rather than silently bypass.
      return `Item requires membership: ${item.id}`
    }
    if (item.require_approval) {
      // Approval-gated items must go through Pretix's approval flow, not a
      // direct paid order. The REST endpoint silently issues these as normal
      // pending orders and skips the approval queue.
      return `Item requires approval: ${item.id}`
    }
    if (item.require_voucher) {
      const voucherCovers = voucherInfo && voucherInfo.valid &&
        (voucherInfo.itemId === null || voucherInfo.itemId === item.id)
      if (!voucherCovers) return `Item requires voucher: ${item.id}`
    }
    // Admission items must NOT be smuggled through the addons[] lane —
    // addon_to=0 with an admission item lands a free admission with no
    // category linkage check.
    if (isAddon && item.admission) {
      return `Admission item cannot be ordered as an add-on: ${item.id}`
    }
    // Addon item's category must be advertised by the parent ticket's addons.
    if (isAddon && parentItemId !== null) {
      const parent = itemById.get(parentItemId)
      const allowed = parent?.addons.some(a => a.addon_category === item.category)
      if (!allowed) return `Item ${item.id} is not a valid add-on for ticket ${parentItemId}`
      // Category must actually be marked is_addon (defensive — Pretix invariant).
      const cat = item.category != null ? categoryById.get(item.category) : null
      if (!cat?.is_addon) return `Item ${item.id} is not in an addon category`
    }
    return null
  }

  const checkVariation = (item: PretixItem, variationId: number | undefined): string | null => {
    if (item.has_variations && variationId == null) {
      return `Item ${item.id} requires a variation`
    }
    if (variationId != null) {
      const v = item.variations.find(x => x.id === variationId)
      if (!v) return `Invalid variation ${variationId} for item ${item.id}`
      if (!v.active) return `Variation ${variationId} is not active`
      if (v.available_from && now < new Date(v.available_from).getTime()) {
        return `Variation ${variationId} not yet on sale`
      }
      if (v.available_until && now > new Date(v.available_until).getTime()) {
        return `Variation ${variationId} no longer on sale`
      }
      if (v.sales_channels && v.sales_channels.length > 0 && !v.sales_channels.includes('web')) {
        return `Variation ${variationId} not available on web sales channel`
      }
      if (v.require_membership) return `Variation ${variationId} requires membership`
    }
    return null
  }

  // -- Ticket positions --
  for (const ticket of body.tickets) {
    const item = itemById.get(ticket.itemId)
    if (!item) return `Invalid ticket ID: ${ticket.itemId}`
    const qty = ticket.quantity || 1
    const totalQtyForItem = ticketQtyByItem.get(item.id) || qty
    if (item.max_per_order != null && totalQtyForItem > item.max_per_order) {
      return `Item ${item.id} exceeds max_per_order (${item.max_per_order})`
    }
    if (item.min_per_order != null && totalQtyForItem < item.min_per_order) {
      return `Item ${item.id} below min_per_order (${item.min_per_order})`
    }
    const e1 = checkItem(item, false, null)
    if (e1) return e1
    const e2 = checkVariation(item, ticket.variationId)
    if (e2) return e2

    // Required questions for this item must be present in answers.
    const itemQuestions = questionsByItem.get(item.id) || []
    for (const q of itemQuestions) {
      if (!q.required) continue
      const answered = ticketAnswers.some(a => a.questionId === q.id)
      if (!answered) return `Required question ${q.id} not answered for item ${item.id}`
    }
  }

  // -- Addon positions --
  if (body.addons) {
    // Pretix `ItemAddOn.max_count` is per-category-per-base-position (across all
    // items in that category). Aggregate addon qty by (parentItemId, categoryId).
    const addonQtyByCatPerParent = new Map<string, number>()
    // Per-item count to enforce multi_allowed (1 per item when false).
    const addonQtyByItemPerParent = new Map<string, number>()
    // Pick the first ticket as the implied addon parent — matches the existing
    // `addon_to: 0` placeholder behavior. Without explicit parent linkage in
    // the request schema, we can only validate against the first ticket.
    const firstTicket = body.tickets[0]
    const parentItemId = firstTicket?.itemId ?? null
    if (parentItemId == null) return 'Add-ons require at least one ticket'

    for (const addon of body.addons) {
      const item = itemById.get(addon.itemId)
      if (!item) return `Invalid addon ID: ${addon.itemId}`
      const e1 = checkItem(item, true, parentItemId)
      if (e1) return e1
      const e2 = checkVariation(item, addon.variationId)
      if (e2) return e2

      const qty = addon.quantity || 1
      const catKey = `${parentItemId}:${item.category}`
      const itemKey = `${parentItemId}:${item.id}`
      addonQtyByCatPerParent.set(catKey, (addonQtyByCatPerParent.get(catKey) || 0) + qty)
      addonQtyByItemPerParent.set(itemKey, (addonQtyByItemPerParent.get(itemKey) || 0) + qty)

      const parent = itemById.get(parentItemId)
      const addonRule = parent?.addons.find(a => a.addon_category === item.category)
      if (addonRule) {
        const totalForCat = addonQtyByCatPerParent.get(catKey) || 0
        if (addonRule.max_count != null && totalForCat > addonRule.max_count) {
          return `Add-on category ${item.category} exceeds max_count (${addonRule.max_count})`
        }
        const totalForItem = addonQtyByItemPerParent.get(itemKey) || 0
        if (!addonRule.multi_allowed && totalForItem > 1) {
          return `Add-on item ${item.id} cannot be selected more than once`
        }
      }
    }
  }

  // -- Voucher constraints --
  if (voucherInfo && voucherInfo.valid) {
    const totalRedeemingPositions = body.tickets.reduce((sum, t) => {
      const item = itemById.get(t.itemId)
      if (!item) return sum
      const matchesItem = voucherInfo.itemId === null || voucherInfo.itemId === item.id
      const matchesVar = voucherInfo.variationId === null || voucherInfo.variationId === t.variationId
      return matchesItem && matchesVar ? sum + (t.quantity || 1) : sum
    }, 0)
    if (voucherInfo.minUsages > 1 && totalRedeemingPositions < voucherInfo.minUsages) {
      return `Voucher requires at least ${voucherInfo.minUsages} matching positions in this order`
    }
    if (voucherInfo.itemId !== null) {
      const usesNonMatching = body.tickets.some(t => t.itemId !== voucherInfo.itemId)
      if (usesNonMatching) {
        // Voucher is item-bound; non-matching items in the cart are fine
        // but they must not reference this voucher. The order builder already
        // gates `position.voucher` on item match, so this is informational.
      }
    }
  }

  return null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FiatPurchaseResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Rate limit by IP. `checkPurchaseRateLimit` returns `{allowed}` and never
  // throws — the previous try/catch silently dropped every result, leaving
  // the endpoint unrate-limited in practice. Inspect the return value.
  const clientIp = getClientIp(req)
  const { allowed } = await checkPurchaseRateLimit(clientIp)
  if (!allowed) {
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

    // M9 stopgap: mirror Pretix `_create_order()` business rules locally
    // before POSTing to the organizer-privileged REST endpoint. The raw
    // PretixItem records carry the gating fields (max_per_order, sales_channels,
    // require_approval, …) that the trimmed `TicketInfo` doesn't expose.
    const [rawItems, rawCategories] = await Promise.all([getItems(), getCategories()])
    const questionsByItem = new Map<number, { id: number; required: boolean }[]>()
    for (const q of ticketInfo.questions) {
      if (q.appliesToItems.length === 0) {
        for (const id of itemsById.keys()) {
          const list = questionsByItem.get(id) || []
          list.push({ id: q.id, required: q.required })
          questionsByItem.set(id, list)
        }
      } else {
        for (const id of q.appliesToItems) {
          const list = questionsByItem.get(id) || []
          list.push({ id: q.id, required: q.required })
          questionsByItem.set(id, list)
        }
      }
    }
    const ticketAnswers = (body.answers || []).filter(a => {
      if (a.answer === undefined || a.answer === null) return false
      if (Array.isArray(a.answer)) return a.answer.length > 0
      return String(a.answer).trim() !== ''
    })
    const ruleErr = validateCartAgainstPretixRules(
      body, rawItems, rawCategories, voucherInfo, ticketAnswers, questionsByItem,
    )
    if (ruleErr) {
      console.warn(`[Purchase] Cart rejected by service-bypass guard: ${ruleErr}`)
      return res.status(400).json({ success: false, error: ruleErr })
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
