/**
 * x402 Payment Service for USDC on Base (and multi-chain verification)
 */
import { createPublicClient, parseAbi, formatUnits, type Chain } from 'viem'
import { base, baseSepolia, mainnet, optimism, arbitrum, polygon } from 'viem/chains'
import { getTransport } from './rpc'
import {
  X402PaymentRequirements,
  X402PaymentProof,
  X402PaymentVerification,
  BASE_USDC_CONFIG,
  BASE_SEPOLIA_USDC_CONFIG,
  SUPPORTED_ASSETS_MAINNET,
  SUPPORTED_ASSETS_TESTNET,
  X402_VERSION,
  getAllGaslessConfigs,
  getUsdcConfigForChainId,
  type PaymentRequired,
  type ResourceInfo,
  type PaymentRequirements as PaymentRequirementsSpec,
  type PaymentPayload,
  type SettleResponse,
} from '../types/x402'
import { getTokenDomain } from './relayer'
import crypto from 'crypto'
import { TICKETING, isTestnet } from 'config/ticketing'
const usdcConfig = isTestnet ? BASE_SEPOLIA_USDC_CONFIG : BASE_USDC_CONFIG
const chain = isTestnet ? baseSepolia : base

const CHAIN_ID_TO_CHAIN: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [arbitrum.id]: arbitrum,
  [base.id]: base,
  [polygon.id]: polygon,
  [baseSepolia.id]: baseSepolia,
}

const supportedAssets = isTestnet ? SUPPORTED_ASSETS_TESTNET : SUPPORTED_ASSETS_MAINNET
function getUsdcAddressForChainId(chainId: number): string | null {
  const asset = supportedAssets.find(
    (a) => a.symbol === 'USDC' && parseInt(a.chainId.replace(/^eip155:/, ''), 10) === chainId
  )
  if (!asset) return null
  const m = asset.asset.match(/\/erc20:(0x[a-fA-F0-9]+)$/)
  return m ? m[1] : null
}

/**
 * Resolve the token address for verification.
 * If an explicit tokenAddress is given, use it; otherwise fall back to USDC for the chain.
 */
function resolveTokenAddress(chainId: number | undefined, tokenAddress?: string): string | null {
  if (tokenAddress) return tokenAddress
  if (chainId != null) return getUsdcAddressForChainId(chainId)
  return usdcConfig.tokenAddress
}

// Create public client for reading blockchain state (default chain)
const publicClient = createPublicClient({
  chain,
  transport: getTransport(chain.id),
})

function getPublicClientForChainId(chainId: number) {
  const c = CHAIN_ID_TO_CHAIN[chainId]
  if (!c) return null
  return createPublicClient({ chain: c, transport: getTransport(chainId) })
}

// ERC20 Transfer event ABI
const erc20Abi = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address owner) view returns (uint256)',
])

/**
 * Get the payment recipient address from environment
 */
