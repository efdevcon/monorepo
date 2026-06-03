/**
 * Admin: pull on-chain transfers per supported chain via Alchemy's
 * `getAssetTransfers`. Two queries per chain:
 *   - incoming to the destination wallet (payment receipts)
 *   - outgoing from REFUND_WALLET (refunds we sent out)
 * Returns the raw lists; orphan-vs-matched filtering and orphan-vs-refund
 * pairing are done client-side against the already-loaded completed-orders
 * data (avoids a second round-trip to the Pretix plugin and keeps all
 * matching logic in one place).
 *
 * Token allowlist: native ETH (on chains where ETH is native — Polygon's
 * native is POL and not accepted) + USDC on every chain + USDT0 on
 * Optimism and Arbitrum. Other ERC-20s are silently dropped.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { TICKETING } from 'config/ticketing'
import { checkAdminAuth } from 'utils/adminAuth'

const ALCHEMY_KEY = process.env.ALCHEMY_APIKEY || process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || ''

// Address the plugin signs refunds from. Outgoing transfers here are the
// "refund stream" we cross-reference against orphan incoming txs.
const REFUND_WALLET = '0xfc488ae9cb395b150574aa5ce8a321c9100b1ee3'

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

// Block-time math used to translate the admin's date range into Alchemy
// fromBlock/toBlock so we only pay compute on the slice we care about.
// Reference point: a known (block, unix-timestamp) pair near the start of
// the ticket sale. Approximate is fine — Alchemy filters by block, then
// `normalizeTransfer` re-filters by exact timestamp so edge precision is
// preserved.
const BLOCK_TIME_SEC: Record<number, number> = {
  1: 12,
  // 10: 2, 137: 2, 8453: 2, 42161: 0.25,
}
const REFERENCE_BLOCK: Record<number, { block: number; timestampSec: number }> = {
  // Ethereum mainnet: Devcon ticket-sale start (2026-05-20 UTC).
  1: { block: 25137422, timestampSec: Math.floor(Date.parse('2026-05-20T00:00:00Z') / 1000) },
}

function isoToUnixSec(iso: string, endOfDay: boolean): number | null {
  const ms = Date.parse(`${iso}T${endOfDay ? '23:59:59' : '00:00:00'}Z`)
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
}

/** Convert a YYYY-MM-DD date to an approximate block hex string for the
 *  given chain. Returns null when no reference is configured so callers
 *  can fall through to Alchemy defaults. */
function dateToBlockHex(chainId: number, iso: string, endOfDay: boolean): string | null {
  const ref = REFERENCE_BLOCK[chainId]
  const blockTime = BLOCK_TIME_SEC[chainId]
  if (!ref || !blockTime) return null
  const targetTs = isoToUnixSec(iso, endOfDay)
  if (targetTs == null) return null
  const block = Math.max(0, Math.floor(ref.block + (targetTs - ref.timestampSec) / blockTime))
  return '0x' + block.toString(16)
}

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
  filter: { toAddress?: string; fromAddress?: string; fromBlock?: string; toBlock?: string },
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
      ...(filter.toAddress && { toAddress: filter.toAddress }),
      ...(filter.fromAddress && { fromAddress: filter.fromAddress }),
      ...(filter.fromBlock && { fromBlock: filter.fromBlock }),
      ...(filter.toBlock && { toBlock: filter.toBlock }),
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

/** Normalize one Alchemy transfer into our IncomingTx shape. Returns null
 *  if the transfer fails the token/chain allowlist or the time window. */
