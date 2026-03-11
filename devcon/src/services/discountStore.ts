/**
 * Discount Code & Voucher Store Service
 * Manages discount code validation, voucher assignment, and rate limiting.
 * Uses Supabase (Postgres) for persistence across serverless invocations.
 * Schema: devcon-api src/supabase/migrations/20260228120000_discount_codes_and_vouchers.sql
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TICKETING } from 'config/ticketing'

export interface DiscountCode {
  id: number
  code: string
  claimedBy: string | null
  claimedAt: string | null
  voucherCode: string | null
  collection: string
}

export interface DiscountVoucher {
  id: number
  code: string
  pretixVoucherId: number
  itemId: number
  tag: string
  assignedTo: string | null
  assignedAt: string | null
  collection: string
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for discount store')
  }
  return createClient(url, key)
}

/**
 * Look up a discount code by value. Returns the record regardless of claim status, or null if not found.
 */
export async function lookupDiscountCode(code: string): Promise<DiscountCode | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devcon8_early_access_codes')
    .select('*')
    .eq('code', code)
    .eq('collection', TICKETING.discount.collection)
    .maybeSingle()
  if (error) throw new Error(`discountStore lookupDiscountCode: ${error.message}`)
  if (!data) return null
  return {
    id: data.id,
    code: data.code,
    claimedBy: data.claimed_by,
    claimedAt: data.claimed_at,
    voucherCode: data.voucher_code,
    collection: data.collection,
  }
}

/**
 * Validate a discount code. Returns the code record if valid (unclaimed), null otherwise.
 */
export async function validateDiscountCode(code: string): Promise<DiscountCode | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devcon8_early_access_codes')
    .select('*')
    .eq('code', code)
    .eq('collection', TICKETING.discount.collection)
    .maybeSingle()
  if (error) throw new Error(`discountStore validateDiscountCode: ${error.message}`)
  if (!data) return null
  if (data.claimed_by) return null
  return {
    id: data.id,
    code: data.code,
    claimedBy: data.claimed_by,
    claimedAt: data.claimed_at,
    voucherCode: data.voucher_code,
    collection: data.collection,
  }
}

/**
 * Claim a discount code atomically. Uses WHERE claimed_by IS NULL for race-condition safety.
 * Returns true if claimed, false if already claimed by someone else.
 * Call this BEFORE assignVoucher to prevent race conditions.
 */
