/**
 * Relayer Service for Gas-Sponsored USDC Transfers
 *
 * Uses EIP-3009 (ReceiveWithAuthorization) to enable gasless USDC transfers.
 * The user signs an authorization, and the relayer executes the transaction,
 * paying the gas fees from ETH_RELAYER_PAYMENT_PRIVATE_KEY.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia } from 'viem/chains'
import crypto from 'crypto'
import {
  EIP3009Authorization,
  BASE_USDC_CONFIG,
  BASE_SEPOLIA_USDC_CONFIG,
} from '../types/x402'

// Use testnet unless explicitly set to mainnet
const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
const usdcConfig = isTestnet ? BASE_SEPOLIA_USDC_CONFIG : BASE_USDC_CONFIG
const chain = isTestnet ? baseSepolia : base

// USDC contract ABI for EIP-3009 functions
// Note: We use transferWithAuthorization (not receiveWithAuthorization) because
// receiveWithAuthorization requires the caller to be the payee, but we want any relayer to execute
const usdcAbi = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)',
  'function name() external view returns (string)',
  'function version() external view returns (string)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)',
])

// Create public client for reading blockchain state
const publicClient = createPublicClient({
  chain,
  transport: http(),
})

/**
 * Get the relayer wallet from private key
 */
export function getRelayerWallet() {
  const privateKey = process.env.ETH_RELAYER_PAYMENT_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('ETH_RELAYER_PAYMENT_PRIVATE_KEY environment variable must be set')
  }

  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  const account = privateKeyToAccount(formattedKey as Hex)

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  })

  return { account, walletClient }
}

/**
 * Get relayer address
 */
export function getRelayerAddress(): string {
  const { account } = getRelayerWallet()
  return account.address
}

/**
 * Generate a unique nonce for EIP-3009 authorization
 */
export function generateNonce(): string {
  return `0x${crypto.randomBytes(32).toString('hex')}`
}

/**
 * Get EIP-712 domain for USDC contract
 */
export function getUsdcDomain() {
  return {
    name: 'USD Coin', // USDC contract name
    version: '2', // USDC version
    chainId: usdcConfig.chainId,
    verifyingContract: usdcConfig.tokenAddress as `0x${string}`,
  }
}

/**
 * Get EIP-712 types for TransferWithAuthorization
 * Note: We use TransferWithAuthorization instead of ReceiveWithAuthorization
 * because the latter requires the caller to be the payee
 */
export function getTransferWithAuthorizationTypes() {
  return {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  }
}

/**
 * Create typed data for EIP-712 signing
 */
export function createAuthorizationTypedData(authorization: EIP3009Authorization) {
  return {
    domain: getUsdcDomain(),
    types: getTransferWithAuthorizationTypes(),
    primaryType: 'TransferWithAuthorization' as const,
    message: {
      from: authorization.from as `0x${string}`,
      to: authorization.to as `0x${string}`,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`,
    },
  }
}

/**
 * Check if an authorization nonce has been used
 */
export async function isNonceUsed(authorizer: string, nonce: string): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: usdcConfig.tokenAddress as `0x${string}`,
      abi: usdcAbi,
      functionName: 'authorizationState',
      args: [authorizer as `0x${string}`, nonce as `0x${string}`],
    })
    return result as boolean
  } catch (error) {
    console.error('Error checking nonce:', error)
    return false
  }
}

/**
 * Execute a TransferWithAuthorization transaction
 * The relayer pays gas fees and the USDC is transferred from `from` to `to`
 * Note: We use transferWithAuthorization (not receiveWithAuthorization) because
 * the latter requires the caller to be the payee
 */
export async function executeTransferWithAuthorization(
  authorization: EIP3009Authorization,
  signature: { v: number; r: string; s: string }
): Promise<{ txHash: string }> {
  const { walletClient, account } = getRelayerWallet()

  console.log('[Relayer] Executing transferWithAuthorization on', chain.name, '(', chain.id, ')')

  // Check if nonce has already been used
  const nonceUsed = await isNonceUsed(authorization.from, authorization.nonce)
  if (nonceUsed) {
    throw new Error('Authorization nonce has already been used')
  }

  try {
    // Execute the transaction
    const hash = await walletClient.writeContract({
      address: usdcConfig.tokenAddress as `0x${string}`,
      abi: usdcAbi,
      functionName: 'transferWithAuthorization',
      args: [
        authorization.from as `0x${string}`,
        authorization.to as `0x${string}`,
        BigInt(authorization.value),
        BigInt(authorization.validAfter),
        BigInt(authorization.validBefore),
        authorization.nonce as `0x${string}`,
        signature.v,
        signature.r as `0x${string}`,
        signature.s as `0x${string}`,
      ],
    })

    console.log('[Relayer] Transaction submitted:', hash)
    return { txHash: hash }
  } catch (error) {
    console.error('[Relayer] Error executing authorization:', error)
    throw error
  }
}

/**
 * Get the current USDC configuration
 */
export function getUsdcConfig() {
  return usdcConfig
}

/**
 * Check relayer ETH balance for gas
 */
export async function getRelayerBalance(): Promise<bigint> {
  const { account } = getRelayerWallet()
  const balance = await publicClient.getBalance({ address: account.address })
  return balance
}
