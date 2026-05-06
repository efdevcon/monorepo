// Tx-hash recovery for wallets that broadcast a transaction successfully but
// fail to return the hash through the WalletConnect (or injected) session.
// Binance Wallet on macOS is a confirmed offender; Bitget Mobile and TokenPocket
// have shown the same shape intermittently. Without recovery the dapp hangs in
// "Confirm in wallet…" forever even though the user's funds already left.

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || ''

const ALCHEMY_URLS: Record<number, string> = {
  1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  10: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  42161: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  8453: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  137: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  84532: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
}

export function alchemyUrlFor(chainId: number): string | undefined {
  if (!ALCHEMY_KEY) return undefined
  return ALCHEMY_URLS[chainId]
}

export interface DiscoverParams {
  chainId: number
  payer: string
  to: string
  value: bigint
  // Block number captured immediately before the wallet was asked to send.
  // Used as the lower bound for the Alchemy scan; without it we'd risk
  // matching an unrelated historical tx with the same shape.
  fromBlock?: bigint
}

// Look for an outgoing native-ETH transfer from `payer` to `to` with exactly
// `value` wei, mined since `fromBlock`. Returns the tx hash if found, else
// undefined. Errors are swallowed — caller is expected to retry on a cadence.
export async function discoverNativeTransfer(params: DiscoverParams): Promise<`0x${string}` | undefined> {
  const url = alchemyUrlFor(params.chainId)
  if (!url) return undefined

  const fromBlockHex = params.fromBlock !== undefined ? `0x${params.fromBlock.toString(16)}` : '0x0'

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        fromAddress: params.payer,
        toAddress: params.to,
        fromBlock: fromBlockHex,
        category: ['external'],
        excludeZeroValue: false,
        withMetadata: false,
        // 1k is more than enough — we expect 0 or 1 matching tx in the window.
        maxCount: '0x3e8',
      },
    ],
  }

  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return undefined
  }
  if (!resp.ok) return undefined

  let json: any
  try {
    json = await resp.json()
  } catch {
    return undefined
  }

  const transfers: any[] = json?.result?.transfers ?? []
  for (const t of transfers) {
    // rawContract.value is the wei amount as a hex string for native transfers.
    const wei = t?.rawContract?.value ? BigInt(t.rawContract.value) : undefined
    if (wei !== undefined && wei === params.value && typeof t.hash === 'string') {
      return t.hash as `0x${string}`
    }
  }
  return undefined
}
