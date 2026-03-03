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
import { TicketPurchaseInfo } from 'types/pretix'
import { BASE_USDC_CONFIG, BASE_SEPOLIA_USDC_CONFIG, SUPPORTED_ASSETS_MAINNET, SUPPORTED_ASSETS_TESTNET, SupportedAsset } from 'types/x402'
import { STORE_CONFIG } from 'pages/tickets/store/config'

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
  data: TicketPurchaseInfo & {
    paymentInfo: {
      network: string
      chainId: number
      tokenSymbol: string
      tokenAddress: string
      tokenDecimals: number
      discountForCrypto: string
      /** x402 v2: USDC + ETH on Ethereum, OP, Arbitrum, Base (or testnet) */
      supportedAssets: SupportedAsset[]
    }
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
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (!checkRateLimit(clientIp)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' })
  }

  try {
    const locale = (req.query.locale as string) || 'en'
    const ticketInfo = await getTicketPurchaseInfo(locale)

    // Use testnet unless explicitly set to mainnet
    // NEXT_PUBLIC_CHAIN_ENV=mainnet for production, otherwise testnet
    const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
    const usdcConfig = isTestnet ? BASE_SEPOLIA_USDC_CONFIG : BASE_USDC_CONFIG
    const supportedAssets: SupportedAsset[] = isTestnet ? SUPPORTED_ASSETS_TESTNET : SUPPORTED_ASSETS_MAINNET

    const response: TicketsResponse = {
      success: true,
      data: {
        ...ticketInfo,
        paymentInfo: {
          network: usdcConfig.network,
          chainId: usdcConfig.chainId,
          tokenSymbol: usdcConfig.tokenSymbol,
          tokenAddress: usdcConfig.tokenAddress,
          tokenDecimals: usdcConfig.tokenDecimals,
          discountForCrypto: `${STORE_CONFIG.cryptoDiscountPercent}%`,
          supportedAssets,
        },
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
