/**
 * Admin: pull incoming on-chain transfers to the destination wallet over
 * the last N days, per supported chain, via Alchemy's `getAssetTransfers`.
 * Returns the raw list; orphan-vs-matched filtering is done client-side
 * against the already-loaded completed-orders data (avoids a second
 * round-trip to the Pretix plugin and keeps the matching logic in one
 * place).
 *
 * Token allowlist: native ETH (on chains where ETH is native — Polygon's
 * native is POL and not accepted) + USDC on every chain + USDT0 on
 * Optimism and Arbitrum. Other ERC-20s are silently dropped.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { TICKETING } from 'config/ticketing'
import { checkAdminAuth } from 'utils/adminAuth'

const ALCHEMY_KEY = process.env.ALCHEMY_APIKEY || process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || ''

// Scope intentionally narrowed to Ethereum mainnet while we tune the
// orphan-recovery workflow. Re-enable the commented chains/tokens below
// once mainnet behavior is validated.
const ALCHEMY_URLS: Record<number, string> = {
  1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  // 10:    `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  // 137:   `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  // 8453:  `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  // 42161: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  // 10: 'Optimism',
  // 137: 'Polygon',
  // 8453: 'Base',
  // 42161: 'Arbitrum',
}

const NATIVE_ETH_CHAINS = new Set([1 /*, 10, 8453, 42161*/])

const SUPPORTED_TOKENS_BY_ADDRESS: Record<string, { symbol: string; decimals: number; chainId: number }> = {
  // USDC
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, chainId: 1 },
  // '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { symbol: 'USDC', decimals: 6, chainId: 10 },
  // '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6, chainId: 137 },
  // '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6, chainId: 8453 },
  // '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6, chainId: 42161 },
  // USDT0 (USD₮0)
  // '0x01bff41798a0bcf287b996046ca68b395dbc1071': { symbol: 'USDT0', decimals: 6, chainId: 10 },
  // '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT0', decimals: 6, chainId: 42161 },
}

interface AlchemyTransfer {
  hash?: string
  from?: string
  to?: string
  category?: string
  blockNum?: string
  rawContract?: { address?: string; decimal?: string; value?: string }
  metadata?: { blockTimestamp?: string }
}

interface IncomingTx {
  txHash: string
  chainId: number
  chainName: string
  symbol: string
  rawAmount: string | null
  decimals: number | null
  from: string
  to: string
  blockNum: string | null
  timestamp: number
}

async function fetchChainTransfers(
  chainId: number,
  receiveAddress: string,
): Promise<{ chainId: number; transfers: AlchemyTransfer[]; error?: string }> {
  const url = ALCHEMY_URLS[chainId]
  if (!url || !ALCHEMY_KEY) {
    return { chainId, transfers: [], error: 'ALCHEMY_APIKEY not set' }
  }
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [{
      toAddress: receiveAddress,
      category: ['external', 'erc20'],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: '0x3e8',
      order: 'desc',
    }],
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) {
      return { chainId, transfers: [], error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    if (json.error) {
      return { chainId, transfers: [], error: json.error.message || 'alchemy error' }
    }
    return { chainId, transfers: json.result?.transfers ?? [] }
  } catch (e) {
    return { chainId, transfers: [], error: (e as Error).message || 'fetch failed' }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!checkAdminAuth(req, res)) return

  const receiveAddress = (TICKETING.payment.recipientAddress || '').toLowerCase()
  if (!receiveAddress) {
    return res.status(500).json({ success: false, error: 'recipientAddress not configured' })
  }

  const daysRaw = typeof req.query.days === 'string' ? parseInt(req.query.days, 10) : 7
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(30, daysRaw)) : 7
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000

  const chainIds = Object.keys(ALCHEMY_URLS).map(Number)
  const results = await Promise.all(chainIds.map(c => fetchChainTransfers(c, receiveAddress)))

  const incoming: IncomingTx[] = []
  const byChain: Record<string, { count: number; error?: string }> = {}
  const errors: Record<string, string> = {}

  for (const { chainId, transfers, error } of results) {
    if (error) {
      errors[String(chainId)] = error
      byChain[String(chainId)] = { count: 0, error }
      continue
    }
    let count = 0
    for (const t of transfers) {
      const tsStr = t.metadata?.blockTimestamp
      if (!tsStr) continue
      const ts = Date.parse(tsStr)
      if (!Number.isFinite(ts) || ts < sinceMs) continue

      const txHash = (t.hash ?? '').toLowerCase()
      const from = (t.from ?? '').toLowerCase()
      const to = (t.to ?? '').toLowerCase()
      if (to !== receiveAddress) continue

      let symbol: string | null = null
      let decimals: number | null = null
      let rawAmount: string | null = null

      if (t.category === 'external') {
        // Native — only counted on chains where native is ETH.
        if (!NATIVE_ETH_CHAINS.has(chainId)) continue
        symbol = 'ETH'
        decimals = 18
      } else if (t.category === 'erc20') {
        const contract = (t.rawContract?.address ?? '').toLowerCase()
        const known = SUPPORTED_TOKENS_BY_ADDRESS[contract]
        if (!known || known.chainId !== chainId) continue
        symbol = known.symbol
        decimals = known.decimals
      } else {
        continue
      }

      const rawHex = t.rawContract?.value
      if (rawHex) {
        try {
          rawAmount = BigInt(rawHex).toString()
        } catch {
          rawAmount = null
        }
      }

      incoming.push({
        txHash,
        chainId,
        chainName: CHAIN_NAMES[chainId] ?? `chain ${chainId}`,
        symbol,
        rawAmount,
        decimals,
        from,
        to,
        blockNum: t.blockNum ?? null,
        timestamp: Math.floor(ts / 1000),
      })
      count++
    }
    byChain[String(chainId)] = { count }
  }

  incoming.sort((a, b) => b.timestamp - a.timestamp)

  return res.status(200).json({
    success: true,
    days,
    receiveAddress,
    byChain,
    incoming,
    errors,
  })
}
