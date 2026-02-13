/**
 * Payment options API – list payable assets with balances and signing requests
 * POST /api/x402/tickets/payment-options
 * Body: { paymentReference: string, walletAddress: string }
 *
 * Uses Zapper for balances (ZAPPER_API_KEY), Coinbase for ETH price.
 * Returns options from SUPPORTED_ASSETS where user has sufficient balance.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getPendingOrder } from 'services/ticketStore'
import { getPaymentRecipient, usdToUsdcAmount } from 'services/x402'
import { fetchEthPriceUsd } from 'services/ethPrice'
import {
  generateNonce,
  createAuthorizationTypedData,
} from 'services/relayer'
import {
  SUPPORTED_ASSETS_MAINNET,
  SUPPORTED_ASSETS_TESTNET,
  NATIVE_ETH_PLACEHOLDER,
  getGaslessTokenConfig,
  type SupportedAsset,
} from 'types/x402'

const ZAPPER_GRAPHQL = 'https://public.zapper.xyz/graphql'

/** Convert typed data to JSON-serializable form (BigInt -> string) */
function typedDataToJson(typedData: { domain: unknown; types: unknown; primaryType: string; message: Record<string, unknown> }) {
  return {
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: {
      ...typedData.message,
      value: String(typedData.message.value),
      validAfter: String(typedData.message.validAfter),
      validBefore: String(typedData.message.validBefore),
    },
  }
}

/** Zapper token balance node (byToken edge). API often returns network.name only, not chainId. */
interface ZapperTokenNode {
  tokenAddress: string
  symbol: string
  balance?: number
  balanceRaw?: string
  network?: { chainId?: number; name?: string }
  decimals?: number
}

/** Map Zapper network name/slug to chain ID (normalize to lowercase, spaces→hyphens for lookup) */
const NETWORK_NAME_TO_CHAIN_ID: Record<string, number> = {
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
  'base-sepolia': 84532,
  'base sepolia': 84532,
}

export interface PaymentOptionSigningRequest {
  method: 'eth_signTypedData_v4' | 'eth_sendTransaction'
  params: unknown[]
}

export interface PaymentOption {
  asset: string
  symbol: string
  name: string
  chain: string
  chainId: string
  decimals: number
  amount: string
  balance: string
  sufficient: boolean
  signingRequest?: PaymentOptionSigningRequest
  priceUsd?: number
  expiresAt: number
}

interface PaymentOptionsResponse {
  options: PaymentOption[]
}

interface ErrorResponse {
  error: string
  details?: string
}

