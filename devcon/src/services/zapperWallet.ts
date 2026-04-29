/**
 * Fetch the destination wallet's portfolio (native + token balances per chain)
 * from Zapper's public GraphQL API. Used by the admin "Destination Wallet"
 * panel — Zapper handles the multi-chain fan-out + price aggregation in one
 * HTTP call, much faster than 5× RPC eth_calls.
 *
 * Requires `ZAPPER_API_KEY` env var. Returns null when missing or on failure
 * so the admin UI omits the panel rather than the whole page failing.
 */

const ZAPPER_GRAPHQL = 'https://public.zapper.xyz/graphql'

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

/** Zapper sometimes returns chain identifiers as names rather than chainId;
 *  this map covers our supported chains so we can fall back when chainId is missing. */
const NAME_TO_CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  'ethereum mainnet': 1,
  mainnet: 1,
  optimism: 10,
  'optimism mainnet': 10,
  arbitrum: 42161,
  'arbitrum one': 42161,
  'arbitrum mainnet': 42161,
  base: 8453,
  'base mainnet': 8453,
  polygon: 137,
  'polygon mainnet': 137,
  'matic mainnet': 137,
}

// Zapper's current schema. Earlier versions used `[String!]!` for addresses
// and a `portfolioV2.tokenBalances` root; this is the public.zapper.xyz/graphql
// shape as of late 2025. If Zapper changes the schema again, the HTTP 400
// response body (logged below) will tell us what to update.
const QUERY = `
query Balances($addresses: [Address!]!, $networks: [Network!]) {
  portfolio(addresses: $addresses, networks: $networks) {
    tokenBalances {
      address
      network
      token {
        balance
        balanceRaw
        balanceUSD
        baseToken {
          address
          symbol
          name
        }
      }
    }
  }
}
`

/** Zapper uses string Network enum tokens, not numeric chainIds. */
const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: 'ETHEREUM_MAINNET',
  10: 'OPTIMISM_MAINNET',
  137: 'POLYGON_MAINNET',
  8453: 'BASE_MAINNET',
  42161: 'ARBITRUM_MAINNET',
}

const NETWORK_TO_CHAIN_ID: Record<string, number> = Object.fromEntries(
  Object.entries(CHAIN_ID_TO_NETWORK).map(([k, v]) => [v, Number(k)]),
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

interface ZapperTokenBalance {
  address?: string
  network?: string
  token?: {
    balance?: string | number | null
    balanceRaw?: string | null
    balanceUSD?: number | null
    baseToken?: {
      address?: string
      symbol?: string
      name?: string
    }
  }
}

export async function fetchWalletInfoFromZapper(opts: {
  address: string
  chainIds: number[]
  ethPrice: number | null
  polPrice: number | null
  timeoutMs?: number
}): Promise<WalletInfo | null> {
  const apiKey = process.env.ZAPPER_API_KEY
  if (!apiKey) {
    // Not configured — admin panel will omit the wallet block, no error.
    console.warn('[zapper] ZAPPER_API_KEY not set — wallet panel will not appear in admin')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000)

  // Map our numeric chain IDs to Zapper's Network enum tokens.
  const networks = opts.chainIds
    .map(c => CHAIN_ID_TO_NETWORK[c])
    .filter((n): n is string => Boolean(n))

  let body: { data?: { portfolio?: { tokenBalances?: ZapperTokenBalance[] } }; errors?: unknown }
  try {
    const res = await fetch(ZAPPER_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-zapper-api-key': apiKey,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          addresses: [opts.address],
          networks,
        },
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      // Read body for diagnosis — Zapper returns GraphQL errors as 400 with a
      // useful JSON body explaining the schema mismatch.
      const text = await res.text().catch(() => '')
      console.warn(`[zapper] HTTP ${res.status} body=${text.slice(0, 500)}`)
      return null
    }
    body = await res.json()
  } catch (e) {
    console.warn('[zapper] request failed:', (e as Error).message)
    return null
  } finally {
    clearTimeout(timer)
  }

  if (body.errors) {
    console.warn('[zapper] GraphQL errors:', body.errors)
    return null
  }

  const balances = body.data?.portfolio?.tokenBalances ?? []

  // Group by chainId — UI consumes one row per chain.
  const perChain = new Map<number, ChainBalance>()
  for (const tb of balances) {
    const networkEnum = tb.network ?? ''
    const cid = NETWORK_TO_CHAIN_ID[networkEnum]
      // Some older responses use lowercase names; tolerate both.
      ?? NAME_TO_CHAIN_ID[networkEnum.toLowerCase().replace(/_/g, ' ')]
    if (cid == null) continue
    if (!opts.chainIds.includes(cid)) continue

    const entry: ChainBalance = perChain.get(cid) ?? {
      chainId: cid,
      network: networkEnum,
      ethBalance: '0',
      tokens: [],
    }
    perChain.set(cid, entry)

    const tokenAddr = (tb.token?.baseToken?.address ?? '').toLowerCase()
    const symbol = (tb.token?.baseToken?.symbol ?? '').toUpperCase()
    // Prefer human-decimal `balance` since the UI does Number(balance).toLocaleString.
    const balance = tb.token?.balance
    const balanceStr = balance != null ? String(balance) : '0'

    if (tokenAddr === NATIVE_TOKEN_ADDRESS || tokenAddr === '') {
      entry.ethBalance = balanceStr
    } else {
      entry.tokens.push({ symbol, balance: balanceStr, address: tb.token?.baseToken?.address ?? '' })
    }
  }

  // Make sure every requested chain appears in the response — Zapper omits
  // chains where the wallet holds nothing; the UI still wants a "0 ETH" row.
  for (const cid of opts.chainIds) {
    if (!perChain.has(cid)) {
      perChain.set(cid, { chainId: cid, network: '', ethBalance: '0', tokens: [] })
    }
  }

  return {
    address: opts.address,
    balances: [...perChain.values()].sort((a, b) => a.chainId - b.chainId),
    prices: { ETH: opts.ethPrice, POL: opts.polPrice },
  }
}
