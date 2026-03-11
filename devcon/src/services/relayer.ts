/**
 * Relayer Service for Gas-Sponsored USDC Transfers (Multi-Chain)
 *
 * Uses EIP-3009 (TransferWithAuthorization) to enable gasless USDC transfers
 * on all supported chains (Ethereum, Optimism, Arbitrum, Base).
 * The user signs an authorization with `to` = PAYMENT_RECIPIENT_ADDRESS,
 * and the relayer executes the transaction on-chain, paying gas fees.
 *
 * The same private key (and thus the same address) is used on all chains.
 */
import {
  createPublicClient,
  createWalletClient,
  decodeAbiParameters,
  parseAbi,
  parseGwei,
  type Hex,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia, mainnet, optimism, arbitrum, polygon } from 'viem/chains'
import { getTransport } from './rpc'
import crypto from 'crypto'
import {
  EIP3009Authorization,
  BASE_USDC_CONFIG,
  BASE_SEPOLIA_USDC_CONFIG,
  getUsdcConfigForChainId,
  type GaslessTokenConfig,
} from '../types/x402'
import { isTestnet } from 'config/ticketing'

// Default chain (backward compat: Base mainnet or Base Sepolia)
const defaultChainId = isTestnet ? baseSepolia.id : base.id

// Map chain IDs to viem Chain objects
const CHAIN_ID_TO_CHAIN: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [arbitrum.id]: arbitrum,
  [base.id]: base,
  [polygon.id]: polygon,
  [baseSepolia.id]: baseSepolia,
}

// USDC contract ABI for EIP-3009 functions
const usdcAbi = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature) external',
  'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)',
  'function name() external view returns (string)',
  'function version() external view returns (string)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)',
])

// ── Gas protection ──

export class RelayerGasError extends Error {
  code: 'GAS_PRICE_TOO_HIGH' | 'INSUFFICIENT_RELAYER_BALANCE' | 'SIMULATION_REVERT'
  retryable: boolean

  constructor(message: string, code: RelayerGasError['code'], retryable: boolean) {
    super(message)
    this.name = 'RelayerGasError'
    this.code = code
    this.retryable = retryable
  }
}

/** Conservative gas limit covering both EOA (~80-100k) and ERC-1271 (~120k) transfers */
const TRANSFER_GAS_LIMIT = BigInt(150_000)

/**
 * Per-chain gas price caps in gwei. Overridable via RELAYER_GAS_CAP_GWEI_<chainId> env var.
 * USD equivalents at ETH=$2,000, POL=$0.40, gas limit=150k:
 *   Base/OP/Arb: 150k * 0.13 gwei = 0.0000195 ETH ≈ $0.04
 *   Mainnet:     150k * 1.5 gwei  = 0.000225 ETH  ≈ $0.45
 *   Polygon:     150k * 833 gwei  = 0.12495 POL   ≈ $0.02
 */
const DEFAULT_GAS_CAPS_GWEI: Record<number, string> = {
  [base.id]: '0.13',
  [mainnet.id]: '1.5',
  [optimism.id]: '0.13',
  [arbitrum.id]: '0.13',
  [polygon.id]: '833',
  [baseSepolia.id]: '10',
}

type TransferWithAuthorizationArgs =
  | readonly [
      from: `0x${string}`,
      to: `0x${string}`,
      value: bigint,
      validAfter: bigint,
      validBefore: bigint,
      nonce: `0x${string}`,
      v: number,
      r: `0x${string}`,
      s: `0x${string}`,
    ]
  | readonly [
      from: `0x${string}`,
      to: `0x${string}`,
      value: bigint,
      validAfter: bigint,
      validBefore: bigint,
      nonce: `0x${string}`,
      signature: Hex,
    ]

function getGasCapForChain(chainId: number): bigint {
  const envCap = process.env[`RELAYER_GAS_CAP_GWEI_${chainId}`]
  const gweiStr = envCap || DEFAULT_GAS_CAPS_GWEI[chainId] || '100'
  return parseGwei(gweiStr)
}

/**
 * Pre-flight gas checks: price cap, relayer balance, and tx simulation.
 * Returns `{ maxFeePerGas }` to pass to writeContract.
 */
