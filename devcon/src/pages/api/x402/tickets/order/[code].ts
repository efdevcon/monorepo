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

    // Build item name lookup and category addon lookup
    const itemNameMap = new Map<number, string>()
    const itemCategoryMap = new Map<number, number | null>()
    for (const item of items) {
      itemNameMap.set(item.id, getLocalizedString(item.name))
      itemCategoryMap.set(item.id, item.category)
    }
    const addonCategoryIds = new Set(categories.filter(c => c.is_addon).map(c => c.id))

    // Map positions with item names and addon status
    const positions: OrderPosition[] = (order.positions || []).map((p: any) => {
      const categoryId = itemCategoryMap.get(p.item)
      return {
        id: p.id,
        item: p.item,
        itemName: itemNameMap.get(p.item) || `Item #${p.item}`,
        variation: p.variation,
        price: p.price,
        attendee_name: p.attendee_name,
        attendee_email: p.attendee_email,
        secret: p.secret,
        isAddon: p.addon_to != null || (categoryId != null && addonCategoryIds.has(categoryId)),
      }
    })

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
