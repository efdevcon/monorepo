/**
 * Relayer Service for Gas-Sponsored USDC Transfers (Multi-Chain)
 *
 * Uses EIP-3009 (ReceiveWithAuthorization) to enable gasless USDC transfers
 * on all supported chains (Ethereum, Optimism, Arbitrum, Base).
 * The user signs an authorization, and the relayer executes the transaction,
 * paying the gas fees from ETH_RELAYER_PAYMENT_PRIVATE_KEY.
 *
 * The same private key (and thus the same address) is used on all chains.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Hex,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia, mainnet, optimism, arbitrum } from 'viem/chains'
import crypto from 'crypto'
import {
  EIP3009Authorization,
  BASE_USDC_CONFIG,
  BASE_SEPOLIA_USDC_CONFIG,
  getUsdcConfigForChainId,
} from '../types/x402'

// Default chain (backward compat: Base mainnet or Base Sepolia)
const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
const defaultChainId = isTestnet ? baseSepolia.id : base.id

// Map chain IDs to viem Chain objects
const CHAIN_ID_TO_CHAIN: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [arbitrum.id]: arbitrum,
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
}

// USDC contract ABI for EIP-3009 functions
const usdcAbi = parseAbi([
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function transfer(address to, uint256 value) external returns (bool)',
  'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)',
  'function name() external view returns (string)',
  'function version() external view returns (string)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)',
])

// ── Per-chain client caches ──

const publicClientCache = new Map<number, ReturnType<typeof createPublicClient>>()

function getPublicClientForChain(chainId: number): ReturnType<typeof createPublicClient> {
  let client = publicClientCache.get(chainId)
  if (client) return client
  const viemChain = CHAIN_ID_TO_CHAIN[chainId]
  if (!viemChain) throw new Error(`Unsupported chain ID for relayer: ${chainId}`)
  client = createPublicClient({ chain: viemChain, transport: http() })
  publicClientCache.set(chainId, client)
  return client
}

function getRelayerAccount() {
  const privateKey = process.env.ETH_RELAYER_PAYMENT_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('ETH_RELAYER_PAYMENT_PRIVATE_KEY environment variable must be set')
  }
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  return privateKeyToAccount(formattedKey as Hex)
}

function getWalletClientForChain(chainId: number) {
  const account = getRelayerAccount()
  const viemChain = CHAIN_ID_TO_CHAIN[chainId]
  if (!viemChain) throw new Error(`Unsupported chain ID for relayer: ${chainId}`)
  const walletClient = createWalletClient({
    account,
    chain: viemChain,
    transport: http(),
  })
  return { account, walletClient }
}

/**
 * Get the relayer wallet for a specific chain.
 * Same private key on all chains — only the chain context differs.
 */
export function getRelayerWallet(chainId?: number) {
  return getWalletClientForChain(chainId ?? defaultChainId)
}

/**
 * Get relayer address (same on all chains — derived from the single private key)
 */
export function getRelayerAddress(): string {
  const account = getRelayerAccount()
  return account.address
}

/**
 * Generate a unique nonce for EIP-3009 authorization
 */
export function generateNonce(): string {
  return `0x${crypto.randomBytes(32).toString('hex')}`
}

// ── Per-chain EIP-712 domain cache ──

type UsdcDomain = { name: string; version: string; chainId: number; verifyingContract: `0x${string}` }
const domainCache = new Map<number, UsdcDomain>()

/**
 * Get the USDC EIP-712 domain for a specific chain.
 * Fetches name() and version() on-chain to guarantee the domain matches the contract's DOMAIN_SEPARATOR.
 */
