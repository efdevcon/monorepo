import { getAddress, type Address, type Hex } from 'viem'
import type { MintRow } from './state'

/**
 * The mint queue (ported from the event app's perk). A sponsored sender gets
 * about one operation into each block, so memories are not minted one by one:
 * requests wait in devcon8_memory_mints and `flush` sends them in batches (one
 * contract call, up to MAX_BATCH tokens), at most MAX_IN_FLIGHT batches at a
 * time.
 *
 * There is no worker: every mint request and every status poll runs `flush`,
 * so the people waiting on their memory are what moves the queue. Safe to run
 * concurrently: claiming is atomic in the database, and the contract skips a
 * ticket that already has a token, so a resent batch never mints twice.
 */

// 20 per batch: about 1.5M gas on mainnet, and still under the sponsor's 10M
// per operation at the pricier storage Sepolia has (~340k gas per mint).
export const MAX_BATCH = 20
export const MAX_IN_FLIGHT = 2
export const MAX_ATTEMPTS = 3

export interface QueueStore {
  get(chainId: number, ticketKey: Hex): Promise<MintRow | null>
  /** Inserts a queued row; on conflict returns the existing row unchanged. */
  insert(row: Pick<MintRow, 'chain_id' | 'ticket_key' | 'user_id' | 'recipient' | 'recipient_name'>): Promise<MintRow>
  /** Puts a failed row back in the queue with a fresh recipient. */
  requeueFailed(
    chainId: number,
    ticketKey: Hex,
    recipient: string,
    recipientName: string | null
  ): Promise<MintRow | null>
  sentCallIds(chainId: number): Promise<string[]>
  rowsForCall(chainId: number, callId: string): Promise<MintRow[]>
  /** Atomically moves up to `max` queued rows to "sending" (attempts + 1) and returns them. */
  claimBatch(chainId: number, max: number): Promise<MintRow[]>
  update(chainId: number, ticketKeys: Hex[], patch: Partial<MintRow>): Promise<void>
}

export interface Sponsor {
  /** Sends one batch as a sponsored operation; returns its call id. */
  send(entries: { to: Address; key: Hex }[]): Promise<string>
  status(callId: string): Promise<{ status: 'pending' | 'success' | 'failure'; txHash?: Hex; blockNumber?: number }>
}

export interface FlushDeps {
  store: QueueStore
  sponsor: Sponsor
  chainId: number
  /** The contract's tokenOfTicket for each key (zero when none). */
  tokenOfTicket(keys: Hex[]): Promise<bigint[]>
}

/** Queues a ticket's memory. One row per ticket: asking again returns it, unless it failed, in which case it retries. */
export async function enqueue(
  store: QueueStore,
  req: { chainId: number; ticketKey: Hex; userId: string | null; recipient: Address; recipientName: string | null }
): Promise<MintRow> {
  const existing = await store.get(req.chainId, req.ticketKey)
  if (existing?.status === 'failed') {
    const requeued = await store.requeueFailed(req.chainId, req.ticketKey, req.recipient, req.recipientName)
    if (requeued) return requeued
  }
  if (existing) return existing
  return store.insert({
    chain_id: req.chainId,
    ticket_key: req.ticketKey,
    user_id: req.userId,
    recipient: req.recipient,
    recipient_name: req.recipientName,
  })
}

/** Settles finished batches, then sends the next one if there is room. */
export async function flush(deps: FlushDeps): Promise<void> {
  const { store, sponsor, chainId } = deps

  let inFlight = 0
  for (const callId of await store.sentCallIds(chainId)) {
    const result = await sponsor.status(callId)
    if (result.status === 'pending') {
      inFlight++
      continue
    }
    const rows = await store.rowsForCall(chainId, callId)
    if (!rows.length) continue
    if (result.status === 'failure') {
      await retryOrFail(store, chainId, rows, 'The batch failed onchain')
      continue
    }
    const tokens = await deps.tokenOfTicket(rows.map(r => r.ticket_key))
    await Promise.all(
      rows.map((row, i) =>
        tokens[i] > BigInt(0)
          ? store.update(chainId, [row.ticket_key], {
              status: 'minted',
              token_id: Number(tokens[i]),
              tx_hash: result.txHash ?? null,
              block_number: result.blockNumber ?? null,
              error: null,
            })
          : store.update(chainId, [row.ticket_key], {
              status: 'failed',
              error: 'The batch landed without a token for this ticket',
            })
      )
    )
  }

  if (inFlight >= MAX_IN_FLIGHT) return
  const batch = await store.claimBatch(chainId, MAX_BATCH)
  if (!batch.length) return
  try {
    const callId = await sponsor.send(batch.map(r => ({ to: getAddress(r.recipient), key: r.ticket_key })))
    await store.update(
      chainId,
      batch.map(r => r.ticket_key),
      { status: 'sent', call_id: callId, error: null }
    )
  } catch (err) {
    await retryOrFail(store, chainId, batch, sponsorErrorReason(err))
  }
}

/**
 * Why a send failed, short enough to keep on the row: the bundler's
 * "Details:" line when there is one (e.g. "Sponsorship failed: Policy's max
 * count per spender exceeded."), not the request dump that precedes it.
 */
export function sponsorErrorReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  const details = message.match(/Details: ([^\n]+)/)?.[1]?.trim()
  return (details || message).slice(0, 300)
}

async function retryOrFail(store: QueueStore, chainId: number, rows: MintRow[], error: string) {
  const spent = rows.filter(r => r.attempts >= MAX_ATTEMPTS).map(r => r.ticket_key)
  const retry = rows.filter(r => r.attempts < MAX_ATTEMPTS).map(r => r.ticket_key)
  if (spent.length) await store.update(chainId, spent, { status: 'failed', call_id: null, error })
  if (retry.length) await store.update(chainId, retry, { status: 'queued', call_id: null, error })
}
