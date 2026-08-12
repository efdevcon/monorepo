/**
 * Screen payment activity against the OFAC SDN sanctioned-address list.
 *
 * Two modes:
 *
 * 1. INBOUND (default): pulls ALL inbound transfers (native + ERC-20, so
 *    gasless-relayer USDC flows are covered: for token transfers the `from`
 *    is the actual payer, not the relayer) to the given address(es) on
 *    Ethereum, Optimism, Arbitrum and Base via Alchemy, then screens every
 *    unique sender.
 *
 * 2. SPONSORED (--sponsored): for gas-sponsoring relayer EOAs. Inbound
 *    scanning misses these entirely: the relayer BROADCASTS txs in which
 *    other people's tokens move (transferWithAuthorization). This mode
 *    enumerates every tx broadcast by the address (via Blockscout), fetches
 *    the receipts, and screens every party (sender AND recipient) of every
 *    token transfer inside them.
 *
 * The OFAC data is the union of every EVM ticker list from
 * github.com/0xB10C/ofac-sanctioned-digital-currency-addresses (regenerated
 * daily from the US Treasury SDN list). This screens DIRECT parties only —
 * it does not trace where their funds came from. Exit code 1 on any match
 * so it can gate CI/cron jobs if ever needed.
 *
 * Usage:
 *   pnpm ofac:scan                          # inbound payments to TICKETING.payment.recipientAddress
 *   pnpm ofac:scan 0xabc... 0xdef...        # inbound to the given addresses instead
 *   pnpm ofac:scan --sponsored              # parties of txs broadcast by the devconnect relayers
 *   pnpm ofac:scan --sponsored 0xrelayer... # same, for the given relayer addresses
 *
 * Known addresses (all clean as of 2026-08-12, both modes):
 *   0x403A3A81abA974dEb4faF20514ae34FAf9268E28  Devcon 8 production payment recipient (default inbound target)
 *   0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD  devcon dev/test recipient + devconnect-app PAYMENT_RELAYER
 *   0xf1e26ea8b039F4f6440494D448bd817A55137F9c  devconnect-app SEND_RELAYER
 */
import 'dotenv/config'
import { TICKETING } from '../config/ticketing'

// OFAC tags each SDN address with the asset ticker it was reported under, but
// an EVM address is the same keypair on every chain — so union every ticker
// list that contains 0x addresses, not just ETH (the ETH file alone misses
// addresses listed only under ARB/USDC/USDT/BSC/ETC).
const OFAC_EVM_TICKERS = ['ETH', 'ARB', 'USDC', 'USDT', 'BSC', 'ETC']
const ofacListUrl = (ticker: string) =>
  `https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_${ticker}.txt`

// Default --sponsored targets: the devconnect-app gas relayers (see
// devconnect-app/src/config/config.ts).
const DEVCONNECT_RELAYERS = [
  '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD', // PAYMENT_RELAYER
  '0xf1e26ea8b039F4f6440494D448bd817A55137F9c', // SEND_RELAYER
]

const ALCHEMY_KEY = process.env.ALCHEMY_APIKEY || process.env.NEXT_PUBLIC_ALCHEMY_APIKEY
const CHAINS: Record<string, { rpc: string; blockscout: string }> = {
  Ethereum: { rpc: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, blockscout: 'https://eth.blockscout.com' },
  Optimism: { rpc: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, blockscout: 'https://optimism.blockscout.com' },
  Arbitrum: { rpc: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, blockscout: 'https://arbitrum.blockscout.com' },
  Base: { rpc: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, blockscout: 'https://base.blockscout.com' },
}

// keccak256('Transfer(address,address,uint256)')
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface AlchemyTransfer {
  from?: string
  asset?: string | null
  metadata?: { blockTimestamp?: string }
}

interface SenderInfo {
  chains: Set<string>
  count: number
  assets: Set<string>
  firstSeen: string
}

async function fetchInboundTransfers(rpcUrl: string, chain: string, toAddress: string): Promise<AlchemyTransfer[]> {
  const out: AlchemyTransfer[] = []
  let pageKey: string | undefined
  do {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            toAddress,
            category: ['external', 'erc20'],
            withMetadata: true,
            maxCount: '0x3e8',
            ...(pageKey ? { pageKey } : {}),
          },
        ],
      }),
    })
    const json = (await res.json()) as {
      error?: { message?: string }
      result?: { transfers?: AlchemyTransfer[]; pageKey?: string }
    }
    if (json.error) throw new Error(`${chain}: ${json.error.message || 'alchemy error'}`)
    out.push(...(json.result?.transfers ?? []))
    pageKey = json.result?.pageKey
  } while (pageKey)
  return out
}

/** All mined txs SENT BY `addr` on a chain, via Blockscout's etherscan-compatible API (keyless). */
async function fetchBroadcastTxHashes(blockscout: string, chain: string, addr: string): Promise<string[]> {
  const url = `${blockscout}/api?module=account&action=txlist&address=${addr}&startblock=0&endblock=latest&page=1&offset=10000&sort=asc`
  const json = (await (await fetch(url)).json()) as { status: string; message?: string; result?: { hash: string; from?: string }[] }
  if (json.message === 'No transactions found') return []
  if (json.status !== '1' || !Array.isArray(json.result)) throw new Error(`${chain} blockscout txlist: ${json.message}`)
  if (json.result.length === 10000) console.warn(`  WARNING ${chain}: txlist hit the 10k cap — results may be incomplete`)
  return json.result.filter(t => t.from?.toLowerCase() === addr).map(t => t.hash)
}

