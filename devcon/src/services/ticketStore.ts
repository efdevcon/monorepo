/**
 * Ticket Order Store Service
 * Manages pending ticket orders between payment request and verification.
 * Uses Supabase (Postgres) for persistence across serverless invocations.
 * Schema: run devcon-api src/supabase/migrations/ (e.g. expected_eth_amount_wei_by_chain).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { PretixOrderCreateRequest } from '../types/pretix'
import { TICKETING_ENV } from '../config/ticketing'

/** Expected ETH amount in wei per chain ID (server-computed at order creation for secure verification) */
export type ExpectedEthAmountWeiByChain = Record<string, string>

export interface PendingTicketOrder {
  paymentReference: string
  orderData: PretixOrderCreateRequest
  totalUsd: string
  createdAt: number
  expiresAt: number
  /** Wallet address that must submit the payment (prevents tx reuse attack) */
  intendedPayer: string
  /** Server-computed expected ETH amount in wei per chainId (e.g. { "8453": "..." }) for native ETH verification */
  expectedEthAmountWeiByChain?: ExpectedEthAmountWeiByChain
  /** Expected chain ID for payment verification (prevents cross-chain tx reuse) */
  expectedChainId?: number
  metadata?: {
    ticketIds: number[]
    addonIds?: number[]
    email: string
  }
  env?: string
}

export interface CompletedTicketOrder {
  paymentReference: string
  pretixOrderCode: string
  txHash: string
  payer: string
  completedAt: number
  chainId?: number
  totalUsd?: string
  tokenSymbol?: string
  cryptoAmount?: string
  gasCostWei?: string
  env?: string
}

interface PendingRow {
  payment_reference: string
  order_data: PretixOrderCreateRequest
  total_usd: string
  created_at: number
  expires_at: number
  intended_payer: string | null
  expected_eth_amount_wei_by_chain: ExpectedEthAmountWeiByChain | null
  expected_chain_id: number | null
  metadata: Record<string, unknown> | null
  env: string
}

interface CompletedRow {
  payment_reference: string
  pretix_order_code: string
  tx_hash: string
  payer: string
  completed_at: number
  chain_id: number | null
  total_usd: string | null
  token_symbol: string | null
  crypto_amount: string | null
  gas_cost_wei: string | null
  env: string
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for ticket store')
  }
  return createClient(url, key)
}

function rowToPending(row: PendingRow): PendingTicketOrder {
  return {
    paymentReference: row.payment_reference,
    orderData: row.order_data,
    totalUsd: row.total_usd,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    intendedPayer: row.intended_payer ?? '',
    expectedEthAmountWeiByChain: row.expected_eth_amount_wei_by_chain ?? undefined,
    expectedChainId: row.expected_chain_id ?? undefined,
    metadata: row.metadata as PendingTicketOrder['metadata'] ?? undefined,
    env: row.env,
  }
}

function rowToCompleted(row: CompletedRow): CompletedTicketOrder {
  return {
    paymentReference: row.payment_reference,
    pretixOrderCode: row.pretix_order_code,
    txHash: row.tx_hash,
    payer: row.payer,
    completedAt: row.completed_at,
    chainId: row.chain_id ?? undefined,
    totalUsd: row.total_usd ?? undefined,
    tokenSymbol: row.token_symbol ?? undefined,
    cryptoAmount: row.crypto_amount ?? undefined,
    gasCostWei: row.gas_cost_wei ?? undefined,
    env: row.env,
  }
}

/**
 * Store a pending ticket order
 */
export async function storePendingOrder(order: PendingTicketOrder): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('x402_pending_orders').upsert({
    payment_reference: order.paymentReference,
    order_data: order.orderData,
    total_usd: order.totalUsd,
    created_at: Math.floor(Number(order.createdAt)),
    expires_at: Math.floor(Number(order.expiresAt)),
    intended_payer: order.intendedPayer,
    expected_eth_amount_wei_by_chain: order.expectedEthAmountWeiByChain ?? null,
    expected_chain_id: order.expectedChainId ?? null,
    metadata: order.metadata ?? null,
    env: TICKETING_ENV,
  }, { onConflict: 'payment_reference' })
  if (error) throw new Error(`ticketStore storePendingOrder: ${error.message}`)
}