async function assertGasConditions(params: {
  chainId: number
  tokenAddress: `0x${string}`
  args: TransferWithAuthorizationArgs
  functionName: 'transferWithAuthorization'
}): Promise<{ maxFeePerGas: bigint }> {
  const { chainId, tokenAddress, args, functionName } = params
  const client = getPublicClientForChain(chainId)
  const gasCap = getGasCapForChain(chainId)

  // 1. Check current gas price against per-chain cap
  const gasPrice = await client.getGasPrice()
  if (gasPrice > gasCap) {
    throw new RelayerGasError(
      `Gas price ${gasPrice} exceeds cap ${gasCap} (chain ${chainId})`,
      'GAS_PRICE_TOO_HIGH',
      true
    )
  }

  // maxFeePerGas = min(2x current price, cap) — gives headroom for next-block inclusion
  const doubled = gasPrice * BigInt(2)
  const maxFeePerGas = doubled < gasCap ? doubled : gasCap

  // 2. Check relayer ETH balance can cover gas
  const account = getRelayerAccount()
  const balance = await client.getBalance({ address: account.address })
  const requiredGas = TRANSFER_GAS_LIMIT * maxFeePerGas
  if (balance < requiredGas) {
    throw new RelayerGasError(
      `Relayer balance ${balance} insufficient for gas (need ${requiredGas}, chain ${chainId})`,
      'INSUFFICIENT_RELAYER_BALANCE',
      true
    )
  }

  // 3. Simulate the contract call to catch reverts without burning gas
  try {
    await client.simulateContract({
      address: tokenAddress,
      abi: usdcAbi,
      functionName,
      args,
      account: account.address,
      gas: TRANSFER_GAS_LIMIT,
    })
  } catch (error) {
    throw new RelayerGasError(
      `Simulation reverted: ${(error as Error).message}`,
      'SIMULATION_REVERT',
      false
    )
  }

  return { maxFeePerGas }
}

/**
 * Detect smart wallet (ERC-1271) signatures.
 * EOA signatures are exactly 65 bytes (130 hex chars + '0x' prefix = 132 chars).
 * Smart wallet signatures (ABI-encoded ERC-1271) are longer.
 */
export function isSmartWalletSignature(sig: string): boolean {
  const hex = sig.startsWith('0x') ? sig.slice(2) : sig
  return hex.length > 130
}

/**
 * ERC-6492 magic suffix (32 bytes).
 * Signatures ending with this are wrapped in ERC-6492 format:
 *   abi.encode(address factory, bytes factoryCalldata, bytes originalSignature) ++ magic
 */
const ERC_6492_MAGIC = '6492649264926492649264926492649264926492649264926492649264926492'

/**
 * Unwrap an ERC-6492 signature to extract the inner originalSignature.
 * If the signature doesn't have the ERC-6492 magic suffix, returns it unchanged.
 *
 * ERC-6492 format: abi.encode(address, bytes, bytes) ++ 0x6492...6492
 * The third `bytes` parameter is the actual ERC-1271 signature.
 */
export function unwrapERC6492Signature(sig: Hex): Hex {
  const hex = sig.startsWith('0x') ? sig.slice(2) : sig
  if (!hex.endsWith(ERC_6492_MAGIC)) return sig

  // Strip the 32-byte magic suffix
  const wrapped = `0x${hex.slice(0, -64)}` as Hex

  // ABI-decode: (address factory, bytes factoryCalldata, bytes originalSignature)
  const [, , originalSignature] = decodeAbiParameters(
    [
      { name: 'factory', type: 'address' },
      { name: 'factoryCalldata', type: 'bytes' },
      { name: 'originalSignature', type: 'bytes' },
    ],
    wrapped
  )

  console.log('[Relayer] Unwrapped ERC-6492 signature, inner length:', (originalSignature as string).length, 'chars')
  return originalSignature as Hex
}

// ── Per-chain client caches ──

const publicClientCache = new Map<number, ReturnType<typeof createPublicClient>>()