export async function claimDiscountCode(code: string, claimedBy: string, voucherCode?: string): Promise<boolean> {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  const update: Record<string, string> = {
    claimed_by: claimedBy,
    claimed_at: now,
    updated_at: now,
  }
  if (voucherCode) update.voucher_code = voucherCode
  const { data, error } = await supabase
    .from('devcon8_early_access_codes')
    .update(update)
    .eq('code', code)
    .eq('collection', TICKETING.discount.collection)
    .is('claimed_by', null)
    .select('id')
  if (error) throw new Error(`discountStore claimDiscountCode: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/**
 * Link a voucher code to an already-claimed discount code.
 */
export async function linkVoucherToDiscountCode(code: string, voucherCode: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('devcon8_early_access_codes')
    .update({ voucher_code: voucherCode, updated_at: new Date().toISOString() })
    .eq('code', code)
  if (error) throw new Error(`discountStore linkVoucherToDiscountCode: ${error.message}`)
}

/**
 * Assign a voucher from the pool. Enforces one-voucher-per-identity:
 * if assignedTo already has a voucher, returns that existing one.
 * Otherwise atomically assigns an unassigned voucher.
 */
export async function assignVoucher(
  assignedTo: string,
  collection: string
): Promise<DiscountVoucher | null> {
  const supabase = getSupabase()

  // Check if this identity already has a voucher (one-voucher-per-identity)
  const existing = await getAssignedVoucher(assignedTo)
  if (existing) return existing

  // Find an unassigned voucher in the same collection
  const { data: available, error: findError } = await supabase
    .from('devcon8_early_access_vouchers')
    .select('id')
    .eq('collection', collection)
    .is('assigned_to', null)
    .limit(1)
    .maybeSingle()
  if (findError) throw new Error(`discountStore assignVoucher find: ${findError.message}`)
  if (!available) return null

  // Atomically assign it (WHERE assigned_to IS NULL guards against races)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('devcon8_early_access_vouchers')
    .update({
      assigned_to: assignedTo,
      assigned_at: now,
      updated_at: now,
    })
    .eq('id', available.id)
    .is('assigned_to', null)
    .select('*')
  if (error) throw new Error(`discountStore assignVoucher update: ${error.message}`)

  // If another request beat us, try once more (re-check identity dedup first)
  if (!data || data.length === 0) {
    const retryExisting = await getAssignedVoucher(assignedTo)
    if (retryExisting) return retryExisting
    return assignVoucher(assignedTo, collection)
  }

  const row = data[0]
  return {
    id: row.id,
    code: row.code,
    pretixVoucherId: row.pretix_voucher_id,
    itemId: row.item_id,
    tag: row.tag,
    assignedTo: row.assigned_to,
    assignedAt: row.assigned_at,
    collection: row.collection,
  }
}

/**
 * Get the voucher already assigned to this identity (for dedup check + polling fallback).
 */
export async function getAssignedVoucher(assignedTo: string): Promise<DiscountVoucher | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devcon8_early_access_vouchers')
    .select('*')
    .eq('assigned_to', assignedTo)
    .maybeSingle()
  if (error) throw new Error(`discountStore getAssignedVoucher: ${error.message}`)
  if (!data) return null
  return {
    id: data.id,
    code: data.code,
    pretixVoucherId: data.pretix_voucher_id,
    itemId: data.item_id,
    tag: data.tag,
    assignedTo: data.assigned_to,
    assignedAt: data.assigned_at,
    collection: data.collection,
  }
}

/**
 * Bulk insert discount codes (for generate script).
 */
export async function insertDiscountCodes(codes: string[], collection: string = TICKETING.discount.collection): Promise<number> {
  const supabase = getSupabase()
  const rows = codes.map(code => ({ code, collection }))
  const CHUNK_SIZE = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase.from('devcon8_early_access_codes').insert(chunk)
    if (error) throw new Error(`discountStore insertDiscountCodes chunk ${i}: ${error.message}`)
    inserted += chunk.length
  }
  return inserted
}

/**
 * Bulk insert discount vouchers (for generate script).
 */
export async function insertDiscountVouchers(
  vouchers: Array<{ code: string; pretixVoucherId: number; itemId: number; tag?: string }>,
  collection: string = TICKETING.discount.collection
): Promise<number> {
  const supabase = getSupabase()
  const rows = vouchers.map(v => ({
    code: v.code,
    pretix_voucher_id: v.pretixVoucherId,
    item_id: v.itemId,
    tag: v.tag ?? 'default',
    collection,
  }))
  const CHUNK_SIZE = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase.from('devcon8_early_access_vouchers').insert(chunk)
    if (error) throw new Error(`discountStore insertDiscountVouchers chunk ${i}: ${error.message}`)
    inserted += chunk.length
  }
  return inserted
}

/**
 * Store the email address for a voucher (called when user sends voucher to email).
 */
export async function setVoucherEmail(voucherCode: string, email: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('devcon8_early_access_vouchers')
    .update({ email, updated_at: new Date().toISOString() })
    .eq('code', voucherCode)
  if (error) throw new Error(`discountStore setVoucherEmail: ${error.message}`)
}

const RATE_LIMIT_DISCOUNT_IP_WINDOW_MINUTES = 1
const RATE_LIMIT_DISCOUNT_IP_MAX = 60

/**
 * Check discount code validation rate limit. Returns true if allowed.
 * Per IP: max 10 requests per minute.
 */
export async function checkDiscountRateLimit(clientIp: string): Promise<{ allowed: boolean }> {
  const supabase = getSupabase()
  const now = new Date()
  const ipSince = new Date(now.getTime() - RATE_LIMIT_DISCOUNT_IP_WINDOW_MINUTES * 60 * 1000).toISOString()
  const ipKey = `discount_ip:${clientIp}`

  const ipCount = await supabase
    .from('x402_verify_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('key', ipKey)
    .gte('created_at', ipSince)

  if ((ipCount.count ?? 0) >= RATE_LIMIT_DISCOUNT_IP_MAX) return { allowed: false }

  await supabase.from('x402_verify_attempts').insert([{ key: ipKey }])
  return { allowed: true }
}
