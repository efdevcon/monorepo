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
    /** On-chain hash + chain of the most recent done refund. Plugin-issued
     *  refunds (via x402 or WC paths) write `{refund_tx_hash, chain_id}`
     *  into `OrderRefund.info_data`; we surface that so the recap page
     *  can render a block-explorer link. `null` when no refund has
     *  been issued or the refund didn't carry on-chain metadata
     *  (Pretix-native UI refunds, Stripe refunds, etc.). */
    refund_tx_hash: string | null
    refund_chain_id: number | null
    /** True if any payment on this order has ever reached `confirmed` or
     *  `refunded` state. Lets the recap distinguish a "canceled before
     *  payment" order (no refund owed) from a "canceled after payment"
     *  one (refund pending until the operator settles it). */
    was_paid: boolean
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
    const refunds = (
      (order as unknown as {
        refunds?: {
          state: string
          amount: string
          execution_date?: string
          // Pretix REST API exposes `details` (computed by the provider's
          // `api_refund_details(refund)` override) — for our plugin this
          // is `{refund_tx_hash, chain_id}`. `info` / `info_data` are
          // model-level fields that Pretix doesn't surface via REST.
          details?: Record<string, unknown> | null
          info?: Record<string, unknown> | string | null
          info_data?: Record<string, unknown> | null
          comment?: string | null
        }[]
      }).refunds
    ) || []
    const doneRefunds = refunds.filter(r => r.state === 'done')
    const refundedTotal = doneRefunds.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0)

    // ── Pull the on-chain refund tx hash from the most-recent done refund ──
    //
    // Two creation paths exist for refunds in this codebase and they
    // stash the tx info in different fields:
    //
    //   1. Plugin's `record_pretix_refund` (modern x402 + WC paths
    //      added in 7.10) writes `info` as JSON
    //      `{refund_tx_hash, chain_id}`, provider = `walletconnect`.
    //
    //   2. Older `services/pretix.ts cancelOrder` path puts the tx
    //      into the `comment` as a block-explorer URL, provider =
    //      `manual`. No structured chain id; we derive it from the
    //      explorer host.
    //
    // Try #1 first; fall back to #2. Most-recent done refund wins so
    // a partial-then-full case still surfaces a useful link.
    function explorerHostToChainId(host: string): number | null {
      if (host.includes('etherscan.io') && !host.includes('optimistic') && !host.includes('sepolia')) return 1
      if (host.includes('optimistic.etherscan.io')) return 10
      if (host.includes('arbiscan.io')) return 42161
      if (host.includes('basescan.org') && !host.includes('sepolia')) return 8453
      if (host.includes('sepolia.basescan.org')) return 84532
      if (host.includes('polygonscan.com')) return 137
      return null
    }
    let refundTxHash: string | null = null
    let refundChainId: number | null = null
    if (doneRefunds.length > 0) {
      const sorted = [...doneRefunds].sort((a, b) =>
        (b.execution_date || '').localeCompare(a.execution_date || ''),
      )
      for (const r of sorted) {
        // Path #1 (preferred): Pretix's `details` field, populated by
        // our plugin's `api_refund_details(refund)` override returning
        // the parsed info_data. Plugin restart required for orders
        // refunded before the override was added.
        // Path #1 fallback: older shapes where the refund's info came
        // through as `info_data` / `info` directly. Defensive — shouldn't
        // happen in current Pretix versions but harmless.
        let info: Record<string, unknown> | null = null
        if (r.details && typeof r.details === 'object') {
          info = r.details
        } else if (r.info_data && typeof r.info_data === 'object') {
          info = r.info_data
        } else if (typeof r.info === 'string') {
          try { info = JSON.parse(r.info) as Record<string, unknown> } catch { info = null }
        } else if (r.info && typeof r.info === 'object') {
          info = r.info as Record<string, unknown>
        }
        const tx = info?.refund_tx_hash
        const cid = info?.chain_id
        if (typeof tx === 'string' && /^0x[0-9a-fA-F]{64}$/.test(tx)) {
          refundTxHash = tx
          refundChainId = typeof cid === 'number' ? cid : null
          break
        }

        // Path #2: parse the comment for an explorer URL. Pretix's
        // `comment` is free-text but the legacy cancelOrder flow
        // always emits a `https://<explorer>/tx/0x<64-hex>` pattern.
        if (typeof r.comment === 'string') {
          const m = r.comment.match(/https:\/\/([^/\s]+)\/tx\/(0x[0-9a-fA-F]{64})/)
          if (m) {
            refundTxHash = m[2]
            refundChainId = explorerHostToChainId(m[1])
            break
          }
          // Even if no full URL, surface a bare 0x… tx hash if present.
          const bare = r.comment.match(/(0x[0-9a-fA-F]{64})/)
          if (bare) {
            refundTxHash = bare[1]
            // No chain hint — UI will fall back to etherscan.
            break
          }
        }
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
        require_approval: !!order.require_approval,
        refunded_amount: refundedTotal.toFixed(2),
        refund_tx_hash: refundTxHash,
        refund_chain_id: refundChainId,
        // Any payment that was ever confirmed counts as "was paid",
        // including ones that have since been transitioned to
        // `refunded` (Pretix flips them there once an OrderRefund
        // covers them). Used to distinguish "cancelled before any
        // money moved" from "cancelled and still holding the buyer's
        // money".
        was_paid: (order.payments || []).some(
          (p: { state?: string }) => p.state === 'confirmed' || p.state === 'refunded',
        ),
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
