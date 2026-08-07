/**
 * Fetch the destination wallet's portfolio (native + token balances per chain)
 * for the admin "Destination Wallet" panel, in one HTTP call for all chains.
 *
 * Originally built on Zapper's public GraphQL API; Zapper shut down, so this
 * now uses the Alchemy Portfolio API (tokens/by-address) instead — same
 * multi-chain fan-out in a single call. The retired Zapper implementation is
 * kept commented at the bottom of this file for reference.
 *
 * Requires `ALCHEMY_APIKEY` (or `NEXT_PUBLIC_ALCHEMY_APIKEY`), the same key
 * the admin incoming-txs endpoint already uses. Returns null when missing or
 * on failure so the admin UI omits the panel rather than the whole page
 * failing.
 */

import { formatUnits } from 'viem'

const CHAIN_ID_TO_ALCHEMY_NETWORK: Record<number, string> = {
  1: 'eth-mainnet',
  10: 'opt-mainnet',
  137: 'polygon-mainnet',
  8453: 'base-mainnet',
  42161: 'arb-mainnet',
}

const ALCHEMY_NETWORK_TO_CHAIN_ID: Record<string, number> = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_ALCHEMY_NETWORK).map(([k, v]) => [v, Number(k)]),
)

export interface ChainBalance {
  chainId: number
  network: string
  ethBalance: string
  tokens: Array<{ symbol: string; balance: string; address: string }>
}

export interface WalletInfo {
  address: string
  balances: ChainBalance[]
  prices: { ETH: number | null; POL: number | null }
}

interface AlchemyTokenRow {
  address?: string
  network?: string
  /** null for the chain's native token (ETH/POL) */
  tokenAddress?: string | null
  /** hex-encoded raw balance */
  tokenBalance?: string
  tokenMetadata?: {
    symbol?: string | null
    decimals?: number | null
    name?: string | null
  }
}

// ── Module-scope TTL cache ────────────────────────────────────────
// The admin orders endpoint refreshes on a 30s tick and multiple admin tabs
// can poll at once; wallet balances don't move that fast. Cache results in
// process memory for 5 min — on a HIT we skip the call entirely.
//
// Cache key is `(address, sorted-chain-ids)` ONLY. Prices intentionally
// excluded: they aren't used in the balance query (only attached to the
// returned object for downstream USD math), and they fluctuate on every
// oracle call — including them in the key was making the cache miss on
// every poll. On a hit we return the cached portfolio but overlay the
// caller's fresh prices so USD totals stay current.
type CacheEntry = { value: WalletInfo | null; expiresAt: number }
const _walletInfoCache: Map<string, CacheEntry> = new Map()
const WALLET_INFO_TTL_MS = 5 * 60_000

