/**
 * Discount Code & Voucher Store Service
 * Manages discount code validation, voucher assignment, and rate limiting.
 * Uses Supabase (Postgres) for persistence across serverless invocations.
 * Schema: devcon-api src/supabase/migrations/20260228120000_discount_codes_and_vouchers.sql
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TICKETING } from 'config/ticketing'
import { createVoucher } from './pretix'

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
 * Check whether unassigned vouchers exist in the pool.
 */
export async function hasAvailableVouchers(collection: string = TICKETING.discount.collection): Promise<boolean> {
  const supabase = getSupabase()
  const { count, error } = await supabase
    .from('devcon8_early_access_vouchers')
    .select('id', { count: 'exact', head: true })
    .eq('collection', collection)
    .is('assigned_to', null)
  if (error) throw new Error(`discountStore hasAvailableVouchers: ${error.message}`)
  return (count ?? 0) > 0
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

  // Unique index violation (parallel request already assigned a different voucher to this identity)
  if (error && error.code === '23505') {
    const existing = await getAssignedVoucher(assignedTo)
    if (existing) return existing
  }
  if (error) throw new Error(`discountStore assignVoucher update: ${error.message}`)

  // If another request beat us to THIS voucher, try once more (re-check identity dedup first)
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
 * Issue a voucher to an identity by creating one on the fly in Pretix.
 *
 * Unlike `assignVoucher` (which draws from a pre-seeded pool), this creates a
 * fresh single-use Pretix voucher that unlocks `itemId` and records it. Used by
 * the community discounts and the Self flow, where ticket quota and price live
 * on the item, so no pool needs pre-seeding.
 *
 * Enforces one voucher per identity globally: if `assignedTo` already holds a
 * voucher (any collection), that same code is returned and no new Pretix
 * voucher is created.
 */
export async function issueVoucher(
  assignedTo: string,
  itemId: number,
  collection: string,
  tag?: string
): Promise<DiscountVoucher | null> {
  const supabase = getSupabase()

  // One voucher per identity (global, no collection filter): re-share existing.
  const existing = await getAssignedVoucher(assignedTo)
  if (existing) return existing

  // Create a fresh single-use voucher that unlocks the item.
  const created = await createVoucher({
    itemId,
    tag: tag ?? collection,
    maxUsages: 1,
    comment: `Discount voucher for ${collection} (${assignedTo})`,
  })

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('devcon8_early_access_vouchers')
    .insert({
      code: created.code,
      pretix_voucher_id: created.id,
      item_id: itemId,
      tag: tag ?? collection,
      collection,
      assigned_to: assignedTo,
      assigned_at: now,
      updated_at: now,
    })
    .select('*')

  // Unique-index race: a parallel first claim for this identity already
  // inserted a row. Our just-created Pretix voucher is orphaned (unused, single
  // identity only ever redeems the stored one); return the winning row.
  if (error && error.code === '23505') {
    const winner = await getAssignedVoucher(assignedTo)
    if (winner) return winner
  }
  if (error) throw new Error(`discountStore issueVoucher insert: ${error.message}`)

  const row = data?.[0]
  if (!row) return null
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
 * Fetch all existing codes for a collection (for dedup before bulk insert).
 */
export async function getExistingCodes(collection: string = TICKETING.discount.collection): Promise<Set<string>> {
  const supabase = getSupabase()
  const codes = new Set<string>()
  const PAGE_SIZE = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('devcon8_early_access_codes')
      .select('code')
      .eq('collection', collection)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`discountStore getExistingCodes: ${error.message}`)
    if (!data || data.length === 0) break
    for (const row of data) codes.add(row.code)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return codes
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
 * Store the email address for a voucher (called at voucher assignment time).
 */
export async function setVoucherEmail(voucherCode: string, email: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('devcon8_early_access_vouchers')
    .update({ email, updated_at: new Date().toISOString() })
    .eq('code', voucherCode)
  if (error) throw new Error(`discountStore setVoucherEmail: ${error.message}`)
}

/**
 * Mark a voucher's email as successfully sent.
 */
export async function setVoucherEmailSent(voucherCode: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('devcon8_early_access_vouchers')
    .update({ email_sent: true, updated_at: new Date().toISOString() })
    .eq('code', voucherCode)
  if (error) throw new Error(`discountStore setVoucherEmailSent: ${error.message}`)
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

const RATE_LIMIT_VOUCHER_IP_WINDOW_MINUTES = 1
const RATE_LIMIT_VOUCHER_IP_MAX = 30

/**
 * Voucher-validation rate limit. Per IP: 30 requests / minute. Without this
 * the public `/validate-voucher` endpoint is a brute-force oracle for the
 * voucher code namespace (codes are alphanumeric, often short).
 */
export async function checkVoucherValidationRateLimit(clientIp: string): Promise<{ allowed: boolean }> {
  const supabase = getSupabase()
  const now = new Date()
  const ipSince = new Date(now.getTime() - RATE_LIMIT_VOUCHER_IP_WINDOW_MINUTES * 60 * 1000).toISOString()
  const ipKey = `voucher_ip:${clientIp}`

  const ipCount = await supabase
    .from('x402_verify_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('key', ipKey)
    .gte('created_at', ipSince)

  if ((ipCount.count ?? 0) >= RATE_LIMIT_VOUCHER_IP_MAX) return { allowed: false }

  await supabase.from('x402_verify_attempts').insert([{ key: ipKey }])
  return { allowed: true }
}

const RATE_LIMIT_SELF_VOUCHER_WINDOW_MINUTES = 1
const RATE_LIMIT_SELF_VOUCHER_IP_MAX = 60

/**
 * Self-voucher poll rate limit. The frontend polls this endpoint every few
 * seconds while a voucher is being assigned, so the cap is generous (60/min/IP
 * = up to 1/sec). The `userId` is a 122-bit UUID known only to the originating
 * session, so this limit is purely DoS protection, not anti-enumeration — a
 * tight per-key cap (as the email limiter has) would block legitimate polling.
 */
export async function checkSelfVoucherRateLimit(clientIp: string): Promise<{ allowed: boolean }> {
  const supabase = getSupabase()
  const now = new Date()
  const ipSince = new Date(now.getTime() - RATE_LIMIT_SELF_VOUCHER_WINDOW_MINUTES * 60 * 1000).toISOString()
  const ipKey = `selfvoucher_ip:${clientIp}`

  const ipCount = await supabase
    .from('x402_verify_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('key', ipKey)
    .gte('created_at', ipSince)

  if ((ipCount.count ?? 0) >= RATE_LIMIT_SELF_VOUCHER_IP_MAX) return { allowed: false }

  await supabase.from('x402_verify_attempts').insert([{ key: ipKey }])
  return { allowed: true }
}

const RATE_LIMIT_VOUCHER_EMAIL_WINDOW_MINUTES = 1
const RATE_LIMIT_VOUCHER_EMAIL_IP_MAX = 10
const RATE_LIMIT_VOUCHER_EMAIL_ADDR_MAX = 3

/**
 * Voucher-email rate limit (M10). Per IP: 10 requests / minute; per recipient
 * email: 3 / minute. The endpoint is unauthenticated and the email address is
 * caller-supplied, so without this it doubles as a phishing-assist relay
 * (Devcon-branded email sent to any address using a known-valid voucher
 * code) and a code-existence oracle.
 *
 * Email address is normalised (lowercased + plus-stripped) before keying so
 * `victim+1@x.com` and `Victim@x.com` count as the same recipient.
 */
export async function checkVoucherEmailRateLimit(
  clientIp: string,
  email: string,
): Promise<{ allowed: boolean }> {
  const supabase = getSupabase()
  const now = new Date()
  const since = new Date(now.getTime() - RATE_LIMIT_VOUCHER_EMAIL_WINDOW_MINUTES * 60 * 1000).toISOString()

  const ipKey = `voucher_email_ip:${clientIp}`
  const normalisedEmail = email.trim().toLowerCase().split('@')
  const localPart = (normalisedEmail[0] || '').split('+')[0]
  const domainPart = normalisedEmail[1] || ''
  const emailKey = `voucher_email_addr:${localPart}@${domainPart}`

  const [ipCount, emailCount] = await Promise.all([
    supabase
      .from('x402_verify_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('key', ipKey)
      .gte('created_at', since),
    supabase
      .from('x402_verify_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('key', emailKey)
      .gte('created_at', since),
  ])

  if ((ipCount.count ?? 0) >= RATE_LIMIT_VOUCHER_EMAIL_IP_MAX) return { allowed: false }
  if ((emailCount.count ?? 0) >= RATE_LIMIT_VOUCHER_EMAIL_ADDR_MAX) return { allowed: false }

  await supabase.from('x402_verify_attempts').insert([
    { key: ipKey },
    { key: emailKey },
  ])
  return { allowed: true }
}