/** Every party (from + to) of every ERC-20 Transfer event inside the given txs. */
async function fetchTransferParties(rpcUrl: string, hashes: string[]): Promise<{ parties: Set<string>; transfers: number }> {
  const parties = new Set<string>()
  let transfers = 0
  for (let i = 0; i < hashes.length; i += 100) {
    const batch = hashes.slice(i, i + 100).map((h, k) => ({ jsonrpc: '2.0', id: k, method: 'eth_getTransactionReceipt', params: [h] }))
    const res = (await (
      await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch) })
    ).json()) as { result?: { logs?: { topics?: string[] }[] } }[]
    for (const item of res) {
      for (const log of item.result?.logs ?? []) {
        if (log.topics?.[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue
        transfers++
        parties.add('0x' + log.topics[1].slice(26).toLowerCase())
        parties.add('0x' + log.topics[2].slice(26).toLowerCase())
      }
    }
    await sleep(150)
  }
  return { parties, transfers }
}

async function fetchOfacList(): Promise<Set<string>> {
  const all = new Set<string>()
  for (const ticker of OFAC_EVM_TICKERS) {
    const res = await fetch(ofacListUrl(ticker))
    if (!res.ok) throw new Error(`OFAC ${ticker} list fetch failed: HTTP ${res.status}`)
    const text = await res.text()
    for (const line of text.split('\n')) {
      const addr = line.trim().toLowerCase()
      if (addr.startsWith('0x')) all.add(addr)
    }
  }
  return all
}

function reportHits(hits: string[]): boolean {
  if (hits.length === 0) {
    console.log('  ✓ No match against the OFAC SDN list')
    return false
  }
  console.log('  ✗ OFAC MATCHES FOUND:')
  for (const hit of hits) console.log(`    ${hit}`)
  return true
}

async function scanInbound(address: string, ofac: Set<string>): Promise<boolean> {
  console.log(`\n=== Inbound transfers to ${address} ===`)
  const senders = new Map<string, SenderInfo>()
  let total = 0
  for (const [chain, { rpc }] of Object.entries(CHAINS)) {
    const transfers = await fetchInboundTransfers(rpc, chain, address)
    for (const t of transfers) {
      const from = t.from?.toLowerCase()
      if (!from || from === address) continue
      const entry = senders.get(from) ?? { chains: new Set(), count: 0, assets: new Set(), firstSeen: '' }
      entry.chains.add(chain)
      entry.count++
      entry.assets.add(t.asset ?? '?')
      const ts = t.metadata?.blockTimestamp ?? ''
      if (!entry.firstSeen || (ts && ts < entry.firstSeen)) entry.firstSeen = ts
      senders.set(from, entry)
      total++
    }
    console.log(`  ${chain}: ${transfers.length} inbound transfers`)
  }
  console.log(`  Total: ${total} transfers from ${senders.size} unique senders`)
  return reportHits([...senders.keys()].filter(a => ofac.has(a)))
}

async function scanSponsored(address: string, ofac: Set<string>): Promise<boolean> {
  console.log(`\n=== Parties of txs broadcast by ${address} ===`)
  const allParties = new Set<string>()
  for (const [chain, { rpc, blockscout }] of Object.entries(CHAINS)) {
    const hashes = await fetchBroadcastTxHashes(blockscout, chain, address)
    if (hashes.length === 0) {
      console.log(`  ${chain}: 0 broadcast txs`)
      continue
    }
    const { parties, transfers } = await fetchTransferParties(rpc, hashes)
    parties.delete(address)
    for (const p of parties) allParties.add(p)
    console.log(`  ${chain}: ${hashes.length} broadcast txs, ${transfers} token transfers, ${parties.size} parties`)
    await sleep(300)
  }
  console.log(`  Total unique transfer parties (senders + recipients): ${allParties.size}`)
  return reportHits([...allParties].filter(a => ofac.has(a)))
}

async function main() {
  if (!ALCHEMY_KEY) throw new Error('ALCHEMY_APIKEY (or NEXT_PUBLIC_ALCHEMY_APIKEY) not set')

  const args = process.argv.slice(2)
  const sponsored = args.includes('--sponsored')
  const positional = args.filter(a => a !== '--sponsored')
  const defaults = sponsored ? DEVCONNECT_RELAYERS : [TICKETING.payment.recipientAddress]
  const addresses = (positional.length > 0 ? positional : defaults).map(a => a.toLowerCase())
  for (const a of addresses) {
    if (!/^0x[0-9a-f]{40}$/.test(a)) throw new Error(`Not an address: ${a}`)
  }

  const ofac = await fetchOfacList()
  console.log(`OFAC EVM list (union of ${OFAC_EVM_TICKERS.join('/')}): ${ofac.size} addresses`)
  console.log(`Mode: ${sponsored ? 'sponsored (parties of relayer-broadcast txs)' : 'inbound (senders of received transfers)'}`)

  let anyHit = false
  for (const address of addresses) {
    const hit = sponsored ? await scanSponsored(address, ofac) : await scanInbound(address, ofac)
    anyHit = anyHit || hit
  }

  if (anyHit) {
    console.log('\nDO NOT refund or fulfill matched orders — freeze and escalate (refunding a sanctioned address is itself a violation).')
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
