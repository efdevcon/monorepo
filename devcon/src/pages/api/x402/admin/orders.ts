/**
 * x402 Admin GET /api/x402/admin/orders
 * Protected endpoint for monitoring x402 payment orders.
 * Auth: x-admin-key header or ?secret= query param vs X402_ADMIN_SECRET env var.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPublicClient, type Hex } from 'viem'
import { mainnet, optimism, arbitrum, base, polygon, baseSepolia } from 'viem/chains'
import { getAllPendingOrders, getAllCompletedOrders, getStoreStats } from 'services/ticketStore'
import { getPaymentRecipient } from 'services/x402'
import { getTransport } from 'services/rpc'
import { getAllGaslessConfigs } from 'types/x402'
import { fetchEthPriceUsd } from 'services/ethPrice'
import { TICKETING, TICKETING_ENV } from 'config/ticketing'

const ADMIN_SECRET = process.env.X402_ADMIN_SECRET

/** Fetch POL/USD spot price from Coinbase */
async function fetchPolPriceUsd(): Promise<number | null> {
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/POL-USD/spot')
    if (!res.ok) return null
    const data = await res.json()
    const price = parseFloat(data?.data?.amount)
    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}

const VIEM_CHAINS: Record<number, any> = {
  1: mainnet,
  10: optimism,
  42161: arbitrum,
  8453: base,
  137: polygon,
  84532: baseSepolia,
}

const ERC20_BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

interface ChainBalance {
  chainId: number
  network: string
  ethBalance: string
  tokens: { symbol: string; balance: string; address: string }[]
}

async function fetchWalletBalances(recipient: string): Promise<ChainBalance[]> {
  const configs = getAllGaslessConfigs()

  // Group tokens by chain
  const byChain = new Map<number, typeof configs>()
  for (const c of configs) {
    const list = byChain.get(c.chainId) || []
    list.push(c)
    byChain.set(c.chainId, list)
  }

  const results = await Promise.allSettled(
    Array.from(byChain.entries()).map(async ([chainId, tokens]) => {
      const viemChain = VIEM_CHAINS[chainId]
      if (!viemChain) return null

      const client = createPublicClient({ chain: viemChain, transport: getTransport(chainId) })

      const [ethBal, ...tokenBals] = await Promise.all([
        client.getBalance({ address: recipient as Hex }),
        ...tokens.map(t =>
          client.readContract({
            address: t.tokenAddress as Hex,
            abi: ERC20_BALANCE_OF_ABI,
            functionName: 'balanceOf',
            args: [recipient as Hex],
          })
        ),
      ])

      return {
        chainId,
        network: tokens[0].network,
        ethBalance: (Number(ethBal) / 1e18).toFixed(6),
        tokens: tokens.map((t, i) => ({
          symbol: t.tokenSymbol,
          balance: (Number(tokenBals[i]) / 10 ** t.tokenDecimals).toFixed(2),
          address: t.tokenAddress,
        })),
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<ChainBalance | null> => r.status === 'fulfilled' && r.value != null)
    .map(r => r.value!)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  if (!ADMIN_SECRET) {
    return res.status(500).json({ success: false, error: 'X402_ADMIN_SECRET not configured' })
  }

  const provided = (req.headers['x-admin-key'] as string) || (req.query.secret as string)
  if (provided !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  try {
    let recipient: string | undefined
    try {
      recipient = getPaymentRecipient()
    } catch {
      // recipient not configured — skip balance fetch
    }

    const [stats, completed, pending, walletBalances, ethPriceResult, polPrice] = await Promise.all([
      getStoreStats(),
      getAllCompletedOrders(),
      getAllPendingOrders(),
      recipient ? fetchWalletBalances(recipient).catch(() => []) : Promise.resolve([]),
      fetchEthPriceUsd().catch(() => null),
      fetchPolPriceUsd().catch(() => null),
    ])

    const { baseUrl, organizer, event } = TICKETING.pretix
    const pretixBaseUrl = `${baseUrl}/control/event/${organizer}/${event}/orders`

    return res.status(200).json({
      success: true,
      env: TICKETING_ENV,
      pretixBaseUrl,
      stats,
      completed,
      pending: pending.map(({ orderData, ...rest }) => rest),
      wallet: recipient
        ? {
            address: recipient,
            balances: walletBalances,
            prices: {
              ETH: ethPriceResult?.price ?? null,
              POL: polPrice,
            },
          }
        : null,
    })
  } catch (error) {
    console.error('[x402 admin orders]', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