export async function fetchWalletInfo(opts: {
  address: string
  chainIds: number[]
  ethPrice: number | null
  polPrice: number | null
  timeoutMs?: number
}): Promise<WalletInfo | null> {
  const apiKey = process.env.ALCHEMY_APIKEY || process.env.NEXT_PUBLIC_ALCHEMY_APIKEY
  if (!apiKey) {
    // Not configured — admin panel will omit the wallet block, no error.
    console.warn('[wallet-info] ALCHEMY_APIKEY not set — wallet panel will not appear in admin')
    return null
  }

  const cacheKey = `${opts.address.toLowerCase()}|${[...opts.chainIds].sort((a, b) => a - b).join(',')}`
  const now = Date.now()
  const cached = _walletInfoCache.get(cacheKey)
  if (cached && now < cached.expiresAt) {
    // Overlay fresh prices on the cached portfolio — the cached structure
    // doesn't depend on price, but the consumer reads `prices` directly.
    if (cached.value) {
      return { ...cached.value, prices: { ETH: opts.ethPrice, POL: opts.polPrice } }
    }
    return cached.value
  }
  const cacheAndReturn = (value: WalletInfo | null): WalletInfo | null => {
    _walletInfoCache.set(cacheKey, { value, expiresAt: Date.now() + WALLET_INFO_TTL_MS })
    return value
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000)

  // Map our numeric chain IDs to Alchemy's network slugs.
  const networks = opts.chainIds
    .map(c => CHAIN_ID_TO_ALCHEMY_NETWORK[c])
    .filter((n): n is string => Boolean(n))

  let body: { data?: { tokens?: AlchemyTokenRow[]; pageKey?: string } }
  try {
    const res = await fetch(`https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ address: opts.address, networks }],
        withMetadata: true,
        withPrices: false,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(`[wallet-info] Alchemy HTTP ${res.status} body=${text.slice(0, 500)}`)
      return cacheAndReturn(null)
    }
    body = await res.json()
  } catch (e) {
    console.warn('[wallet-info] request failed:', (e as Error).message)
    return cacheAndReturn(null)
  } finally {
    clearTimeout(timer)
  }

  const rows = body.data?.tokens ?? []
  if (body.data?.pageKey) {
    // One admin wallet across 4-5 chains fits comfortably in a single page;
    // if this ever paginates, only the first page is shown.
    console.warn('[wallet-info] Alchemy response paginated — showing first page only')
  }

  // Group by chainId — UI consumes one row per chain.
  const perChain = new Map<number, ChainBalance>()
  for (const row of rows) {
    const network = row.network ?? ''
    const cid = ALCHEMY_NETWORK_TO_CHAIN_ID[network]
    if (cid == null) continue
    if (!opts.chainIds.includes(cid)) continue

    const entry: ChainBalance = perChain.get(cid) ?? {
      chainId: cid,
      network,
      ethBalance: '0',
      tokens: [],
    }
    perChain.set(cid, entry)

    let raw: bigint
    try {
      raw = BigInt(row.tokenBalance ?? '0x0')
    } catch {
      continue
    }
    if (raw === BigInt(0)) continue

    if (row.tokenAddress == null) {
      // Native token (ETH / POL), always 18 decimals.
      entry.ethBalance = formatUnits(raw, 18)
    } else {
      // ERC-20. Alchemy returns every token the wallet holds (including spam
      // airdrops); the consumer filters to supported tokens by contract
      // address, so no filtering is needed here.
      const decimals = row.tokenMetadata?.decimals ?? 18
      entry.tokens.push({
        symbol: (row.tokenMetadata?.symbol ?? '').toUpperCase(),
        balance: formatUnits(raw, decimals),
        address: row.tokenAddress,
      })
    }
  }

  // Make sure every requested chain appears in the response — the UI still
  // wants a "0 ETH" row for chains where the wallet holds nothing.
  for (const cid of opts.chainIds) {
    if (!perChain.has(cid)) {
      perChain.set(cid, { chainId: cid, network: '', ethBalance: '0', tokens: [] })
    }
  }

  return cacheAndReturn({
    address: opts.address,
    balances: [...perChain.values()].sort((a, b) => a.chainId - b.chainId),
    prices: { ETH: opts.ethPrice, POL: opts.polPrice },
  })
}

// ============================================================================
// RETIRED: original Zapper-based implementation, kept for reference.
// The Zapper GraphQL API (public.zapper.xyz/graphql) was shut down.
// ============================================================================
//
// /**
//  * Fetch the destination wallet's portfolio (native + token balances per chain)
//  * from Zapper's public GraphQL API. Used by the admin "Destination Wallet"
//  * panel — Zapper handles the multi-chain fan-out + price aggregation in one
//  * HTTP call, much faster than 5× RPC eth_calls.
//  *
//  * Requires `ZAPPER_API_KEY` env var. Returns null when missing or on failure
//  * so the admin UI omits the panel rather than the whole page failing.
//  */
// 
// const ZAPPER_GRAPHQL = 'https://public.zapper.xyz/graphql'
// 
// const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'
// 
// /** Zapper sometimes returns chain identifiers as names rather than chainId;
//  *  this map covers our supported chains so we can fall back when chainId is missing. */
// const NAME_TO_CHAIN_ID: Record<string, number> = {
//   ethereum: 1,
//   'ethereum mainnet': 1,
//   mainnet: 1,
//   optimism: 10,
//   'optimism mainnet': 10,
//   arbitrum: 42161,
//   'arbitrum one': 42161,
//   'arbitrum mainnet': 42161,
//   base: 8453,
//   'base mainnet': 8453,
//   polygon: 137,
//   'polygon mainnet': 137,
//   'matic mainnet': 137,
// }
// 
// // Zapper's current schema. Earlier versions used `[String!]!` for addresses
// // and a `portfolioV2.tokenBalances` root; this is the public.zapper.xyz/graphql
// // shape as of late 2025. If Zapper changes the schema again, the HTTP 400
// // response body (logged below) will tell us what to update.
// const QUERY = `
// query Balances($addresses: [Address!]!, $networks: [Network!]) {
//   portfolio(addresses: $addresses, networks: $networks) {
//     tokenBalances {
//       address
//       network
//       token {
//         balance
//         balanceRaw
//         balanceUSD
//         baseToken {
//           address
//           symbol
//           name
//         }
//       }
//     }
//   }
// }
// `
// 
// /** Zapper uses string Network enum tokens, not numeric chainIds. */
// const CHAIN_ID_TO_NETWORK: Record<number, string> = {
//   1: 'ETHEREUM_MAINNET',
//   10: 'OPTIMISM_MAINNET',
//   137: 'POLYGON_MAINNET',
//   8453: 'BASE_MAINNET',
//   42161: 'ARBITRUM_MAINNET',
// }
// 
// const NETWORK_TO_CHAIN_ID: Record<string, number> = Object.fromEntries(
//   Object.entries(CHAIN_ID_TO_NETWORK).map(([k, v]) => [v, Number(k)]),
// )
// 
// export interface ChainBalance {
//   chainId: number
//   network: string
//   ethBalance: string
//   tokens: Array<{ symbol: string; balance: string; address: string }>
// }
// 
// export interface WalletInfo {
//   address: string
//   balances: ChainBalance[]
//   prices: { ETH: number | null; POL: number | null }
// }
// 
// interface ZapperTokenBalance {
//   address?: string
//   network?: string
//   token?: {
//     balance?: string | number | null
//     balanceRaw?: string | null
//     balanceUSD?: number | null
//     baseToken?: {
//       address?: string
//       symbol?: string
//       name?: string
//     }
//   }
// }
// 
// // ── Module-scope TTL cache ────────────────────────────────────────
// // Zapper's GraphQL is rate-limited (the free tier trips on ~10 req/min)
// // and the admin orders endpoint hits it twice per refresh (destination +
// // relayer wallets). Multiple admin tabs / auto-poll + a 30s tick blows
// // past the limit fast. Cache results in process memory for 5 min — wallet
// // balances don't move that fast, and on a HIT we skip the call entirely.
// //
// // Cache key is `(address, sorted-chain-ids)` ONLY. Prices intentionally
// // excluded: they aren't used in the Zapper query (only attached to the
// // returned object for downstream USD math), and they fluctuate on every
// // oracle call — including them in the key was making the cache miss on
// // every poll. On a hit we return the cached portfolio but overlay the
// // caller's fresh prices so USD totals stay current.
// type CacheEntry = { value: WalletInfo | null; expiresAt: number }
// const _walletInfoCache: Map<string, CacheEntry> = new Map()
// const WALLET_INFO_TTL_MS = 5 * 60_000
// 
// export async function fetchWalletInfoFromZapper(opts: {
//   address: string
//   chainIds: number[]
//   ethPrice: number | null
//   polPrice: number | null
//   timeoutMs?: number
// }): Promise<WalletInfo | null> {
//   const apiKey = process.env.ZAPPER_API_KEY
//   if (!apiKey) {
//     // Not configured — admin panel will omit the wallet block, no error.
//     console.warn('[zapper] ZAPPER_API_KEY not set — wallet panel will not appear in admin')
//     return null
//   }
// 
//   const cacheKey = `${opts.address.toLowerCase()}|${[...opts.chainIds].sort((a, b) => a - b).join(',')}`
//   const now = Date.now()
//   const cached = _walletInfoCache.get(cacheKey)
//   if (cached && now < cached.expiresAt) {
//     // Overlay fresh prices on the cached portfolio — the cached structure
//     // doesn't depend on price, but the consumer reads `prices` directly.
//     if (cached.value) {
//       return { ...cached.value, prices: { ETH: opts.ethPrice, POL: opts.polPrice } }
//     }
//     return cached.value
//   }
//   const cacheAndReturn = (value: WalletInfo | null): WalletInfo | null => {
//     _walletInfoCache.set(cacheKey, { value, expiresAt: Date.now() + WALLET_INFO_TTL_MS })
//     return value
//   }
// 
//   const controller = new AbortController()
//   const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000)
// 
//   // Map our numeric chain IDs to Zapper's Network enum tokens.
//   const networks = opts.chainIds
//     .map(c => CHAIN_ID_TO_NETWORK[c])
//     .filter((n): n is string => Boolean(n))
// 
//   let body: { data?: { portfolio?: { tokenBalances?: ZapperTokenBalance[] } }; errors?: unknown }
//   try {
//     const res = await fetch(ZAPPER_GRAPHQL, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-zapper-api-key': apiKey,
//       },
//       body: JSON.stringify({
//         query: QUERY,
//         variables: {
//           addresses: [opts.address],
//           networks,
//         },
//       }),
//       signal: controller.signal,
//     })
//     if (!res.ok) {
//       // Read body for diagnosis — Zapper returns GraphQL errors as 400 with a
//       // useful JSON body explaining the schema mismatch.
//       const text = await res.text().catch(() => '')
//       console.warn(`[zapper] HTTP ${res.status} body=${text.slice(0, 500)}`)
//       return cacheAndReturn(null)
//     }
//     body = await res.json()
//   } catch (e) {
//     console.warn('[zapper] request failed:', (e as Error).message)
//     return cacheAndReturn(null)
//   } finally {
//     clearTimeout(timer)
//   }
// 
//   if (body.errors) {
//     console.warn('[zapper] GraphQL errors:', body.errors)
//     return cacheAndReturn(null)
//   }
// 
//   const balances = body.data?.portfolio?.tokenBalances ?? []
// 
//   // Group by chainId — UI consumes one row per chain.
//   const perChain = new Map<number, ChainBalance>()
//   for (const tb of balances) {
//     const networkEnum = tb.network ?? ''
//     const cid = NETWORK_TO_CHAIN_ID[networkEnum]
//       // Some older responses use lowercase names; tolerate both.
//       ?? NAME_TO_CHAIN_ID[networkEnum.toLowerCase().replace(/_/g, ' ')]
//     if (cid == null) continue
//     if (!opts.chainIds.includes(cid)) continue
// 
//     const entry: ChainBalance = perChain.get(cid) ?? {
//       chainId: cid,
//       network: networkEnum,
//       ethBalance: '0',
//       tokens: [],
//     }
//     perChain.set(cid, entry)
// 
//     const tokenAddr = (tb.token?.baseToken?.address ?? '').toLowerCase()
//     const symbol = (tb.token?.baseToken?.symbol ?? '').toUpperCase()
//     // Prefer human-decimal `balance` since the UI does Number(balance).toLocaleString.
//     const balance = tb.token?.balance
//     const balanceStr = balance != null ? String(balance) : '0'
// 
//     if (tokenAddr === NATIVE_TOKEN_ADDRESS || tokenAddr === '') {
//       entry.ethBalance = balanceStr
//     } else {
//       entry.tokens.push({ symbol, balance: balanceStr, address: tb.token?.baseToken?.address ?? '' })
//     }
//   }
// 
//   // Make sure every requested chain appears in the response — Zapper omits
//   // chains where the wallet holds nothing; the UI still wants a "0 ETH" row.
//   for (const cid of opts.chainIds) {
//     if (!perChain.has(cid)) {
//       perChain.set(cid, { chainId: cid, network: '', ethBalance: '0', tokens: [] })
//     }
//   }
// 
//   return cacheAndReturn({
//     address: opts.address,
//     balances: [...perChain.values()].sort((a, b) => a.chainId - b.chainId),
//     prices: { ETH: opts.ethPrice, POL: opts.polPrice },
//   })
// }
