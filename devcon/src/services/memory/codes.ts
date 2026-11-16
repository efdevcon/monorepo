import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode } from './memory'

/**
 * Claim codes (server only): one per checked-in Devcon 8 ticket, emailed to
 * its attendee (src/scripts/send-memory-codes.ts). A code is derived from the
 * ticket secret with MEMORY_CODE_SECRET, so the email script can rebuild it on
 * any run; only its SHA-256 is stored (devcon8_memory_codes), and the route
 * looks codes up by that hash, so it never needs the secret. No names or email
 * addresses are stored: the code and the ticket as one-way hashes, and the
 * address the email went to only as a keyed hash (emailHash).
 */

const TABLE = 'devcon8_memory_codes'

export interface CodeRow {
  code_hash: string
  ticket_key: string
  created_at: string
  emailed_at: string | null
  claimed_at: string | null
  email_hmac: string | null
}

/** The ticket's code: HMAC-SHA256 of its secret, 50 bits as 10 Crockford base32 characters. */
export function deriveCode(codeSecret: string, ticketSecret: string): string {
  const mac = crypto.createHmac('sha256', codeSecret).update(`devcon8-memory-code:${ticketSecret}`).digest()
  let bits = BigInt(`0x${mac.subarray(0, 8).toString('hex')}`)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code = CODE_ALPHABET[Number(bits & BigInt(31))] + code
    bits >>= BigInt(5)
  }
  return code
}

/**
 * Keyed hash of the address a ticket's memory email went to (trimmed, lowercased), stored with its codes so a
 * later email sign-in can find that person's tickets without the table holding any address. The key
 * (MEMORY_EMAIL_SECRET) stays outside the database: the table alone can't be matched against guessed addresses,
 * and deleting the key makes the column meaningless.
 */
export function emailHash(emailSecret: string, email: string): string {
  return crypto.createHmac('sha256', emailSecret).update(`devcon-memory-email:${email.trim().toLowerCase()}`).digest('hex')
}

/** SHA-256 of the canonical code, as stored. */
export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/** The code's row, or null when the code is malformed or unknown. */
export async function findCode(db: SupabaseClient, raw: string): Promise<CodeRow | null> {
  const code = normalizeCode(raw)
  if (!code) return null
  const { data, error } = await db.from(TABLE).select('*').eq('code_hash', hashCode(code)).maybeSingle()
  if (error) throw new Error(`${TABLE} get: ${error.message}`)
  return (data as CodeRow | null) ?? null
}

/** Stamps the first mint request with this code. */
export async function markClaimed(db: SupabaseClient, codeHash: string): Promise<void> {
  const { error } = await db
    .from(TABLE)
    .update({ claimed_at: new Date().toISOString() })
    .eq('code_hash', codeHash)
    .is('claimed_at', null)
  if (error) throw new Error(`${TABLE} claim: ${error.message}`)
}
