/**
 * x402 Payment Service for USDC on Base
 */
import { createPublicClient, http, parseAbi, formatUnits } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import {
  X402PaymentRequirements,
  X402PaymentProof,
  X402PaymentVerification,
  BASE_USDC_CONFIG,
  BASE_SEPOLIA_USDC_CONFIG,
} from '../types/x402'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Use testnet unless explicitly set to mainnet
// NEXT_PUBLIC_CHAIN_ENV=mainnet for production, otherwise testnet
const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
const usdcConfig = isTestnet ? BASE_SEPOLIA_USDC_CONFIG : BASE_USDC_CONFIG
const chain = isTestnet ? baseSepolia : base

// Create public client for reading blockchain state
const publicClient = createPublicClient({
  chain,
  transport: http(),
})

// ERC20 Transfer event ABI
const erc20Abi = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address owner) view returns (uint256)',
])

// File-based persistence for payment references (survives hot reloads)
const PAYMENT_STORE_FILE = path.join(process.cwd(), '.x402-payments.json')

interface PaymentRefData {
  amount: string
  recipient: string
  expiresAt: number
  resource: string
  metadata?: Record<string, unknown>
}

function loadPaymentRefs(): Map<string, PaymentRefData> {
  try {
    if (fs.existsSync(PAYMENT_STORE_FILE)) {
      const data = fs.readFileSync(PAYMENT_STORE_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      return new Map(Object.entries(parsed))
    }
  } catch (e) {
    console.error('Failed to load payment references:', e)
  }
  return new Map()
}

function savePaymentRefs(refs: Map<string, PaymentRefData>): void {
  try {
    fs.writeFileSync(PAYMENT_STORE_FILE, JSON.stringify(Object.fromEntries(refs), null, 2))
  } catch (e) {
    console.error('Failed to save payment references:', e)
  }
}

// Load initial state from file
const paymentReferences = loadPaymentRefs()

/**
 * Get the payment recipient address from environment
 */
export function getPaymentRecipient(): string {
  // First check for explicit payment address
  const paymentAddress = process.env.PAYMENT_RECIPIENT_ADDRESS
  if (paymentAddress) {
    return paymentAddress
  }

  // Fall back to deriving from private key
  const privateKey = process.env.ETH_RELAYER_PAYMENT_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('PAYMENT_RECIPIENT_ADDRESS or ETH_RELAYER_PAYMENT_PRIVATE_KEY environment variable must be set')
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

  // Store the payment reference
  paymentReferences.set(paymentReference, {
    amount,
    recipient,
    expiresAt,
    resource,
    metadata,
  })
  savePaymentRefs(paymentReferences)

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
 * Verify a payment on-chain
 */
export async function verifyPayment(proof: X402PaymentProof): Promise<X402PaymentVerification> {
  const { txHash, paymentReference, payer } = proof

  // Always reload from file to handle hot reloads in development
  const freshRefs = loadPaymentRefs()
  let paymentData = freshRefs.get(paymentReference)

  // Update in-memory cache if found
  if (paymentData) {
    paymentReferences.set(paymentReference, paymentData)
  }

  // Check if payment reference exists and is valid
  if (!paymentData) {
    return { verified: false, error: 'Invalid payment reference' }
  }

  // Check if expired
  if (Date.now() / 1000 > paymentData.expiresAt) {
    return { verified: false, error: 'Payment reference has expired' }
  }

  try {
    // Wait for transaction receipt with retries (transaction may still be mining)
    let receipt
    let attempts = 0
    const maxAttempts = 10
    const delayMs = 3000

    while (attempts < maxAttempts) {
      try {
        receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        })
        if (receipt) break
      } catch (e: any) {
        // Transaction not found yet, retry
        if (e.name === 'TransactionReceiptNotFoundError' || e.shortMessage?.includes('could not be found')) {
          attempts++
          console.log(`[x402] Transaction not found yet, attempt ${attempts}/${maxAttempts}, waiting...`)
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

    // Look for Transfer events to our recipient
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address.toLowerCase() === usdcConfig.tokenAddress.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
    )

    // Verify transfer details
    for (const log of transferLogs) {
      const from = `0x${log.topics[1]?.slice(26)}`.toLowerCase()
      const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase()
      const value = BigInt(log.data)

      if (
        from === payer.toLowerCase() &&
        to === paymentData.recipient.toLowerCase() &&
        value >= BigInt(paymentData.amount)
      ) {
        // Payment verified - remove from pending
        paymentReferences.delete(paymentReference)
        savePaymentRefs(paymentReferences)

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
 * Get pending payment data by reference
 */
export function getPendingPayment(paymentReference: string) {
  return paymentReferences.get(paymentReference)
}

/**
 * Verify a payment on-chain directly without requiring a stored payment reference
 * Used as fallback when payment reference was lost (e.g., server restart)
 */
export async function verifyPaymentDirect(
  txHash: string,
  payer: string,
  expectedRecipient: string,
  expectedAmount: string
): Promise<X402PaymentVerification> {
  try {
    console.log('[x402] Direct verification for tx:', txHash)

    // Wait for transaction receipt with retries
    let receipt
    let attempts = 0
    const maxAttempts = 10
    const delayMs = 3000

    while (attempts < maxAttempts) {
      try {
        receipt = await publicClient.getTransactionReceipt({
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

    // Look for Transfer events to our recipient
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address.toLowerCase() === usdcConfig.tokenAddress.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
    )

    console.log('[x402] Found', transferLogs.length, 'USDC transfer logs')

    // Verify transfer details
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
 * Check if a payment reference is still valid
 */
export function isPaymentReferenceValid(paymentReference: string): boolean {
  const payment = paymentReferences.get(paymentReference)
  if (!payment) return false
  return Date.now() / 1000 <= payment.expiresAt
}

/**
 * Clean up expired payment references
 */
export function cleanupExpiredReferences(): void {
  const now = Date.now() / 1000
  let changed = false
  for (const [ref, data] of paymentReferences.entries()) {
    if (now > data.expiresAt) {
      paymentReferences.delete(ref)
      changed = true
    }
  }
  if (changed) {
    savePaymentRefs(paymentReferences)
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredReferences, 5 * 60 * 1000)
}