function getPublicClientForChain(chainId: number): ReturnType<typeof createPublicClient> {
  let client = publicClientCache.get(chainId)
  if (client) return client
  const viemChain = CHAIN_ID_TO_CHAIN[chainId]
  if (!viemChain) throw new Error(`Unsupported chain ID for relayer: ${chainId}`)
  client = createPublicClient({ chain: viemChain, transport: getTransport(chainId) })
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
    transport: getTransport(chainId),
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

// ── Per-chain EIP-712 domain ──

type TokenDomain = { name: string; version: string; chainId: number; verifyingContract: `0x${string}` }
/** @deprecated Use TokenDomain */
type UsdcDomain = TokenDomain

/**
 * Get the EIP-712 domain for a gasless token config.
 * Domain params (name, version) are compile-time constants in the token contracts.
 */
export function getTokenDomain(config: GaslessTokenConfig): TokenDomain {
  return {
    name: config.eip712Name,
    version: config.eip712Version,
    chainId: config.chainId,
    verifyingContract: config.tokenAddress as `0x${string}`,
  }
}

/**
 * Get the USDC EIP-712 domain for a specific chain.
 * @deprecated Use getTokenDomain(config) for multi-token support
 */
export function getUsdcDomain(chainId?: number): TokenDomain {
  const cid = chainId ?? defaultChainId
  const config = getUsdcConfigForChainId(cid)
  if (!config) throw new Error(`No USDC config for chain ${cid}`)
  return getTokenDomain(config)
}

/**
 * Get EIP-712 types for TransferWithAuthorization (EIP-3009).
 * Same on all chains.
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

/** @deprecated Use getTransferWithAuthorizationTypes instead */
export const getReceiveWithAuthorizationTypes = getTransferWithAuthorizationTypes

/**
 * Create typed data for EIP-712 signing (TransferWithAuthorization).
 * Accepts a GaslessTokenConfig or a chain ID (backward compat: defaults to USDC on that chain).
 */
export async function createAuthorizationTypedData(authorization: EIP3009Authorization, chainIdOrConfig?: number | GaslessTokenConfig) {
  const domain = typeof chainIdOrConfig === 'object'
    ? getTokenDomain(chainIdOrConfig)
    : getUsdcDomain(chainIdOrConfig)
  return {
    domain,
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
 * Check if an authorization nonce has been used.
 * Accepts a GaslessTokenConfig or chain ID (backward compat: defaults to USDC).
 */
export async function isNonceUsed(authorizer: string, nonce: string, chainIdOrConfig?: number | GaslessTokenConfig): Promise<boolean> {
  const config = typeof chainIdOrConfig === 'object'
    ? chainIdOrConfig
    : getUsdcConfigForChainId(chainIdOrConfig ?? defaultChainId)
  if (!config) return false
  const cid = config.chainId
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
 * Execute a TransferWithAuthorization transaction.
 *
 * transferWithAuthorization sends tokens directly from the user to the `to` address
 * (PAYMENT_RECIPIENT_ADDRESS) in a single transaction. Any msg.sender can call it.
 * Works with any EIP-3009 token (USDC, USDT0).
 *
 * @param authorization  The signed EIP-3009 authorization (to = payment recipient)
 * @param signature      The EIP-712 signature split into v, r, s
 * @param chainIdOrConfig  Chain ID (backward compat: USDC) or GaslessTokenConfig
 */
export async function executeTransferWithAuthorization(
  authorization: EIP3009Authorization,
  signature: { v: number; r: string; s: string },
  chainIdOrConfig?: number | GaslessTokenConfig
): Promise<{ txHash: string }> {
  const config = typeof chainIdOrConfig === 'object'
    ? chainIdOrConfig
    : getUsdcConfigForChainId(chainIdOrConfig ?? defaultChainId)
  if (!config) throw new Error(`No gasless token config for chain ${typeof chainIdOrConfig === 'number' ? chainIdOrConfig : 'unknown'}`)
  const cid = config.chainId

  const { walletClient } = getWalletClientForChain(cid)
  const client = getPublicClientForChain(cid)
  const tokenAddress = config.tokenAddress as `0x${string}`

  console.log(`[Relayer] Executing transferWithAuthorization on chain ${cid} (${CHAIN_ID_TO_CHAIN[cid]?.name ?? 'unknown'})`)

  // Check if nonce has already been used
  const nonceUsed = await isNonceUsed(authorization.from, authorization.nonce, config)
  if (nonceUsed) {
    throw new Error('Authorization nonce has already been used')
  }

  // Check the payer actually has sufficient balance (prevents gas griefing)
  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [authorization.from as `0x${string}`],
    })
    if ((balance as bigint) < BigInt(authorization.value)) {
      throw new Error(`Insufficient ${config.tokenSymbol} balance: payer has ${balance}, needs ${authorization.value}`)
    }
  } catch (error) {
    if ((error as Error).message.startsWith('Insufficient ')) throw error
    console.warn(`[Relayer] ${config.tokenSymbol} balance check failed, proceeding anyway:`, (error as Error).message)
  }

  // Gas protection: check price cap, relayer balance, and simulate
  const contractArgs = [
    authorization.from as `0x${string}`,
    authorization.to as `0x${string}`,
    BigInt(authorization.value),
    BigInt(authorization.validAfter),
    BigInt(authorization.validBefore),
    authorization.nonce as `0x${string}`,
    signature.v,
    signature.r as `0x${string}`,
    signature.s as `0x${string}`,
  ] as const

  const { maxFeePerGas } = await assertGasConditions({
    chainId: cid,
    tokenAddress,
    args: contractArgs,
    functionName: 'transferWithAuthorization',
  })

  try {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: usdcAbi,
      functionName: 'transferWithAuthorization',
      args: contractArgs,
      gas: TRANSFER_GAS_LIMIT,
      maxFeePerGas,
    })

    console.log('[Relayer] transferWithAuthorization tx:', hash)

    // Return txHash immediately without waiting for receipt.
    // Receipt verification happens independently in the verify endpoint,
    // which has its own chain-aware retry loop. This prevents timeouts
    // on slow chains (e.g. mainnet ~12s blocks) from losing the txHash.
    return { txHash: hash }
  } catch (error) {
    console.error('[Relayer] Error executing authorization:', error)
    throw error
  }
}

