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
import { BASE_USDC_CONFIG, BASE_SEPOLIA_USDC_CONFIG } from 'types/x402'

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

  try {
    const locale = (req.query.locale as string) || 'en'
    const ticketInfo = await getTicketPurchaseInfo(locale)

    // Use testnet unless explicitly set to mainnet
    // NEXT_PUBLIC_CHAIN_ENV=mainnet for production, otherwise testnet
    const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
    const usdcConfig = isTestnet ? BASE_SEPOLIA_USDC_CONFIG : BASE_USDC_CONFIG

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
          discountForCrypto: '3%', // 3% discount for crypto payment
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