function parseChainIdFromAsset(asset: string): number {
  const m = asset.match(/^eip155:(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

function parseTokenAddressFromAsset(asset: string): string {
  const m = asset.match(/\/erc20:(0x[a-fA-F0-9]+)$/)
  return m ? m[1].toLowerCase() : ''
}

function isNativeEth(asset: string): boolean {
  return parseTokenAddressFromAsset(asset).toLowerCase() === NATIVE_ETH_PLACEHOLDER.toLowerCase()
}

async function fetchZapperBalances(walletAddress: string, chainIds: number[]): Promise<Map<string, string>> {
  const key = process.env.ZAPPER_API_KEY
  if (!key) return new Map()

  const query = `
    query PaymentOptionsBalances($addresses: [Address!]!, $chainIds: [Int!], $first: Int) {
      portfolioV2(addresses: $addresses, chainIds: $chainIds) {
        tokenBalances {
          byToken(first: $first) {
            edges {
              node {
                tokenAddress
                symbol
                balanceRaw
                network { chainId name }
              }
            }
          }
        }
      }
    }
  `
  const res = await fetch(ZAPPER_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-zapper-api-key': key,
    },
    body: JSON.stringify({
      query,
      variables: {
        addresses: [walletAddress],
        chainIds,
        first: 200,
      },
    }),
  })
  const json = await res.json()
  if (json.errors) return new Map()

  const edges = json?.data?.portfolioV2?.tokenBalances?.byToken?.edges ?? []
  const map = new Map<string, string>()
  for (const edge of edges) {
    const node: ZapperTokenNode = edge.node
    let chainId = node.network?.chainId
    if (chainId == null && node.network?.name) {
      const name = String(node.network.name).toLowerCase().trim()
      chainId = NETWORK_NAME_TO_CHAIN_ID[name] ?? NETWORK_NAME_TO_CHAIN_ID[name.replace(/\s+/g, '-')]
    }
    const addr = (node.tokenAddress || '').toLowerCase()
    const raw = node.balanceRaw ?? '0'
    const symbol = (node.symbol || '').toUpperCase()
    if (chainId != null) {
      map.set(`${chainId}-${addr}`, raw)
      if (symbol) {
        map.set(`symbol:${chainId}:${symbol}`, raw)
      }
      if (addr === '0x0000000000000000000000000000000000000000') {
        map.set(`${chainId}-${NATIVE_ETH_PLACEHOLDER.toLowerCase()}`, raw)
      }
    }
  }
  return map
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentOptionsResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { paymentReference, walletAddress } = req.body ?? {}
    if (!paymentReference || !walletAddress) {
      return res.status(400).json({ error: 'paymentReference and walletAddress are required' })
    }

    const pendingOrder = await getPendingOrder(paymentReference)
    if (!pendingOrder) {
      return res.status(404).json({ error: 'Payment reference not found or expired' })
    }
    if (Date.now() / 1000 > pendingOrder.expiresAt) {
      return res.status(400).json({ error: 'Payment has expired' })
    }

    const totalUsd = parseFloat(pendingOrder.totalUsd)
    const recipient = getPaymentRecipient()
    const expiresAt = pendingOrder.expiresAt
    const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
    const supportedAssets: SupportedAsset[] = isTestnet ? SUPPORTED_ASSETS_TESTNET : SUPPORTED_ASSETS_MAINNET
    const chainIds = [...new Set(supportedAssets.map((a) => parseChainIdFromAsset(a.asset)))]

    const [ethPriceResult, balanceMap] = await Promise.all([
      fetchEthPriceUsd(),
      fetchZapperBalances(walletAddress, chainIds),
    ])

    const usdcAmount = usdToUsdcAmount(totalUsd)
    // If oracles diverge, ethPriceResult is null — ETH options will be skipped
    const ethPriceUsd = ethPriceResult?.price ?? null
    const ethAmountWei = ethPriceUsd != null
      ? BigInt(Math.ceil((totalUsd / ethPriceUsd) * 1e18)).toString()
      : null

    const options: PaymentOption[] = []

    for (const supported of supportedAssets) {
      // Skip ETH options when price oracle is unavailable/divergent
      if (supported.symbol === 'ETH' && ethAmountWei == null) continue

      const chainId = parseChainIdFromAsset(supported.asset)
      const tokenAddr = parseTokenAddressFromAsset(supported.asset)
      const balanceKey1 = `${chainId}-${tokenAddr}`
      const balanceKey2 = isNativeEth(supported.asset)
        ? `${chainId}-0x0000000000000000000000000000000000000000`
        : ''
      const balanceSymbolKey = `symbol:${chainId}:${supported.symbol}`
      const balanceRaw =
        balanceMap.get(balanceKey1) ?? balanceMap.get(balanceSymbolKey) ?? balanceMap.get(balanceKey2) ?? '0'
      const amount = supported.symbol === 'ETH' ? ethAmountWei! : usdcAmount
      const sufficient = BigInt(balanceRaw) >= BigInt(amount)

      const opt: PaymentOption = {
        asset: supported.asset,
        symbol: supported.symbol,
        name: supported.name,
        chain: supported.chain,
        chainId: supported.chainId,
        decimals: supported.decimals,
        amount,
        balance: balanceRaw,
        sufficient,
        expiresAt,
      }

      if (supported.symbol === 'ETH') {
        opt.priceUsd = ethPriceUsd!
      }

      if (sufficient) {
        const gaslessConfig = getGaslessTokenConfig(chainId, tokenAddr)
        if ((supported.symbol === 'USDC' || supported.symbol === 'USDT0') && gaslessConfig) {
          const validAfter = 0
          const validBefore = expiresAt
          const nonce = generateNonce()
          const authorization = {
            from: walletAddress,
            to: recipient,
            value: usdcAmount,
            validAfter,
            validBefore,
            nonce,
          }
          const typedData = await createAuthorizationTypedData(authorization, gaslessConfig)
          opt.signingRequest = {
            method: 'eth_signTypedData_v4',
            params: [walletAddress, JSON.stringify(typedDataToJson(typedData))],
          }
        } else if (supported.symbol === 'ETH') {
          const chainIdHex = `0x${chainId.toString(16)}`
          opt.signingRequest = {
            method: 'eth_sendTransaction',
            params: [
              {
                from: walletAddress,
                to: recipient,
                value: `0x${BigInt(amount).toString(16)}`,
                data: '0x',
                chainId: chainIdHex,
              },
            ],
          }
        }
      }

      options.push(opt)
    }

    // Sort by USD balance descending so highest-value options appear first
    options.sort((a, b) => {
      const usdA = a.symbol === 'ETH' && ethPriceUsd
        ? (Number(a.balance) / 1e18) * ethPriceUsd
        : Number(a.balance) / 10 ** a.decimals
      const usdB = b.symbol === 'ETH' && ethPriceUsd
        ? (Number(b.balance) / 1e18) * ethPriceUsd
        : Number(b.balance) / 10 ** b.decimals
      return usdB - usdA
    })

    return res.status(200).json({ options })
  } catch (e) {
    return res.status(500).json({
      error: 'Failed to load payment options',
      details: e instanceof Error ? e.message : undefined,
    })
  }
}
