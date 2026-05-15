/**
 * Order Details API - Fetch order by code + secret
 * GET /api/x402/tickets/order/[code]?secret=xxx
 *
 * Returns order details for the confirmation page.
 * The secret acts as authentication — only someone with the secret can view the order.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { getOrder, getItems, getCategories } from 'services/pretix'

interface OrderPosition {
  id: number
  item: number
  itemName: string
  variation: number | null
  price: string
  attendee_name: string | null
  attendee_email: string | null
  secret: string
  isAddon: boolean
}

interface PaymentInfo {
  tx_hash?: string
  chain_id?: number
  token_symbol?: string
  token_address?: string
  amount?: string
  payer?: string
  payment_reference?: string
  block_number?: number | null
}

interface OrderDetailsResponse {
  success: true
  order: {
    code: string
    status: string
    email: string
    total: string
    datetime: string
    payment_provider: string | null
    positions: OrderPosition[]
    url: string
    payment_url: string | null
    payment_info: PaymentInfo | null
    /** Pretix's `require_approval` order flag. When `true` AND `status === 'n'`,
     *  the order is awaiting admin approval (no payment expected yet). */
    require_approval: boolean
    /** Sum of all completed (`state === 'done'`) refund amounts as a decimal
     *  string. `"0.00"` when no refunds have been processed. UI compares
     *  against `total` to render "fully" vs "partially refunded". */
    refunded_amount: string
  }
}

interface ErrorResponse {
  success: false
  error: string
}

function getLocalizedString(obj: Record<string, string> | string | null, locale = 'en'): string {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return obj[locale] || obj['en'] || Object.values(obj)[0] || ''
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderDetailsResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const code = req.query.code as string
  const secret = req.query.secret as string

  if (!code || !secret) {
    return res.status(400).json({ success: false, error: 'Order code and secret are required' })
  }

  // Symmetric 404 response for both "no such order" and "wrong secret" — the
  // previous 404-vs-403 split was an enumeration oracle: any caller could
  // walk the order-code namespace by checking which 4xx code came back.
  const ORDER_NOT_FOUND_RESPONSE = { success: false as const, error: 'Order not found or secret mismatch' }

  let order: Awaited<ReturnType<typeof getOrder>>
  let items: Awaited<ReturnType<typeof getItems>>
  let categories: Awaited<ReturnType<typeof getCategories>>
  try {
    ;[order, items, categories] = await Promise.all([getOrder(code), getItems(), getCategories()])
  } catch (error) {
    // Pretix's 404 surfaces as `Pretix API error 404: …` — collapse it into
    // the same 404 we use for secret mismatch. Other errors (network, real
    // 5xx) keep their original 500 path below.
    const msg = (error as Error).message || ''
    if (/Pretix API error 404/.test(msg)) {
      return res.status(404).json(ORDER_NOT_FOUND_RESPONSE)
    }
    console.error('Error fetching order:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to fetch order: ${msg}`,
    })
  }

  // Verify secret matches via constant-time compare. Naive `!==` short-
  // circuits on the first differing byte — a measurable timing leak that
  // (in principle) lets an attacker recover the secret one character at a
  // time. Lengths are checked first because timingSafeEqual rejects on
  // unequal-length buffers.
  const expected = Buffer.from(order.secret || '', 'utf-8')
  const provided = Buffer.from(secret, 'utf-8')
  const secretOk = expected.length === provided.length && crypto.timingSafeEqual(expected, provided)
  if (!secretOk) {
    return res.status(404).json(ORDER_NOT_FOUND_RESPONSE)
  }

  try {

    // Build item name, variation name, and category addon lookups
    const itemNameMap = new Map<number, string>()
    const itemCategoryMap = new Map<number, number | null>()
    const variationNameMap = new Map<string, string>() // "itemId-variationId" -> name
    for (const item of items) {
      itemNameMap.set(item.id, getLocalizedString(item.name))
      itemCategoryMap.set(item.id, item.category)
      for (const v of item.variations || []) {
        variationNameMap.set(`${item.id}-${v.id}`, getLocalizedString(v.value))
      }
    }
    const addonCategoryIds = new Set(categories.filter(c => c.is_addon).map(c => c.id))

    // Map positions with item names (including variation) and addon status
    const positions: OrderPosition[] = (order.positions || []).map((p: any) => {
      const categoryId = itemCategoryMap.get(p.item)
      let name = itemNameMap.get(p.item) || `Item #${p.item}`
      if (p.variation) {
        const varName = variationNameMap.get(`${p.item}-${p.variation}`)
        if (varName) name = `${name} – ${varName}`
      }
      return {
        id: p.id,
        item: p.item,
        itemName: name,
        variation: p.variation,
        price: p.price,
        attendee_name: p.attendee_name,
        attendee_email: p.attendee_email,
        secret: p.secret,
        isAddon: p.addon_to != null || (categoryId != null && addonCategoryIds.has(categoryId)),
      }
    })

    // Pretix's "change payment method" URL — works for *any* pending
    // order regardless of provider: a buyer with a stale crypto attempt
    // gets the same retry path as one with an unfinished Stripe checkout.
    // The page itself surfaces whatever payment options the event has
    // configured. Null for terminal states (paid / expired / cancelled)
    // — the buyer has nothing to retry there.
    const paymentUrl = order.status === 'n' && !order.require_approval
      ? `${order.url}pay/change/`
      : null

    // Extract payment info from our crypto payment provider (if any).
    // The plugin registers as `walletconnect` (WalletConnectPayment.identifier);
    // older codepaths used `x402_crypto`, kept here for backwards compatibility
    // with any historical orders. Pretix's REST API exposes provider-specific
    // data via the `details` field.
    const cryptoProviders = new Set(['walletconnect', 'x402_crypto'])
    const cryptoPayment = (order.payments || []).find(
      (p) => cryptoProviders.has(p.provider) && p.state !== 'canceled'
    )
    let paymentInfo: PaymentInfo | null = null
    if (cryptoPayment?.details) {
      const d = cryptoPayment.details
      paymentInfo = {
        tx_hash: d.tx_hash as string | undefined,
        chain_id: d.chain_id as number | undefined,
        token_symbol: d.token_symbol as string | undefined,
        token_address: d.token_address as string | undefined,
        amount: d.amount as string | undefined,
        payer: d.payer as string | undefined,
        payment_reference: d.payment_reference as string | undefined,
        block_number: d.block_number as number | null | undefined,
      }
    }

    // Sum of completed refunds. Pretix returns refunds at the top level
    // of the order JSON; only `state === 'done'` refunds are actually
    // settled (other states are pending/failed/canceled and shouldn't
    // count against what the buyer's been credited back).
    const refunds = ((order as unknown as { refunds?: { state: string; amount: string }[] }).refunds) || []
    const refundedTotal = refunds
      .filter(r => r.state === 'done')
      .reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0)

    return res.status(200).json({
      success: true,
      order: {
        code: order.code,
        status: order.status,
        email: order.email,
        total: order.total,
        datetime: order.datetime,
        payment_provider: order.payment_provider,
        positions,
        url: order.url,
        payment_url: paymentUrl,
        payment_info: paymentInfo,
        require_approval: !!order.require_approval,
        refunded_amount: refundedTotal.toFixed(2),
      },
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to fetch order: ${(error as Error).message}`,
    })
  }
}