function normalizeTransfer(
  t: AlchemyTransfer,
  chainId: number,
  window: { fromMs: number; toMs: number },
): IncomingTx | null {
  const tsStr = t.metadata?.blockTimestamp
  if (!tsStr) return null
  const ts = Date.parse(tsStr)
  if (!Number.isFinite(ts)) return null
  // Precise timestamp filter — Alchemy already filtered by block, but
  // block math is approximate so we re-check against the exact bounds.
  if (ts < window.fromMs || ts > window.toMs) return null

  let symbol: string | null = null
  let decimals: number | null = null

  if (t.category === 'external') {
    if (!NATIVE_ETH_CHAINS.has(chainId)) return null
    symbol = 'ETH'
    decimals = 18
  } else if (t.category === 'erc20') {
    const contract = (t.rawContract?.address ?? '').toLowerCase()
    const known = SUPPORTED_TOKENS_BY_ADDRESS[contract]
    if (!known || known.chainId !== chainId) return null
    symbol = known.symbol
    decimals = known.decimals
  } else {
    return null
  }

  let rawAmount: string | null = null
  const rawHex = t.rawContract?.value
  if (rawHex) {
    try {
      rawAmount = BigInt(rawHex).toString()
    } catch {
      rawAmount = null
    }
  }

  return {
    txHash: (t.hash ?? '').toLowerCase(),
    chainId,
    chainName: CHAIN_NAMES[chainId] ?? `chain ${chainId}`,
    symbol,
    rawAmount,
    decimals,
    from: (t.from ?? '').toLowerCase(),
    to: (t.to ?? '').toLowerCase(),
    blockNum: t.blockNum ?? null,
    timestamp: Math.floor(ts / 1000),
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

  // Date range comes from the admin page's global filter (YYYY-MM-DD).
  // We translate to per-chain block ranges so Alchemy only returns the
  // slice we care about; `normalizeTransfer` re-checks exact timestamps.
  const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : ''
  const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : ''
  const fromMs = dateFrom ? (isoToUnixSec(dateFrom, false) ?? 0) * 1000 : 0
  const toMs = dateTo ? (isoToUnixSec(dateTo, true) ?? Date.now() / 1000) * 1000 : Date.now()

  const chainIds = Object.keys(ALCHEMY_URLS).map(Number)
  // Block bounds per chain. When `dateFrom` is empty, default to the
  // chain's reference block so "All" doesn't scan all-time history.
  const blockBoundsByChain: Record<number, { fromBlock?: string; toBlock?: string }> = {}
  for (const chainId of chainIds) {
    const fromBlock =
      (dateFrom && dateToBlockHex(chainId, dateFrom, false)) ||
      (REFERENCE_BLOCK[chainId] ? '0x' + REFERENCE_BLOCK[chainId].block.toString(16) : undefined)
    // No toBlock when dateTo is empty or today/future — let Alchemy use latest.
    const todayIso = new Date().toISOString().slice(0, 10)
    const toBlock = dateTo && dateTo < todayIso
      ? (dateToBlockHex(chainId, dateTo, true) ?? undefined)
      : undefined
    blockBoundsByChain[chainId] = { fromBlock, toBlock }
  }

  // Fire both queries per chain in parallel (incoming-to-recipient and
  // outgoing-from-refunder).
  const [inResults, outResults] = await Promise.all([
    Promise.all(chainIds.map(c =>
      fetchChainTransfers(c, { toAddress: receiveAddress, ...blockBoundsByChain[c] }),
    )),
    Promise.all(chainIds.map(c =>
      fetchChainTransfers(c, { fromAddress: REFUND_WALLET, ...blockBoundsByChain[c] }),
    )),
  ])

  const incoming: IncomingTx[] = []
  const outgoingRefunds: IncomingTx[] = []
  const byChain: Record<string, { count: number; refundCount: number; error?: string }> = {}
  const errors: Record<string, string> = {}

  for (const { chainId, transfers, error } of inResults) {
    if (error) {
      errors[String(chainId)] = error
      byChain[String(chainId)] = { count: 0, refundCount: 0, error }
      continue
    }
    let count = 0
    for (const t of transfers) {
      const tx = normalizeTransfer(t, chainId, { fromMs, toMs })
      if (!tx) continue
      if (tx.to !== receiveAddress) continue
      incoming.push(tx)
      count++
    }
    byChain[String(chainId)] = { count, refundCount: 0 }
  }

  for (const { chainId, transfers, error } of outResults) {
    if (error) {
      // Refunder errors are non-fatal — surface alongside the per-chain
      // entry but don't override an incoming-side error message.
      const existing = byChain[String(chainId)]
      if (existing && !existing.error) existing.error = `refunds: ${error}`
      errors[`refund:${chainId}`] = error
      continue
    }
    let refundCount = 0
    for (const t of transfers) {
      const tx = normalizeTransfer(t, chainId, { fromMs, toMs })
      if (!tx) continue
      if (tx.from !== REFUND_WALLET) continue
      outgoingRefunds.push(tx)
      refundCount++
    }
    const existing = byChain[String(chainId)]
    if (existing) existing.refundCount = refundCount
    else byChain[String(chainId)] = { count: 0, refundCount }
  }

  incoming.sort((a, b) => b.timestamp - a.timestamp)
  outgoingRefunds.sort((a, b) => b.timestamp - a.timestamp)

  return res.status(200).json({
    success: true,
    receiveAddress,
    refundAddress: REFUND_WALLET,
    byChain,
    incoming,
    outgoingRefunds,
    errors,
  })
}
