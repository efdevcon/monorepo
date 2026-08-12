/**
 * OFAC + scam-list screening for EVM addresses. Server-side only.
 *
 * Used before sending money OUT (admin refunds): an OFAC hit is a hard stop
 * (refunding a sanctioned address is itself a sanctions violation — freeze
 * the order and escalate), a ScamSniffer hit warrants an explicit admin
 * confirmation (the payer's wallet may be compromised and the refund would
 * land with the attacker).
 *
 * OFAC source: github.com/0xB10C/ofac-sanctioned-digital-currency-addresses,
 * regenerated daily from the US Treasury SDN list. OFAC tags addresses with
 * the asset ticker they were reported under, but an EVM address is the same
 * keypair on every chain, so we union every ticker list containing 0x
 * addresses (mirrors `src/scripts/ofac-scan.ts` and the pretix-eth plugin's
 * `pretix_eth/sanctions.py`).
 *
 * Caching: each list is cached in module memory for 24h; on fetch failure the
 * last-good copy keeps serving (marked stale-but-available). Only when a list
 * has NEVER loaded does the result report it unavailable — callers decide how
 * to fail (the admin refund UI proceeds with a console warning).
 */

const OFAC_EVM_TICKERS = ['ETH', 'ARB', 'USDC', 'USDT', 'BSC', 'ETC'] as const
const ofacListUrl = (ticker: string) =>
  `https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_${ticker}.txt`
const SCAM_LIST_URL = 'https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json'

const FRESH_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 10_000

interface ListCache {
  addresses: Set<string> | null
  fetchedAt: number
}

const ofacCache: ListCache = { addresses: null, fetchedAt: 0 }
const scamCache: ListCache = { addresses: null, fetchedAt: 0 }

export interface AddressScreenResult {
  address: string
  /** On the OFAC SDN list — never send funds to or accept funds from it. */
  ofac: boolean
  /** On the ScamSniffer community blacklist — warn, require explicit override. */
  scam: boolean
  /** False only if the corresponding list has never been loaded this process. */
  ofacAvailable: boolean
  scamAvailable: boolean
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res
}

async function refreshOfac(): Promise<void> {
  const addresses = new Set<string>()
  for (const ticker of OFAC_EVM_TICKERS) {
    const text = await (await fetchWithTimeout(ofacListUrl(ticker))).text()
    for (const line of text.split('\n')) {
      const addr = line.trim().toLowerCase()
      if (addr.startsWith('0x') && addr.length === 42) addresses.add(addr)
    }
  }
  if (addresses.size === 0) throw new Error('OFAC fetch returned no addresses')
  ofacCache.addresses = addresses
  ofacCache.fetchedAt = Date.now()
}

async function refreshScam(): Promise<void> {
  const json = (await (await fetchWithTimeout(SCAM_LIST_URL)).json()) as unknown[]
  const addresses = new Set<string>()
  for (const entry of json) {
    const addr = String(entry).trim().toLowerCase()
    if (addr.startsWith('0x')) addresses.add(addr)
  }
  scamCache.addresses = addresses
  scamCache.fetchedAt = Date.now()
}

async function ensureFresh(cache: ListCache, refresh: () => Promise<void>, label: string): Promise<void> {
  if (cache.addresses && Date.now() - cache.fetchedAt < FRESH_MS) return
  try {
    await refresh()
  } catch (err) {
    // Keep serving the last-good copy; only "never loaded" is reported
    // unavailable to the caller.
    console.warn(
      `address-screen: ${label} list refresh failed (${(err as Error).message}) — ` +
        (cache.addresses ? 'serving stale copy' : 'list unavailable')
    )
    cache.fetchedAt = Date.now() // don't hammer the source on every call
  }
}

export async function screenAddress(address: string): Promise<AddressScreenResult> {
  const addr = address.trim().toLowerCase()
  await Promise.all([ensureFresh(ofacCache, refreshOfac, 'OFAC'), ensureFresh(scamCache, refreshScam, 'ScamSniffer')])
  return {
    address: addr,
    ofac: ofacCache.addresses?.has(addr) ?? false,
    scam: scamCache.addresses?.has(addr) ?? false,
    ofacAvailable: ofacCache.addresses != null,
    scamAvailable: scamCache.addresses != null,
  }
}
