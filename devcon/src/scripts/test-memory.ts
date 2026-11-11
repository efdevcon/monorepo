// Verifies the Devcon 8 Memory survey mint logic: claim codes, slot timing,
// what the field shows, and the batching queue (against an in-memory store and
// a fake sponsor, so nothing touches a chain or the database).
// Run: pnpm test-memory

import { getAddress, keccak256, toBytes, type Address, type Hex } from 'viem'
import {
  formatCode,
  memoryFailureMessage,
  msToNextSlot,
  normalizeCode,
  slotNumber,
  slotPhase,
  BEACON_GENESIS,
  CODE_ALPHABET,
} from '../services/memory/memory'
import { deriveCode, hashCode } from '../services/memory/codes'
import { memoryTicketKey, rowToState, type MintRow } from '../services/memory/state'
import {
  flush,
  enqueue,
  MAX_BATCH,
  sponsorErrorReason,
  type QueueStore,
  type Sponsor,
  splitCallId,
} from '../services/memory/queue'

let failed = 0
const check = (label: string, ok: boolean, note = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${note ? ` (${note})` : ''}`)
}

// ---- claim codes
const SECRET = 'test-code-secret'
const c1 = deriveCode(SECRET, 'TICKET-SECRET-1')
check('code is 10 characters of the alphabet', c1.length === 10 && [...c1].every(ch => CODE_ALPHABET.includes(ch)), c1)
check('code is stable for a ticket', c1 === deriveCode(SECRET, 'TICKET-SECRET-1'))
check('codes differ per ticket', c1 !== deriveCode(SECRET, 'TICKET-SECRET-2'))
check('codes differ per secret', c1 !== deriveCode('another-secret', 'TICKET-SECRET-1'))
check('formatted code reads back', normalizeCode(formatCode(c1)) === c1)
check('lowercase and spaces accepted', normalizeCode(` ${formatCode(c1).toLowerCase().replace('-', ' ')} `) === c1)
check('O read as 0, I and L as 1', normalizeCode('O1ILO-0000A') === '01110-0000A'.replace('-', ''))
check('too short refused', normalizeCode('ABCDE') === null)
check('U refused (not in the alphabet)', normalizeCode('UUUUU-UUUUU') === null)
check('hash is SHA-256 hex', /^[0-9a-f]{64}$/.test(hashCode(c1)) && hashCode(c1) !== hashCode(deriveCode(SECRET, 'x')))
const codes = new Set(Array.from({ length: 2000 }, (_, i) => deriveCode(SECRET, `T${i}`)))
check('2000 tickets, 2000 distinct codes', codes.size === 2000)

// ---- ticket key (same formula as the event app's perk)
const k1 = memoryTicketKey('SECRET-ABC')
check('ticket key matches the app formula', k1 === keccak256(toBytes('devcon8-memory:SECRET-ABC')))
check('ticket key is a 32-byte hex', /^0x[0-9a-f]{64}$/.test(k1))
check('ticket key does not contain the secret', !k1.includes('SECRET'))

// ---- slots (12 s, phase-locked to the beacon chain)
const boundary = (BEACON_GENESIS + 12 * 1_000_000) * 1000
check('phase 0 on a slot boundary', slotPhase(boundary) === 0)
check('next slot mid-slot', msToNextSlot(boundary + 9000) === 3000)
check('slot number after the boundary', slotNumber(boundary + 12_000) === 1_000_001)

// ---- what a person reads when a mint fails
check(
  'sponsor refused: paused on our side',
  /paused/i.test(memoryFailureMessage("Sponsorship failed: Policy's max count per spender exceeded."))
)
check(
  'anything else: try again',
  memoryFailureMessage('The batch failed onchain') === "That mint didn't go through. Please try again."
)

// ---- row to field state
const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const base: MintRow = {
  chain_id: 11155111,
  ticket_key: k1,
  user_id: null,
  recipient: WALLET,
  recipient_name: null,
  status: 'queued',
  call_id: null,
  tx_hash: null,
  token_id: null,
  block_number: null,
  attempts: 0,
  error: null,
  created_at: '2026-11-11T04:00:00Z',
  updated_at: '2026-11-11T04:00:00Z',
}
check('no row: none', rowToState(null).state === 'none')
const step = (status: MintRow['status']) => {
  const st = rowToState({ ...base, status })
  return st.state === 'minting' ? st.step : null
}
check('queued and sending: waiting for a batch', step('queued') === 'queued' && step('sending') === 'queued')
check('sent: sent to Ethereum', step('sent') === 'submitted')
const minted = rowToState({ ...base, status: 'minted', token_id: 7, tx_hash: '0xabc', block_number: 21000001 })
check(
  'minted carries the token and block',
  minted.state === 'minted' && minted.tokenId === 7 && minted.blockNumber === 21000001
)
const retrying = rowToState({ ...base, status: 'queued', attempts: 1, error: 'Sponsorship failed: x' })
check('queued again after a failed send: retrying', retrying.state === 'minting' && retrying.retrying === true)

// ---- the reason a sponsored send failed, as saved on the row
const viemLike = new Error(
  'Invalid parameters were provided to the RPC method.\n\nRequest body: {"method":"wallet_prepareCalls"}\n\nDetails: Sponsorship failed: Policy\'s max count per spender exceeded.\nVersion: viem@2.55.19'
)
check(
  "Alchemy's reason is kept, not the request dump",
  sponsorErrorReason(viemLike) === "Sponsorship failed: Policy's max count per spender exceeded."
)

check(
  'a stored call id splits into lane and id, direct ones included',
  JSON.stringify(splitCallId('1:tx:0xabc')) === JSON.stringify({ lane: 1, id: 'tx:0xabc' }) &&
    splitCallId('0xold').lane === null
)
check(
  'an empty minter wallet reads as a pause on our side',
  /paused/.test(memoryFailureMessage('insufficient funds for gas * price + value'))
)

// ---- queue
// The queue's clock: starts 2 s into a slot; tick() moves it on.
let clockMs = (BEACON_GENESIS + 12 * 2_000_000) * 1000 + 2000
const tick = (ms: number) => (clockMs += ms)
const nextSlot = () => tick(12_000)

function memoryStore(): QueueStore & { rows: Map<string, MintRow> } {
  const rows = new Map<string, MintRow>()
  const now = () => new Date(clockMs).toISOString()
  return {
    rows,
    async get(chainId, key) {
      return rows.get(`${chainId}:${key}`) ?? null
    },
    async insert(row) {
      const id = `${row.chain_id}:${row.ticket_key}`
      if (rows.has(id)) return rows.get(id)!
      const full: MintRow = {
        ...row,
        status: 'queued',
        call_id: null,
        tx_hash: null,
        token_id: null,
        block_number: null,
        attempts: 0,
        error: null,
        created_at: now(),
        updated_at: now(),
      }
      rows.set(id, full)
      return full
    },
    async requeueFailed(chainId, key, recipient, recipientName) {
      const r = rows.get(`${chainId}:${key}`)
      if (r && r.status === 'failed')
        Object.assign(r, {
          status: 'queued',
          recipient,
          recipient_name: recipientName,
          attempts: 0,
          error: null,
          updated_at: now(),
        })
      return r ?? null
    },
    async sentCallIds(chainId) {
      return [
        ...new Set([...rows.values()].filter(r => r.chain_id === chainId && r.status === 'sent').map(r => r.call_id!)),
      ]
    },
    async rowsForCall(chainId, callId) {
      return [...rows.values()].filter(r => r.chain_id === chainId && r.call_id === callId && r.status === 'sent')
    },
    async oldestQueuedAt(chainId) {
      const queued = [...rows.values()].filter(r => r.chain_id === chainId && r.status === 'queued')
      return queued.map(r => r.updated_at).sort()[0] ?? null
    },
    async claimBatch(chainId, max) {
      const claimed = [...rows.values()].filter(r => r.chain_id === chainId && r.status === 'queued').slice(0, max)
      for (const r of claimed) Object.assign(r, { status: 'sending', attempts: r.attempts + 1 })
      return claimed.map(r => ({ ...r }))
    },
    async update(chainId, keys, patch) {
      for (const k of keys) {
        const r = rows.get(`${chainId}:${k}`)
        if (r) Object.assign(r, patch, { updated_at: now() })
      }
    },
  }
}

function fakeSponsor() {
  const sent: { id: string; lane: number; entries: { to: Address; key: Hex }[] }[] = []
  const status = new Map<string, { status: 'pending' | 'success' | 'failure'; txHash?: Hex; blockNumber?: number }>()
  let failNextSend = false
  const sponsor: Sponsor = {
    async send(entries, lane) {
      if (failNextSend) {
        failNextSend = false
        throw new Error('bundler said no')
      }
      const id = `call-${sent.length + 1}`
      sent.push({ id, lane, entries })
      status.set(id, { status: 'pending' })
      return id
    },
    async status(id) {
      return status.get(id) ?? { status: 'failure' }
    },
  }
  return { sponsor, sent, status, failNext: () => (failNextSend = true) }
}

async function queueTests() {
  const CHAIN = 11155111
  const store = memoryStore()
  const sp = fakeSponsor()
  const tokens = new Map<Hex, bigint>()
  const deps = {
    store,
    sponsor: sp.sponsor,
    chainId: CHAIN,
    tokenOfTicket: async (keys: Hex[]) => keys.map(k => tokens.get(k) ?? BigInt(0)),
    now: () => clockMs,
  }
  const who = (i: number) => getAddress(`0x${(0x1000 + i).toString(16).padStart(40, '0')}`)
  const key = (i: number) => memoryTicketKey(`T${i}`)
  const ask = (i: number, to = who(i)) =>
    enqueue(store, { chainId: CHAIN, ticketKey: key(i), userId: null, recipient: to, recipientName: null })

  const r1 = await ask(1)
  const r1again = await ask(1, who(9))
  check(
    'one memory per ticket: asking again keeps the first wallet',
    r1.recipient === who(1) && r1again.recipient === who(1)
  )
  check('survey rows carry no user', r1.user_id === null)

  await flush(deps)
  check('a claim waits for the next slot', sp.sent.length === 0)
  tick(5000)
  for (let i = 2; i <= MAX_BATCH + 5; i++) await ask(i)
  await flush(deps)
  check('still the same slot: nothing sent', sp.sent.length === 0)
  nextSlot()
  await flush(deps)
  check(
    `next slot: the slot's claims go together, at most ${MAX_BATCH} per batch`,
    sp.sent.length === 1 && sp.sent[0].entries.length === MAX_BATCH
  )
  check('the first batch uses nonce lane 1', sp.sent[0].lane === 1)
  await flush(deps)
  check(
    'the rest goes on lane 2 while lane 1 is in flight',
    sp.sent.length === 2 && sp.sent[1].entries.length === 5 && sp.sent[1].lane === 2
  )
  check('the stored call id carries its lane', store.rows.get(`${CHAIN}:${key(1)}`)!.call_id === '1:call-1')
  await ask(90)
  nextSlot()
  await flush(deps)
  check('no third batch while both lanes are in flight', sp.sent.length === 2)

  sp.status.set('call-1', { status: 'success', txHash: '0xfeed', blockNumber: 21000042 })
  sp.sent[0].entries.forEach((e, i) => tokens.set(e.key, BigInt(i + 1)))
  await flush(deps)
  const done = store.rows.get(`${CHAIN}:${key(1)}`)!
  check(
    'landed batch marked minted with tx, block and token',
    done.status === 'minted' && done.tx_hash === '0xfeed' && done.token_id === 1
  )

  check('lane 1 is reused once its batch landed', sp.sent.length === 3 && sp.sent[2].lane === 1)

  sp.status.set('call-2', { status: 'failure' })
  await flush(deps)
  const retried = store.rows.get(`${CHAIN}:${key(MAX_BATCH + 1)}`)!
  check('a failed batch waits a slot before going again', retried.status === 'queued')
  nextSlot()
  await flush(deps)
  const resent = store.rows.get(`${CHAIN}:${key(MAX_BATCH + 1)}`)!
  check(
    'then it is re-sent, on the free lane',
    resent.status === 'sent' && resent.attempts === 2 && sp.sent[3].lane === 2
  )

  await store.update(CHAIN, [key(2)], { status: 'failed' })
  const again = await ask(2, who(77))
  check(
    'a failed memory can be asked for again, to a new wallet',
    again.status === 'queued' && again.recipient === who(77)
  )
}

queueTests()
  .catch(e => {
    failed++
    console.error(e)
  })
  .finally(() => {
    console.log(failed ? `\n${failed} FAILED` : '\nall passed')
    process.exit(failed ? 1 : 0)
  })
