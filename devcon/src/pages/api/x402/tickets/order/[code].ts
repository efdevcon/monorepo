/**
 * Order Details API - Fetch order by code + secret
 * GET /api/x402/tickets/order/[code]?secret=xxx
 *
 * Returns order details for the confirmation page.
 * The secret acts as authentication — only someone with the secret can view the order.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
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

  try {
    const [order, items, categories] = await Promise.all([getOrder(code), getItems(), getCategories()])

    // Verify secret matches
    if (order.secret !== secret) {
      return res.status(403).json({ success: false, error: 'Invalid order secret' })
    }

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

    // For pending orders with Stripe, build the payment URL with return_url
    const pendingStripePayment = (order.payments || []).find(
      (p: any) => p.provider === 'stripe' && (p.state === 'pending' || p.state === 'created')
    )
    const paymentUrl = pendingStripePayment
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