export async function getUsdcDomain(chainId?: number): Promise<UsdcDomain> {
  const cid = chainId ?? defaultChainId
  const cached = domainCache.get(cid)
  if (cached) return cached

  const config = getUsdcConfigForChainId(cid)
  if (!config) throw new Error(`No USDC config for chain ${cid}`)

  const client = getPublicClientForChain(cid)
  const contractAddr = config.tokenAddress as `0x${string}`

  const [name, version] = await Promise.all([
    client.readContract({ address: contractAddr, abi: usdcAbi, functionName: 'name' }),
    client.readContract({ address: contractAddr, abi: usdcAbi, functionName: 'version' }),
  ])

  const domain: UsdcDomain = {
    name: name as string,
    version: version as string,
    chainId: cid,
    verifyingContract: contractAddr,
  }
  domainCache.set(cid, domain)
  console.log(`[Relayer] USDC EIP-712 domain fetched for chain ${cid}:`, domain)
  return domain
}

/**
 * Get EIP-712 types for ReceiveWithAuthorization (EIP-3009).
 * Same on all chains.
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
export async function createAuthorizationTypedData(authorization: EIP3009Authorization, chainId?: number) {
  const domain = await getUsdcDomain(chainId)
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
export async function isNonceUsed(authorizer: string, nonce: string, chainId?: number): Promise<boolean> {
  const cid = chainId ?? defaultChainId
  const config = getUsdcConfigForChainId(cid)
  if (!config) return false
  try {
    const client = getPublicClientForChain(cid)
    const result = await client.readContract({
      address: config.tokenAddress as `0x${string}`,
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
 * @param chainId        Chain to execute on (defaults to Base)
 */
export async function executeTransferWithAuthorization(
  authorization: EIP3009Authorization,
  signature: { v: number; r: string; s: string },
  finalRecipient?: string,
  chainId?: number
): Promise<{ txHash: string; receiveTxHash?: string }> {
  const cid = chainId ?? defaultChainId
  const config = getUsdcConfigForChainId(cid)
  if (!config) throw new Error(`No USDC config for chain ${cid}`)

  const { walletClient, account } = getWalletClientForChain(cid)
  const client = getPublicClientForChain(cid)
  const tokenAddress = config.tokenAddress as `0x${string}`

  console.log(`[Relayer] Executing receiveWithAuthorization on chain ${cid} (${CHAIN_ID_TO_CHAIN[cid]?.name ?? 'unknown'})`)

  // Check if nonce has already been used
  const nonceUsed = await isNonceUsed(authorization.from, authorization.nonce, cid)
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
      address: tokenAddress,
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
    const receipt = await client.waitForTransactionReceipt({ hash })
    console.log('[Relayer] receiveWithAuthorization confirmed, status:', receipt.status)

    if (receipt.status !== 'success') {
      throw new Error(`receiveWithAuthorization reverted (tx: ${hash})`)
    }

    // Step 2: Forward USDC to the final recipient if different from relayer
    if (finalRecipient && finalRecipient.toLowerCase() !== account.address.toLowerCase()) {
      console.log('[Relayer] Forwarding USDC to final recipient:', finalRecipient)
      try {
        // Fetch fresh nonce including pending txs
        const nonce = await client.getTransactionCount({ address: account.address, blockTag: 'pending' })
        const forwardHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: usdcAbi,
          functionName: 'transfer',
          args: [finalRecipient as `0x${string}`, BigInt(authorization.value)],
          nonce,
        })
        console.log('[Relayer] Forward tx:', forwardHash)
        return { txHash: forwardHash, receiveTxHash: hash }
      } catch (forwardError) {
        // Log but don't fail — the user's payment was received successfully.
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
 * Get the default USDC configuration (Base mainnet or Base Sepolia).
 * For chain-specific config, use getUsdcConfigForChainId() from types/x402.
 */
export function getUsdcConfig() {
  return isTestnet ? BASE_SEPOLIA_USDC_CONFIG : BASE_USDC_CONFIG
}

/**
 * Check relayer ETH balance for gas on a specific chain
 */
export async function getRelayerBalance(chainId?: number): Promise<bigint> {
  const cid = chainId ?? defaultChainId
  const client = getPublicClientForChain(cid)
  const account = getRelayerAccount()
  return client.getBalance({ address: account.address })
}
