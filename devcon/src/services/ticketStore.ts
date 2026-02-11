/**
 * Ticket Order Store Service
 * Manages pending ticket orders between payment request and verification.
 * Uses Supabase (Postgres) for persistence across serverless invocations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { PretixOrderCreateRequest } from '../types/pretix'

export interface PendingTicketOrder {
  paymentReference: string
  orderData: PretixOrderCreateRequest
  totalUsd: string
  createdAt: number
  expiresAt: number
  /** Wallet address that must submit the payment (prevents tx reuse attack) */
  intendedPayer: string
  metadata?: {
    ticketIds: number[]
    addonIds?: number[]
    email: string
  }
}

export interface CompletedTicketOrder {
  paymentReference: string
  pretixOrderCode: string
  txHash: string
  payer: string
  completedAt: number
}

interface PendingRow {
  payment_reference: string
  order_data: PretixOrderCreateRequest
  total_usd: string
  created_at: number
  expires_at: number
  intended_payer: string | null
  metadata: Record<string, unknown> | null
}

interface CompletedRow {
  payment_reference: string
  pretix_order_code: string
  tx_hash: string
  payer: string
  completed_at: number
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
    metadata: row.metadata as PendingTicketOrder['metadata'] ?? undefined,
  }
}

function rowToCompleted(row: CompletedRow): CompletedTicketOrder {
  return {
    paymentReference: row.payment_reference,
    pretixOrderCode: row.pretix_order_code,
    txHash: row.tx_hash,
    payer: row.payer,
    completedAt: row.completed_at,
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
    metadata: order.metadata ?? null,
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
    .maybeSingle()
  if (error) throw new Error(`ticketStore getPendingOrder: ${error.message}`)
  if (!data) return undefined
  const order = rowToPending(data as PendingRow)
  if (Date.now() / 1000 > order.expiresAt) {
    await supabase.from('x402_pending_orders').delete().eq('payment_reference', paymentReference)
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
    .select('payment_reference')
  if (error) throw new Error(`ticketStore removePendingOrder: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/**
 * Store a completed order and remove from pending
 */
export async function storeCompletedOrder(order: CompletedTicketOrder): Promise<void> {
  const supabase = getSupabase()
  const { error: errCompleted } = await supabase.from('x402_completed_orders').insert({
    payment_reference: order.paymentReference,
    pretix_order_code: order.pretixOrderCode,
    tx_hash: order.txHash,
    payer: order.payer,
    completed_at: Math.floor(Number(order.completedAt)),
  })
  if (errCompleted) throw new Error(`ticketStore storeCompletedOrder: ${errCompleted.message}`)
  await supabase.from('x402_pending_orders').delete().eq('payment_reference', order.paymentReference)
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

/**
 * Clean up expired pending orders
 */
export async function cleanupExpiredOrders(): Promise<void> {
  const supabase = getSupabase()
  const now = Math.floor(Date.now() / 1000)
  await supabase.from('x402_pending_orders').delete().lt('expires_at', now)
}

/**
 * Get all pending orders (for debugging)
 */
export async function getAllPendingOrders(): Promise<PendingTicketOrder[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('x402_pending_orders').select('*')
  if (error) throw new Error(`ticketStore getAllPendingOrders: ${error.message}`)
  return (data ?? []).map((row) => rowToPending(row as PendingRow))
}

/**
 * Get store stats (for debugging)
 */
export async function getStoreStats(): Promise<{ pending: number; completed: number }> {
  const supabase = getSupabase()
  const [pendingRes, completedRes] = await Promise.all([
    supabase.from('x402_pending_orders').select('payment_reference', { count: 'exact', head: true }),
    supabase.from('x402_completed_orders').select('payment_reference', { count: 'exact', head: true }),
  ])
  if (pendingRes.error) throw new Error(`ticketStore getStoreStats pending: ${pendingRes.error.message}`)
  if (completedRes.error) throw new Error(`ticketStore getStoreStats completed: ${completedRes.error.message}`)
  return {
    pending: pendingRes.count ?? 0,
    completed: completedRes.count ?? 0,
  }
}
