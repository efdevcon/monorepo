import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getAddress, type Hex } from 'viem'
import { verifyProof } from 'services/builder/proof'
import { memoryChainConfig, memorySponsor, tokenOfTicketReader } from 'services/memory/chain'
import { findCode, markClaimed } from 'services/memory/codes'
import { enqueue, flush } from 'services/memory/queue'
import { rowToState } from 'services/memory/state'
import { supabaseQueueStore } from 'services/memory/store'

/**
 * Devcon 8 Memory for the survey's `[memory]` field: POST { action: "status" | "mint", code, walletProof? }.
 *
 * - status: the memory of the ticket this code belongs to (none, minting,
 *   minted, failed).
 * - mint: queues the memory for the wallet in `walletProof` (the signed proof
 *   from the wallet connector, /api/builder/wallet/verify), never an address
 *   from the client. One memory per ticket: a code whose memory is on its way
 *   or minted answers with it as it is.
 *
 * The code (emailed to checked-in attendees, services/memory/codes.ts) is the
 * whole claim: no account. Both actions run the batch queue, so the people
 * waiting on their memory are what sends the batches.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').end()
  res.setHeader('Cache-Control', 'no-store')
  const fail = (status: number, error: string) => res.status(status).json({ success: false, error })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const cfg = memoryChainConfig()
  if (!cfg || !supabaseUrl || !serviceKey) return fail(503, "Memories aren't open yet")

  const action = req.body?.action === 'mint' ? 'mint' : req.body?.action === 'status' ? 'status' : null
  const rawCode = typeof req.body?.code === 'string' ? req.body.code : ''
  if (!action || !rawCode) return fail(400, 'action and code are required')

  try {
    const db = createClient(supabaseUrl, serviceKey)
    const codeRow = await findCode(db, rawCode)
    if (!codeRow) return fail(404, "That code doesn't match. Check the email we sent you.")

    const ticketKey = codeRow.ticket_key as Hex
    const store = supabaseQueueStore(db)
    const deps = { store, sponsor: memorySponsor(cfg), chainId: cfg.chainId, tokenOfTicket: tokenOfTicketReader(cfg) }
    const runQueue = async () => {
      try {
        await flush(deps)
      } catch (err) {
        // The request still answers; the next poll retries the queue.
        console.error('[api/memory] flush:', err)
      }
    }

    let row = await store.get(cfg.chainId, ticketKey)
    if (action === 'status') {
      if (row && row.status !== 'minted' && row.status !== 'failed') {
        await runQueue()
        row = await store.get(cfg.chainId, ticketKey)
      }
      return res.status(200).json({ success: true, data: rowToState(row) })
    }

    // Already on its way or minted: one memory per ticket.
    if (row && row.status !== 'failed') return res.status(200).json({ success: true, data: rowToState(row) })

    const proof = typeof req.body?.walletProof === 'string' ? req.body.walletProof : ''
    const wallet = proof ? verifyProof(proof, 'wallet') : null
    // The card offers Mint only with a proof, so this is an expired one (1 hour).
    if (!wallet)
      return fail(401, 'Your wallet signature has expired. Disconnect your wallet above, connect it again, then mint.')

    await enqueue(store, {
      chainId: cfg.chainId,
      ticketKey,
      userId: null,
      recipient: getAddress(wallet),
      recipientName: null,
    })
    if (!codeRow.claimed_at) await markClaimed(db, codeRow.code_hash)
    await runQueue()
    return res.status(200).json({ success: true, data: rowToState(await store.get(cfg.chainId, ticketKey)) })
  } catch (err) {
    console.error('[api/memory] error:', err)
    return fail(500, 'Something went wrong, please try again')
  }
}
