import { getAddress, keccak256, toBytes, type Hex } from 'viem'
import type { MemoryState } from './memory'

/** A row of devcon8_memory_mints (devcon-api/src/supabase/migrations). */
export interface MintRow {
  chain_id: number
  ticket_key: Hex
  /** The event app's account that asked; null for a survey claim (the code is the claim). */
  user_id: string | null
  recipient: string
  recipient_name: string | null
  status: 'queued' | 'sending' | 'sent' | 'minted' | 'failed'
  call_id: string | null
  tx_hash: string | null
  token_id: number | null
  block_number: number | null
  attempts: number
  error: string | null
  created_at: string
  updated_at: string
}

/**
 * The opaque key the contract and the queue know a ticket by. Ticket secrets
 * are random and long, so the hash reveals nothing and cannot be enumerated.
 * Same formula as the event app's perk.
 */
export function memoryTicketKey(ticketSecret: string): Hex {
  return keccak256(toBytes(`devcon8-memory:${ticketSecret}`))
}

/** What the field needs from a row; never internal batch state. */
export function rowToState(row: MintRow | null): MemoryState {
  if (!row) return { state: 'none' }
  const recipient = getAddress(row.recipient)
  // A send failed before (its error stays until it lands), or this is not the first attempt.
  const retrying = row.error != null || row.attempts > 1
  switch (row.status) {
    case 'minted':
      return {
        state: 'minted',
        recipient,
        tokenId: Number(row.token_id),
        txHash: (row.tx_hash as Hex | null) ?? null,
        blockNumber: row.block_number == null ? null : Number(row.block_number),
        chainId: row.chain_id,
      }
    case 'failed':
      return { state: 'failed', recipient, reason: row.error ?? null }
    case 'sent':
      return { state: 'minting', step: 'submitted', retrying, recipient }
    default:
      return { state: 'minting', step: 'queued', retrying, recipient }
  }
}
