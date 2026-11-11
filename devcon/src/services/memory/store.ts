import type { SupabaseClient } from '@supabase/supabase-js'
import type { Hex } from 'viem'
import type { QueueStore } from './queue'
import type { MintRow } from './state'

const TABLE = 'devcon8_memory_mints'

/** The mint queue on Supabase (service-role client; the table has RLS with no policies). */
export function supabaseQueueStore(db: SupabaseClient): QueueStore {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${TABLE} ${what}: ${error.message}`)
  }
  const now = () => new Date().toISOString()

  const store: QueueStore = {
    async get(chainId, ticketKey) {
      const { data, error } = await db
        .from(TABLE)
        .select('*')
        .eq('chain_id', chainId)
        .eq('ticket_key', ticketKey)
        .maybeSingle()
      fail('get', error)
      return (data as MintRow | null) ?? null
    },
    async insert(row) {
      const { data, error } = await db
        .from(TABLE)
        .upsert(row, { onConflict: 'chain_id,ticket_key', ignoreDuplicates: true })
        .select('*')
      fail('insert', error)
      const inserted = (data as MintRow[] | null)?.[0]
      if (inserted) return inserted
      const existing = await store.get(row.chain_id, row.ticket_key as Hex)
      if (!existing) throw new Error(`${TABLE} insert: row vanished`)
      return existing
    },
    async requeueFailed(chainId, ticketKey, recipient, recipientName) {
      const { data, error } = await db
        .from(TABLE)
        .update({
          status: 'queued',
          recipient,
          recipient_name: recipientName,
          attempts: 0,
          error: null,
          call_id: null,
          updated_at: now(),
        })
        .eq('chain_id', chainId)
        .eq('ticket_key', ticketKey)
        .eq('status', 'failed')
        .select('*')
        .maybeSingle()
      fail('requeue', error)
      return (data as MintRow | null) ?? null
    },
    async sentCallIds(chainId) {
      const { data, error } = await db.from(TABLE).select('call_id').eq('chain_id', chainId).eq('status', 'sent')
      fail('sent', error)
      return [
        ...new Set((data ?? []).map((r: { call_id: string | null }) => r.call_id).filter((id): id is string => !!id)),
      ]
    },
    async rowsForCall(chainId, callId) {
      const { data, error } = await db
        .from(TABLE)
        .select('*')
        .eq('chain_id', chainId)
        .eq('call_id', callId)
        .eq('status', 'sent')
      fail('rowsForCall', error)
      return (data as MintRow[] | null) ?? []
    },
    async claimBatch(chainId, max) {
      const { data, error } = await db.rpc('devcon8_memory_claim_batch', { p_chain_id: chainId, p_max: max })
      fail('claim', error)
      return (data as MintRow[] | null) ?? []
    },
    async update(chainId, ticketKeys, patch) {
      if (!ticketKeys.length) return
      const { error } = await db
        .from(TABLE)
        .update({ ...patch, updated_at: now() })
        .eq('chain_id', chainId)
        .in('ticket_key', ticketKeys)
      fail('update', error)
    },
  }
  return store
}