export function getPaymentRecipient(): string {
  // Use address from ticketing config
  if (TICKETING.payment.recipientAddress) {
    return TICKETING.payment.recipientAddress
  }

  // Fall back to deriving from private key
  const privateKey = process.env.ETH_RELAYER_PAYMENT_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('payment.recipientAddress not set in ticketing config and ETH_RELAYER_PAYMENT_PRIVATE_KEY is missing')
  }

  // Derive address from private key
  const { privateKeyToAccount } = require('viem/accounts')
  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`)
  return account.address
}

/**
 * Generate a unique payment reference
 */
export function generatePaymentReference(): string {
  return `x402_${crypto.randomBytes(16).toString('hex')}`
}

/**
 * Convert USD amount to USDC smallest unit (6 decimals)
 */
export function usdToUsdcAmount(usdAmount: string | number): string {
  const amount = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount
  return Math.round(amount * 10 ** usdcConfig.tokenDecimals).toString()
}

/**
 * Convert USDC smallest unit to USD
 */
export function usdcAmountToUsd(usdcAmount: string): string {
  return formatUnits(BigInt(usdcAmount), usdcConfig.tokenDecimals)
}

/**
 * Create payment requirements for a resource
 */
export function createPaymentRequirements(
  resource: string,
  usdAmount: string | number,
  expiresInSeconds = 3600, // 1 hour default
  metadata?: Record<string, unknown>
): X402PaymentRequirements {
  const recipient = getPaymentRecipient()
  const paymentReference = generatePaymentReference()
  const amount = usdToUsdcAmount(usdAmount)
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds

  // Payment references are persisted via Supabase ticketStore (storePendingOrder)
  // No file-based storage needed

  return {
    resource,
    payment: {
      network: usdcConfig.network,
      chainId: usdcConfig.chainId,
      tokenAddress: usdcConfig.tokenAddress,
      tokenSymbol: usdcConfig.tokenSymbol,
      tokenDecimals: usdcConfig.tokenDecimals,
      amount,
      amountFormatted: `${usdcAmountToUsd(amount)} USDC`,
      recipient,
      paymentReference,
      expiresAt,
    },
    metadata,
  }
}

/**
 * Build x402 PaymentRequired payload from our payment requirements.
 * Uses @x402/core types for SDK compatibility (HTTPFacilitatorClient, etc.).
 * Includes paymentReference in extra for facilitator verify/settle.
 */
export async function buildX402PaymentRequiredSpec(
  requirements: X402PaymentRequirements,
  options?: { error?: string; resourceDescription?: string; resourceUrl?: string }
): Promise<PaymentRequired> {
  const p = requirements.payment
  const now = Math.floor(Date.now() / 1000)
  const maxTimeoutSeconds = Math.max(0, p.expiresAt - now)
  const resourceUrl = options?.resourceUrl ?? requirements.resource
  const resource: ResourceInfo = {
    url: resourceUrl.startsWith('http') ? resourceUrl : resourceUrl,
    description: options?.resourceDescription ?? '',
    mimeType: 'application/json',
  }
  // payTo = payment recipient address (transferWithAuthorization sends directly to recipient)
  const recipientAddr = getPaymentRecipient()

  // Build one accepts[] entry per supported gasless token (USDC + USDT0)
  const configs = getAllGaslessConfigs()
  const accepts: PaymentRequirementsSpec[] = []
  for (const config of configs) {
    const domain = getTokenDomain(config)
    accepts.push({
      scheme: 'exact',
      network: `eip155:${config.chainId}`,
      amount: p.amount,
      asset: config.tokenAddress,
      payTo: recipientAddr,
      maxTimeoutSeconds,
      extra: {
        name: domain.name,
        version: domain.version,
        paymentReference: p.paymentReference,
      },
    })
  }

  return {
    x402Version: X402_VERSION,
    ...(options?.error && { error: options.error }),
    resource,
    accepts,
    extensions: {},
  }
}

/**
 * Verify a payment on-chain.
 * All payment data (amount, recipient) comes from the Supabase ticketStore,
 * not from a local file store.
 */
export async function verifyPayment(proof: X402PaymentProof): Promise<X402PaymentVerification> {
  const { txHash, payer, chainId: proofChainId } = proof

  const recipient = getPaymentRecipient()
  const client = proofChainId != null ? getPublicClientForChainId(proofChainId) : publicClient
  const tokenAddress = resolveTokenAddress(proofChainId, proof.tokenAddress)
  if (!client) {
    return { verified: false, error: `Unsupported chain ID for verification: ${proofChainId}` }
  }
  if (proofChainId != null && !tokenAddress) {
    return { verified: false, error: `No token config for chain ID: ${proofChainId}` }
  }

  try {
    // Wait for transaction receipt with retries (transaction may still be mining)
    // L2s (Base, Optimism, Arbitrum, Polygon) confirm in 1-2s; mainnet needs ~12s per block
    const isL2 = proofChainId != null && [10, 42161, 8453, 84532, 137].includes(proofChainId)
    const maxAttempts = isL2 ? 10 : 20
    const delayMs = isL2 ? 3000 : 6000

    let receipt
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        receipt = await client.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        })
        if (receipt) break
      } catch (e: any) {
        // Transaction not found yet, retry
        if (e.name === 'TransactionReceiptNotFoundError' || e.shortMessage?.includes('could not be found')) {
          attempts++
          console.log(`[x402] Transaction not found yet (chain ${proofChainId ?? chain.id}), attempt ${attempts}/${maxAttempts}, waiting...`)
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
          continue
        }
        throw e
      }
    }

    if (!receipt) {
      return { verified: false, error: 'Transaction not found after waiting. Please try again in a few moments.' }
    }

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed' }
    }

    // Look for Transfer events to our recipient (USDC on the tx chain)
    console.log('[x402 verify] Checking receipt logs. tokenAddress:', tokenAddress, 'total logs:', receipt.logs.length)
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address.toLowerCase() === tokenAddress!.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
    )

    // Verify transfer details (transferWithAuthorization sends directly from payer to recipient)
    console.log('[x402 verify] Transfer logs found:', transferLogs.length,
      '| expected recipient:', recipient,
      '| expected amount:', proof.expectedAmount,
      '| payer:', payer)
    for (const log of transferLogs) {
      const from = `0x${log.topics[1]?.slice(26)}`.toLowerCase()
      const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase()
      const value = BigInt(log.data)
      console.log('[x402 verify] Transfer event: from=', from, 'to=', to, 'value=', value.toString())

      if (
        from === payer.toLowerCase() &&
        to === recipient.toLowerCase() &&
        (!proof.expectedAmount || value >= BigInt(proof.expectedAmount))
      ) {
        return {
          verified: true,
          blockNumber: Number(receipt.blockNumber),
          confirmedAt: Math.floor(Date.now() / 1000),
        }
      }
    }

    return { verified: false, error: 'No matching transfer found in transaction' }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return { verified: false, error: `Verification error: ${(error as Error).message}` }
  }
}

/**
 * Verify a payment on-chain directly without requiring a stored payment reference
 * Used as fallback when payment reference was lost (e.g., server restart)
 */
export async function verifyPaymentDirect(
  txHash: string,
  payer: string,
  expectedRecipient: string,
  expectedAmount: string,
  chainId?: number,
  tokenAddr?: string
): Promise<X402PaymentVerification> {
  const client = chainId != null ? getPublicClientForChainId(chainId) : publicClient
  const tokenAddress = resolveTokenAddress(chainId, tokenAddr)
  if (!client) {
    return { verified: false, error: `Unsupported chain ID for verification: ${chainId}` }
  }
  if (chainId != null && !tokenAddress) {
    return { verified: false, error: `No USDC config for chain ID: ${chainId}` }
  }

  try {
    console.log('[x402] Direct verification for tx:', txHash, chainId != null ? `(chain ${chainId})` : '')

    // Wait for transaction receipt with retries
    // L2s confirm fast; mainnet needs more time
    const isL2 = chainId != null && [10, 42161, 8453, 84532, 137].includes(chainId)
    const maxAttempts = isL2 ? 10 : 20
    const delayMs = isL2 ? 3000 : 6000

    let receipt
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        receipt = await client.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        })
        if (receipt) break
      } catch (e: any) {
        if (e.name === 'TransactionReceiptNotFoundError' || e.shortMessage?.includes('could not be found')) {
          attempts++
          console.log(`[x402] Direct: Transaction not found yet, attempt ${attempts}/${maxAttempts}, waiting...`)
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
          continue
        }
        throw e
      }
    }

    if (!receipt) {
      return { verified: false, error: 'Transaction not found after waiting. Please try again in a few moments.' }
    }

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed' }
    }

    // Look for Transfer events to our recipient (USDC on the tx chain)
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address.toLowerCase() === tokenAddress!.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
    )

    console.log('[x402] Found', transferLogs.length, 'USDC transfer logs')

    // Verify transfer details (transferWithAuthorization sends directly from payer to recipient)
    for (const log of transferLogs) {
      const from = `0x${log.topics[1]?.slice(26)}`.toLowerCase()
      const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase()
      const value = BigInt(log.data)

      if (
        from === payer.toLowerCase() &&
        to === expectedRecipient.toLowerCase() &&
        value >= BigInt(expectedAmount)
      ) {
        return {
          verified: true,
          blockNumber: Number(receipt.blockNumber),
          confirmedAt: Math.floor(Date.now() / 1000),
        }
      }
    }

    return { verified: false, error: 'No matching transfer found in transaction' }
  } catch (error) {
    console.error('[x402] Error in direct verification:', error)
    return { verified: false, error: `Verification error: ${(error as Error).message}` }
  }
}

/**
 * Verify a native ETH payment (value transfer) on-chain
 */
export async function verifyPaymentNativeEth(
  txHash: string,
  payer: string,
  expectedRecipient: string,
  expectedAmountWei: string,
  chainId: number
): Promise<X402PaymentVerification> {
  const client = getPublicClientForChainId(chainId)
  if (!client) {
    return { verified: false, error: `Unsupported chain ID for verification: ${chainId}` }
  }

  try {
    console.log('[x402] Native ETH verification for tx:', txHash, '(chain', chainId + ')')

    let receipt
    let attempts = 0
    const maxAttempts = 10
    const delayMs = 3000

    while (attempts < maxAttempts) {
      try {
        receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
        if (receipt) break
      } catch (e: any) {
        if (e.name === 'TransactionReceiptNotFoundError' || e.shortMessage?.includes('could not be found')) {
          attempts++
          console.log(`[x402] Native ETH: Transaction not found yet, attempt ${attempts}/${maxAttempts}, waiting...`)
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
          continue
        }
        throw e
      }
    }

    if (!receipt) {
      return { verified: false, error: 'Transaction not found after waiting. Please try again in a few moments.' }
    }

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed' }
    }

    const tx = await client.getTransaction({ hash: txHash as `0x${string}` })
    if (!tx) {
      return { verified: false, error: 'Transaction not found' }
    }

    const recipientLower = expectedRecipient.toLowerCase()
    const toMatch = tx.to && tx.to.toLowerCase() === recipientLower
    if (!toMatch || tx.from?.toLowerCase() !== payer.toLowerCase()) {
      return { verified: false, error: 'Transaction from/to does not match payment' }
    }
    if (tx.value < BigInt(expectedAmountWei)) {
      return { verified: false, error: 'Transaction value is less than required amount' }
    }

    return {
      verified: true,
      blockNumber: Number(receipt.blockNumber),
      confirmedAt: Math.floor(Date.now() / 1000),
    }
  } catch (error) {
    console.error('Error verifying native ETH payment:', error)
    return { verified: false, error: `Verification error: ${(error as Error).message}` }
  }
}

// ============== x402 v2 header encoding/decoding ==============

/**
 * Encode a PaymentRequired object for the PAYMENT-REQUIRED header (base64 JSON, x402 v2 spec)
 */
export function encodePaymentRequiredHeader(pr: PaymentRequired): string {
  return Buffer.from(JSON.stringify(pr)).toString('base64')
}

/**
 * Decode a PAYMENT-SIGNATURE header value (base64 JSON → PaymentPayload, x402 v2 spec)
 */
export function decodePaymentSignatureHeader(header: string): PaymentPayload {
  return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'))
}

/**
 * Encode a SettleResponse for the PAYMENT-RESPONSE header (base64 JSON, x402 v2 spec)
 */
export function encodeSettlementResponseHeader(sr: SettleResponse): string {
  return Buffer.from(JSON.stringify(sr)).toString('base64')
}
