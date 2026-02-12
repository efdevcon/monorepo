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
// We use receiveWithAuthorization (requires msg.sender == to) so wallets can
// decode the signing request and show a human-readable "Authorize USDC transfer" UI.
// The relayer address is set as `to`, then forwards USDC to the final recipient.
const usdcAbi = parseAbi([
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function transfer(address to, uint256 value) external returns (bool)',
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
 * Cached EIP-712 domain fetched from the USDC contract.
 * Fetching name() and version() on-chain guarantees the domain matches
 * the contract's DOMAIN_SEPARATOR so wallets can decode the signing request.
 */
let cachedDomain: { name: string; version: string; chainId: number; verifyingContract: `0x${string}` } | null = null

export async function getUsdcDomain() {
  if (cachedDomain) return cachedDomain

  const contractAddr = usdcConfig.tokenAddress as `0x${string}`
  const [name, version] = await Promise.all([
    publicClient.readContract({ address: contractAddr, abi: usdcAbi, functionName: 'name' }),
    publicClient.readContract({ address: contractAddr, abi: usdcAbi, functionName: 'version' }),
  ])

  cachedDomain = {
    name: name as string,
    version: version as string,
    chainId: usdcConfig.chainId,
    verifyingContract: contractAddr,
  }
  console.log('[Relayer] USDC EIP-712 domain fetched:', cachedDomain)
  return cachedDomain
}

/**
 * Get EIP-712 types for ReceiveWithAuthorization (EIP-3009)
 */
export function getReceiveWithAuthorizationTypes() {
  return {
    ReceiveWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  }
}

/** @deprecated Use getReceiveWithAuthorizationTypes instead */
export const getTransferWithAuthorizationTypes = getReceiveWithAuthorizationTypes

/**
 * Create typed data for EIP-712 signing (ReceiveWithAuthorization)
 */
export async function createAuthorizationTypedData(authorization: EIP3009Authorization) {
  const domain = await getUsdcDomain()
  return {
    domain,
    types: getReceiveWithAuthorizationTypes(),
    primaryType: 'ReceiveWithAuthorization' as const,
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
 * Execute a ReceiveWithAuthorization transaction, then forward USDC to the final recipient.
 *
 * receiveWithAuthorization requires msg.sender == to, so the relayer address is used as `to`
 * in the user's signature. After receiving, the relayer transfers USDC to `finalRecipient`.
 *
 * @param authorization  The signed EIP-3009 authorization (to = relayer address)
 * @param signature      The EIP-712 signature split into v, r, s
 * @param finalRecipient The actual payment recipient to forward USDC to (if different from relayer)
 */
export async function executeTransferWithAuthorization(
  authorization: EIP3009Authorization,
  signature: { v: number; r: string; s: string },
  finalRecipient?: string
): Promise<{ txHash: string; receiveTxHash?: string }> {
  const { walletClient, account } = getRelayerWallet()

  console.log('[Relayer] Executing receiveWithAuthorization on', chain.name, '(', chain.id, ')')

  // Check if nonce has already been used
  const nonceUsed = await isNonceUsed(authorization.from, authorization.nonce)
  if (nonceUsed) {
    throw new Error('Authorization nonce has already been used')
  }

  // Verify the authorization's `to` matches the relayer (required by receiveWithAuthorization)
  if (authorization.to.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`Authorization 'to' must be the relayer address (${account.address})`)
  }

  try {
    // Step 1: Receive USDC from the user via receiveWithAuthorization
    const hash = await walletClient.writeContract({
      address: usdcConfig.tokenAddress as `0x${string}`,
      abi: usdcAbi,
      functionName: 'receiveWithAuthorization',
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

    console.log('[Relayer] receiveWithAuthorization tx:', hash)

    // Wait for the receive tx to be mined before forwarding (avoids nonce collision)
    console.log('[Relayer] Waiting for receiveWithAuthorization confirmation...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('[Relayer] receiveWithAuthorization confirmed, status:', receipt.status)

    if (receipt.status !== 'success') {
      throw new Error(`receiveWithAuthorization reverted (tx: ${hash})`)
    }

    // Step 2: Forward USDC to the final recipient if different from relayer
    if (finalRecipient && finalRecipient.toLowerCase() !== account.address.toLowerCase()) {
      console.log('[Relayer] Forwarding USDC to final recipient:', finalRecipient)
      try {
        // Fetch fresh nonce including pending txs — the wallet client cache is stale after waitForTransactionReceipt
        // Using 'pending' blockTag avoids "replacement transaction underpriced" when prior forward attempts are still in mempool
        const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' })
        const forwardHash = await walletClient.writeContract({
          address: usdcConfig.tokenAddress as `0x${string}`,
          abi: usdcAbi,
          functionName: 'transfer',
          args: [finalRecipient as `0x${string}`, BigInt(authorization.value)],
          nonce,
        })
        console.log('[Relayer] Forward tx:', forwardHash)
        return { txHash: forwardHash, receiveTxHash: hash }
      } catch (forwardError) {
        // Log but don't fail — the user's payment was received successfully.
        // The forward can be retried manually.
        console.error('[Relayer] Forward to recipient failed (funds held by relayer):', forwardError)
        return { txHash: hash }
      }
    }

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