/**
 * Get a pending order by payment reference (returns undefined if expired or not found)
 */
export async function getPendingOrder(paymentReference: string): Promise<PendingTicketOrder | undefined> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_pending_orders')
    .select('*')
    .eq('payment_reference', paymentReference)
    .eq('env', TICKETING_ENV)
    .maybeSingle()
  if (error) throw new Error(`ticketStore getPendingOrder: ${error.message}`)
  if (!data) return undefined
  const order = rowToPending(data as PendingRow)
  if (Date.now() / 1000 > order.expiresAt) {
    await supabase.from('x402_pending_orders').delete().eq('payment_reference', paymentReference).eq('env', TICKETING_ENV)
    return undefined
  }
  return order
}

/**
 * Atomically claim a pending order (delete and return it). Only one caller can succeed.
 * Use before createOrder to prevent double Pretix order creation under concurrent verify.
 * Returns the order if claimed, undefined if already claimed/expired/not found.
 */
export async function claimPendingOrder(paymentReference: string): Promise<PendingTicketOrder | undefined> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_pending_orders')
    .delete()
    .eq('payment_reference', paymentReference)
    .eq('env', TICKETING_ENV)
    .select()
  if (error) throw new Error(`ticketStore claimPendingOrder: ${error.message}`)
  if (!data || data.length === 0) return undefined
  const row = data[0] as PendingRow
  if (Date.now() / 1000 > row.expires_at) return undefined
  return rowToPending(row)
}

/**
 * Remove a pending order (after completion or cancellation)
 */
