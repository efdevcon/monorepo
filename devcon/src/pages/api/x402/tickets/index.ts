/**
 * x402 Tickets API - Get available tickets with questions and addons
 * GET /api/x402/tickets
 *
 * Returns complete ticket information including:
 * - Available tickets (admission and non-admission)
 * - Required questions to answer
 * - Available addons to select
 * - Event information
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTicketPurchaseInfo } from 'services/pretix'
import { hasAvailableVouchers } from 'services/discountStore'
import { getPluginSettings, type PluginSettings } from 'services/pretixPluginProxy'
import { TicketPurchaseInfo } from 'types/pretix'
import { BASE_USDC_CONFIG, BASE_SEPOLIA_USDC_CONFIG, SUPPORTED_ASSETS_MAINNET, SUPPORTED_ASSETS_TESTNET, SupportedAsset } from 'types/x402'
import { getClientIp } from 'utils/getClientIp'
import { TICKETING, isTestnet } from 'config/ticketing'

// ---------------------------------------------------------------------------
// Simple in-memory per-IP rate limiter (defense in depth against cache-bypass)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 30 // max requests per IP per window

const ipHits = new Map<string, { count: number; resetAt: number }>()

// Periodic cleanup so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(ip)
  }
}, RATE_LIMIT_WINDOW_MS)

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

// ---------------------------------------------------------------------------

interface TicketsResponse {
  success: true
  data: Partial<TicketPurchaseInfo> & {
    /** Payment configuration. Omitted entirely when `x402ApiEnabled` is
     *  false — clients must guard with `if (data.paymentInfo)` before
     *  reading any nested field. */
    paymentInfo?: {
      network: string
      chainId: number
      tokenSymbol: string
      tokenAddress: string
      tokenDecimals: number
      /** Crypto-payment discount percentage as a string (e.g. "10%"), or
       *  `null` when the discount is disabled. Clients must treat `null`
       *  as "no discount" — not "use the FE default". */
      discountForCrypto: string | null
      /** x402 v2: USDC + ETH on Ethereum, OP, Arbitrum, Base (or testnet) */
      supportedAssets: SupportedAsset[]
    }
    /** Per-event admin toggles surfaced to the checkout UI so it can render
     *  the "Crypto checkout is currently unavailable" / "Card payment is
     *  currently unavailable" notices proactively, without waiting for the
     *  buyer to click Pay and trigger a 404 from the plugin. Fails closed
     *  (both `false`) if the plugin settings call errors out. */
    pluginSettings: PluginSettings
  }
}

interface ErrorResponse {
  success: false
  error: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TicketsResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Rate limit per IP
  const clientIp = getClientIp(req)
  if (!checkRateLimit(clientIp)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' })
  }

  try {
    // Master kill switch for the catalog. When `x402ApiEnabled` is false the
    // storefront's x402 buyer flow is parked (e.g. production while sales run
    // through Pretix's hosted shop) — exposing the ticket catalog through
    // this endpoint would leak inventory, voucher state, and per-item
    // configuration to anyone. Skip the Pretix calls entirely and return
    // *only* `pluginSettings` — no catalog, no event metadata, and no
    // payment shell (which would still tell a probing client what chain /
    // recipient / discount we'd use). The checkout page reads
    // `pluginSettings.x402_enabled` to surface the "Crypto checkout is
    // currently unavailable" notice and falls back to the Pretix-hosted
    // shop redirect; with paymentInfo absent, downstream consumers that
    // need wallet wiring (e.g. the payment selector) simply don't render.
    if (!TICKETING.pretix.x402ApiEnabled) {
      const pluginSettings = await getPluginSettings()
      const response: TicketsResponse = {
        success: true,
        data: { pluginSettings },
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
      return res.status(200).json(response)
    }

    const usdcConfig = isTestnet ? BASE_SEPOLIA_USDC_CONFIG : BASE_USDC_CONFIG
    const supportedAssets: SupportedAsset[] = isTestnet ? SUPPORTED_ASSETS_TESTNET : SUPPORTED_ASSETS_MAINNET
    const paymentInfo = {
      network: usdcConfig.network,
      chainId: usdcConfig.chainId,
      tokenSymbol: usdcConfig.tokenSymbol,
      tokenAddress: usdcConfig.tokenAddress,
      tokenDecimals: usdcConfig.tokenDecimals,
      discountForCrypto: TICKETING.payment.cryptoDiscountPercent > 0
        ? `${TICKETING.payment.cryptoDiscountPercent}%`
        : null,
      supportedAssets,
    }

    const locale = (req.query.locale as string) || 'en'
    const [ticketInfo, vouchersAvailable, pluginSettings] = await Promise.all([
      getTicketPurchaseInfo(locale),
      hasAvailableVouchers().catch(() => undefined),
      getPluginSettings(),
    ])

    // Attach vouchersAvailable to voucher-required tickets
    const tickets = ticketInfo.tickets.map(t =>
      t.requireVoucher ? { ...t, vouchersAvailable } : t
    )

    const response: TicketsResponse = {
      success: true,
      data: {
        ...ticketInfo,
        tickets,
        paymentInfo,
        pluginSettings,
      },
    }

    // Cache for 1 minute
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching ticket info:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to fetch ticket information: ${(error as Error).message}`,
    })
  }
}