/**
 * Execute a TransferWithAuthorization using the `bytes signature` overload.
 * This overload is supported by USDC v2.2+ and internally calls
 * SignatureChecker.isValidSignatureNow(), which handles both EOA (ecrecover)
 * and ERC-1271 (smart wallet) signatures.
 *
 * Use this for Coinbase Smart Wallet and other contract wallets that produce
 * ABI-encoded ERC-1271 signatures (>65 bytes).
 */
export async function executeTransferWithAuthorizationBytes(
  authorization: EIP3009Authorization,
  signatureBytes: Hex,
  chainIdOrConfig?: number | GaslessTokenConfig
): Promise<{ txHash: string }> {
  const config = typeof chainIdOrConfig === 'object'
    ? chainIdOrConfig
    : getUsdcConfigForChainId(chainIdOrConfig ?? defaultChainId)
  if (!config) throw new Error(`No gasless token config for chain ${typeof chainIdOrConfig === 'number' ? chainIdOrConfig : 'unknown'}`)
  const cid = config.chainId

  const { walletClient } = getWalletClientForChain(cid)
  const client = getPublicClientForChain(cid)
  const tokenAddress = config.tokenAddress as `0x${string}`

  // Unwrap ERC-6492 if present (Coinbase Smart Wallet wraps signatures in this format)
  const unwrappedSig = unwrapERC6492Signature(signatureBytes)

  console.log(`[Relayer] Executing transferWithAuthorization (bytes overload) on chain ${cid} (${CHAIN_ID_TO_CHAIN[cid]?.name ?? 'unknown'})`)

  // Check if nonce has already been used
  const nonceUsed = await isNonceUsed(authorization.from, authorization.nonce, config)
  if (nonceUsed) {
    throw new Error('Authorization nonce has already been used')
  }

  // Check the payer actually has sufficient balance (prevents gas griefing)
  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [authorization.from as `0x${string}`],
    })
    if ((balance as bigint) < BigInt(authorization.value)) {
      throw new Error(`Insufficient ${config.tokenSymbol} balance: payer has ${balance}, needs ${authorization.value}`)
    }
  } catch (error) {
    if ((error as Error).message.startsWith('Insufficient ')) throw error
    console.warn(`[Relayer] ${config.tokenSymbol} balance check failed, proceeding anyway:`, (error as Error).message)
  }

  // Gas protection: check price cap, relayer balance, and simulate
  const contractArgs = [
    authorization.from as `0x${string}`,
    authorization.to as `0x${string}`,
    BigInt(authorization.value),
    BigInt(authorization.validAfter),
    BigInt(authorization.validBefore),
    authorization.nonce as `0x${string}`,
    unwrappedSig,
  ] as const

  const { maxFeePerGas } = await assertGasConditions({
    chainId: cid,
    tokenAddress,
    args: contractArgs,
    functionName: 'transferWithAuthorization',
  })

  try {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: usdcAbi,
      functionName: 'transferWithAuthorization',
      args: contractArgs,
      gas: TRANSFER_GAS_LIMIT,
      maxFeePerGas,
    })

    console.log('[Relayer] transferWithAuthorization (bytes) tx:', hash)
    return { txHash: hash }
  } catch (error) {
    console.error('[Relayer] Error executing authorization (bytes overload):', error)
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