export async function removePendingOrder(paymentReference: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_pending_orders')
    .delete()
    .eq('payment_reference', paymentReference)
    .eq('env', TICKETING_ENV)
    .select('payment_reference')
  if (error) throw new Error(`ticketStore removePendingOrder: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/**
 * Store a completed order and remove from pending.
 * Throws TxHashAlreadyUsedError if the tx_hash unique constraint is violated
 * (another order already used this transaction — prevents double-spend).
 */
export class TxHashAlreadyUsedError extends Error {
  constructor(txHash: string) {
    super(`Transaction ${txHash} has already been used to complete an order`)
    this.name = 'TxHashAlreadyUsedError'
  }
}

export async function storeCompletedOrder(order: CompletedTicketOrder): Promise<void> {
  const supabase = getSupabase()
  const { error: errCompleted } = await supabase.from('x402_completed_orders').insert({
    payment_reference: order.paymentReference,
    pretix_order_code: order.pretixOrderCode,
    tx_hash: order.txHash,
    payer: order.payer,
    completed_at: Math.floor(Number(order.completedAt)),
    chain_id: order.chainId ?? null,
    total_usd: order.totalUsd ?? null,
    token_symbol: order.tokenSymbol ?? null,
    crypto_amount: order.cryptoAmount ?? null,
    gas_cost_wei: order.gasCostWei ?? null,
    env: TICKETING_ENV,
  })
  if (errCompleted) {
    // Unique constraint on tx_hash — another request already completed with this tx
    if (errCompleted.code === '23505' && errCompleted.message?.includes('tx_hash')) {
      throw new TxHashAlreadyUsedError(order.txHash)
    }
    throw new Error(`ticketStore storeCompletedOrder: ${errCompleted.message}`)
  }
  await supabase.from('x402_pending_orders').delete().eq('payment_reference', order.paymentReference).eq('env', TICKETING_ENV)
}

const RESERVED_PRETIX_CODE = '__RESERVED__'

/**
 * Reserve a tx_hash atomically BEFORE creating a Pretix order.
 * Inserts a row with a placeholder pretix_order_code. The unique constraint
 * on tx_hash ensures only one request can reserve a given transaction.
 * Throws TxHashAlreadyUsedError if the tx_hash is already taken.
 */
export async function reserveCompletedOrder(
  txHash: string,
  paymentReference: string,
  payer: string,
  completedAt: number,
  chainId?: number,
  totalUsd?: string,
  tokenSymbol?: string,
  cryptoAmount?: string,
  gasCostWei?: string
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('x402_completed_orders').insert({
    payment_reference: paymentReference,
    pretix_order_code: RESERVED_PRETIX_CODE,
    tx_hash: txHash,
    payer,
    completed_at: Math.floor(Number(completedAt)),
    chain_id: chainId ?? null,
    total_usd: totalUsd ?? null,
    token_symbol: tokenSymbol ?? null,
    crypto_amount: cryptoAmount ?? null,
    gas_cost_wei: gasCostWei ?? null,
    env: TICKETING_ENV,
  })
  if (error) {
    if (error.code === '23505' && error.message?.includes('tx_hash')) {
      throw new TxHashAlreadyUsedError(txHash)
    }
    throw new Error(`ticketStore reserveCompletedOrder: ${error.message}`)
  }
}

/**
 * Finalize a reserved completed order with the real Pretix order code.
 * Also deletes the pending order row.
 */
export async function finalizeCompletedOrder(
  paymentReference: string,
  pretixOrderCode: string
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('x402_completed_orders')
    .update({ pretix_order_code: pretixOrderCode })
    .eq('payment_reference', paymentReference)
    .eq('pretix_order_code', RESERVED_PRETIX_CODE)
    .eq('env', TICKETING_ENV)
  if (error) {
    throw new Error(`ticketStore finalizeCompletedOrder: ${error.message}`)
  }
  await supabase.from('x402_pending_orders').delete().eq('payment_reference', paymentReference).eq('env', TICKETING_ENV)
}

/**
 * Remove a reservation (e.g. if Pretix order creation fails, allow retry).
 */
export async function removeCompletedOrderReservation(paymentReference: string): Promise<void> {
  const supabase = getSupabase()
  await supabase
    .from('x402_completed_orders')
    .delete()
    .eq('payment_reference', paymentReference)
    .eq('pretix_order_code', RESERVED_PRETIX_CODE)
    .eq('env', TICKETING_ENV)
}

/**
 * Get a completed order by payment reference
 */
export async function getCompletedOrder(paymentReference: string): Promise<CompletedTicketOrder | undefined> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_completed_orders')
    .select('*')
    .eq('payment_reference', paymentReference)
    .eq('env', TICKETING_ENV)
    .maybeSingle()
  if (error) throw new Error(`ticketStore getCompletedOrder: ${error.message}`)
  return data ? rowToCompleted(data as CompletedRow) : undefined
}

/**
 * Get completed order by Pretix order code
 */
export async function getCompletedOrderByPretixCode(pretixOrderCode: string): Promise<CompletedTicketOrder | undefined> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_completed_orders')
    .select('*')
    .eq('pretix_order_code', pretixOrderCode)
    .eq('env', TICKETING_ENV)
    .maybeSingle()
  if (error) throw new Error(`ticketStore getCompletedOrderByPretixCode: ${error.message}`)
  return data ? rowToCompleted(data as CompletedRow) : undefined
}

/**
 * Get completed order by txHash (for one-time-use check)
 */
export async function getCompletedOrderByTxHash(txHash: string): Promise<CompletedTicketOrder | undefined> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_completed_orders')
    .select('*')
    .eq('tx_hash', txHash)
    .eq('env', TICKETING_ENV)
    .maybeSingle()
  if (error) throw new Error(`ticketStore getCompletedOrderByTxHash: ${error.message}`)
  return data ? rowToCompleted(data as CompletedRow) : undefined
}

const RATE_LIMIT_REF_WINDOW_HOURS = 1
const RATE_LIMIT_REF_MAX = 10
const RATE_LIMIT_REF_COOLDOWN_SECONDS = 10
const RATE_LIMIT_IP_WINDOW_MINUTES = 1
const RATE_LIMIT_IP_MAX = 30

/**
 * Check verify rate limits and record this attempt. Returns true if allowed.
 * - Per payment reference: max 10 attempts per hour; no two attempts within 10 seconds.
 * - Per IP: max 30 attempts per minute.
 */
export async function checkAndRecordVerifyAttempt(paymentReference: string, clientIp: string): Promise<{ allowed: boolean }> {
  const supabase = getSupabase()
  const now = new Date()
  const refSince = new Date(now.getTime() - RATE_LIMIT_REF_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const refCooldownSince = new Date(now.getTime() - RATE_LIMIT_REF_COOLDOWN_SECONDS * 1000).toISOString()
  const ipSince = new Date(now.getTime() - RATE_LIMIT_IP_WINDOW_MINUTES * 60 * 1000).toISOString()

  const refKey = `verify_ref:${paymentReference}`
  const ipKey = `verify_ip:${clientIp}`

  const [refCount, refRecentCount, ipCount] = await Promise.all([
    supabase.from('x402_verify_attempts').select('id', { count: 'exact', head: true }).eq('key', refKey).gte('created_at', refSince),
    supabase.from('x402_verify_attempts').select('id', { count: 'exact', head: true }).eq('key', refKey).gte('created_at', refCooldownSince),
    supabase.from('x402_verify_attempts').select('id', { count: 'exact', head: true }).eq('key', ipKey).gte('created_at', ipSince),
  ])

  if ((refCount.count ?? 0) >= RATE_LIMIT_REF_MAX) return { allowed: false }
  if ((refRecentCount.count ?? 0) >= 1) return { allowed: false }
  if ((ipCount.count ?? 0) >= RATE_LIMIT_IP_MAX) return { allowed: false }

  await supabase.from('x402_verify_attempts').insert([{ key: refKey }, { key: ipKey }])
  await supabase.from('x402_verify_attempts').delete().lt('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
  return { allowed: true }
}

const RATE_LIMIT_PURCHASE_IP_WINDOW_MINUTES = 1
const RATE_LIMIT_PURCHASE_IP_MAX = 5

/**
 * Check purchase rate limits. Returns true if allowed.
 * Per IP: max 5 purchase requests per minute.
 */
export async function checkPurchaseRateLimit(clientIp: string): Promise<{ allowed: boolean }> {
  const supabase = getSupabase()
  const now = new Date()
  const ipSince = new Date(now.getTime() - RATE_LIMIT_PURCHASE_IP_WINDOW_MINUTES * 60 * 1000).toISOString()
  const ipKey = `purchase_ip:${clientIp}`

  const ipCount = await supabase
    .from('x402_verify_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('key', ipKey)
    .gte('created_at', ipSince)

  if ((ipCount.count ?? 0) >= RATE_LIMIT_PURCHASE_IP_MAX) return { allowed: false }

  await supabase.from('x402_verify_attempts').insert([{ key: ipKey }])
  return { allowed: true }
}

/**
 * Clean up expired pending orders
 */
export async function cleanupExpiredOrders(): Promise<void> {
  const supabase = getSupabase()
  const now = Math.floor(Date.now() / 1000)
  await supabase.from('x402_pending_orders').delete().lt('expires_at', now).eq('env', TICKETING_ENV)
}

/**
 * Get all pending orders (for debugging)
 */
export async function getAllPendingOrders(): Promise<PendingTicketOrder[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_pending_orders')
    .select('*')
    .eq('env', TICKETING_ENV)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`ticketStore getAllPendingOrders: ${error.message}`)
  return (data ?? []).map((row) => rowToPending(row as PendingRow))
}

/**
 * Get all completed orders (for admin monitoring)
 */
export async function getAllCompletedOrders(): Promise<CompletedTicketOrder[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('x402_completed_orders')
    .select('*')
    .eq('env', TICKETING_ENV)
    .order('completed_at', { ascending: false })
  if (error) throw new Error(`ticketStore getAllCompletedOrders: ${error.message}`)
  return (data ?? []).map((row) => rowToCompleted(row as CompletedRow))
}

/**
 * Get store stats (for debugging)
 */
export async function getStoreStats(): Promise<{ pending: number; completed: number }> {
  const supabase = getSupabase()
  const [pendingRes, completedRes] = await Promise.all([
    supabase.from('x402_pending_orders').select('payment_reference', { count: 'exact', head: true }).eq('env', TICKETING_ENV),
    supabase.from('x402_completed_orders').select('payment_reference', { count: 'exact', head: true }).eq('env', TICKETING_ENV),
  ])
  if (pendingRes.error) throw new Error(`ticketStore getStoreStats pending: ${pendingRes.error.message}`)
  if (completedRes.error) throw new Error(`ticketStore getStoreStats completed: ${completedRes.error.message}`)
  return {
    pending: pendingRes.count ?? 0,
    completed: completedRes.count ?? 0,
  }
}
