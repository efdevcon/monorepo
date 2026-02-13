/**
 * x402 Payment Protocol Types
 * Used for HTTP 402 Payment Required responses.
 * Aligned with x402 v2: multi-chain, CAIP-style asset IDs, PAYMENT-REQUIRED header.
 */

/** CAIP-19 style asset (eip155:chainId/erc20:address or native ETH placeholder) */
export interface SupportedAsset {
  asset: string
  symbol: string
  name: string
  chain: string
  chainId: string
  decimals: number
}

/** Sentinel address used to denote native ETH in supportedAssets */
export const NATIVE_ETH_PLACEHOLDER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

/** Mainnet chains: Ethereum, Optimism, Arbitrum, Base — USDC + native ETH per chain */
export const SUPPORTED_ASSETS_MAINNET: SupportedAsset[] = [
  { asset: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', chain: 'Ethereum', chainId: 'eip155:1', decimals: 6 },
  { asset: `eip155:1/erc20:${NATIVE_ETH_PLACEHOLDER}`, symbol: 'ETH', name: 'Ether', chain: 'Ethereum', chainId: 'eip155:1', decimals: 18 },
  { asset: 'eip155:10/erc20:0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', chain: 'Optimism', chainId: 'eip155:10', decimals: 6 },
  { asset: `eip155:10/erc20:${NATIVE_ETH_PLACEHOLDER}`, symbol: 'ETH', name: 'Ether', chain: 'Optimism', chainId: 'eip155:10', decimals: 18 },
  { asset: 'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', chain: 'Arbitrum', chainId: 'eip155:42161', decimals: 6 },
  { asset: `eip155:42161/erc20:${NATIVE_ETH_PLACEHOLDER}`, symbol: 'ETH', name: 'Ether', chain: 'Arbitrum', chainId: 'eip155:42161', decimals: 18 },
  { asset: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', chain: 'Base', chainId: 'eip155:8453', decimals: 6 },
  { asset: `eip155:8453/erc20:${NATIVE_ETH_PLACEHOLDER}`, symbol: 'ETH', name: 'Ether', chain: 'Base', chainId: 'eip155:8453', decimals: 18 },
  // Polygon — USDC + native ETH (MATIC/POL)
  { asset: 'eip155:137/erc20:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', name: 'USD Coin', chain: 'Polygon', chainId: 'eip155:137', decimals: 6 },
  { asset: `eip155:137/erc20:${NATIVE_ETH_PLACEHOLDER}`, symbol: 'ETH', name: 'POL', chain: 'Polygon', chainId: 'eip155:137', decimals: 18 },
  // USDT0 (gasless via EIP-3009) — Optimism & Arbitrum only
  { asset: 'eip155:10/erc20:0x01bFF41798a0BcF287b996046Ca68b395DbC1071', symbol: 'USDT0', name: 'Tether USD', chain: 'Optimism', chainId: 'eip155:10', decimals: 6 },
  { asset: 'eip155:42161/erc20:0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT0', name: 'Tether USD', chain: 'Arbitrum', chainId: 'eip155:42161', decimals: 6 },
]

/** Base Sepolia (testnet) – USDC + ETH */
export const SUPPORTED_ASSETS_TESTNET: SupportedAsset[] = [
  { asset: 'eip155:84532/erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e', symbol: 'USDC', name: 'USD Coin', chain: 'Base Sepolia', chainId: 'eip155:84532', decimals: 6 },
  { asset: `eip155:84532/erc20:${NATIVE_ETH_PLACEHOLDER}`, symbol: 'ETH', name: 'Ether', chain: 'Base Sepolia', chainId: 'eip155:84532', decimals: 18 },
]

/** x402 v2–style payment block returned when user reaches crypto payment (402 response) */
export interface X402PaymentBlockV2 {
  paymentId: string
  amount: number
  currency: string
  referenceId: string
  status: 'pending'
  createdAt: number
  supportedAssets: SupportedAsset[]
}

export interface X402PaymentRequirements {
  /** The resource being requested */
  resource: string
  /** Payment details */
  payment: {
    /** Network for payment (e.g., 'base') */
    network: string
    /** Chain ID */
    chainId: number
    /** Token address (USDC on Base) */
    tokenAddress: string
    /** Token symbol */
    tokenSymbol: string
    /** Token decimals */
    tokenDecimals: number
    /** Amount in smallest unit (e.g., 6 decimals for USDC) */
    amount: string
    /** Human-readable amount */
    amountFormatted: string
    /** Recipient address for payment */
    recipient: string
    /** Unique payment reference/nonce */
    paymentReference: string
    /** Expiry timestamp for this payment request */
    expiresAt: number
  }
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

export interface X402PaymentProof {
  /** Transaction hash of the payment */
  txHash: string
  /** Payment reference that was included */
  paymentReference: string
  /** Payer address */
  payer: string
  /** Chain ID where the transaction was sent (e.g. 8453 for Base). Required for multi-chain so verify looks up the tx on the correct chain. */
  chainId?: number
  /** Expected USDC amount in smallest unit (6 decimals). Used by verifyPayment to check the transfer value. */
  expectedAmount?: string
}

export interface X402PaymentVerification {
  /** Whether payment is verified */
  verified: boolean
  /** Error message if not verified */
  error?: string
  /** Block number of confirmation */
  blockNumber?: number
  /** Timestamp of confirmation */
  confirmedAt?: number
}

// ── Gasless token configuration (EIP-3009 transferWithAuthorization) ──

export interface GaslessTokenConfig {
  readonly network: string
  readonly chainId: number
  readonly tokenAddress: string
  readonly tokenSymbol: string
  readonly tokenDecimals: number
  readonly eip712Name: string
  readonly eip712Version: string
}

/** @deprecated Use GaslessTokenConfig */
export type UsdcChainConfig = GaslessTokenConfig

// Per-chain USDC configurations (Circle native USDC — name="USD Coin", version="2")
export const ETHEREUM_USDC_CONFIG: GaslessTokenConfig = {
  network: 'ethereum', chainId: 1,
  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenSymbol: 'USDC', tokenDecimals: 6,
  eip712Name: 'USD Coin', eip712Version: '2',
}

export const OPTIMISM_USDC_CONFIG: GaslessTokenConfig = {
  network: 'optimism', chainId: 10,
  tokenAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  tokenSymbol: 'USDC', tokenDecimals: 6,
  eip712Name: 'USD Coin', eip712Version: '2',
}

export const ARBITRUM_USDC_CONFIG: GaslessTokenConfig = {
  network: 'arbitrum', chainId: 42161,
  tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  tokenSymbol: 'USDC', tokenDecimals: 6,
  eip712Name: 'USD Coin', eip712Version: '2',
}

export const BASE_USDC_CONFIG: GaslessTokenConfig = {
  network: 'base', chainId: 8453,
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  tokenSymbol: 'USDC', tokenDecimals: 6,
  eip712Name: 'USD Coin', eip712Version: '2',
}

export const POLYGON_USDC_CONFIG: GaslessTokenConfig = {
  network: 'polygon', chainId: 137,
  tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  tokenSymbol: 'USDC', tokenDecimals: 6,
  eip712Name: 'USD Coin', eip712Version: '2',
}

export const BASE_SEPOLIA_USDC_CONFIG: GaslessTokenConfig = {
  network: 'base-sepolia', chainId: 84532,
  tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  tokenSymbol: 'USDC', tokenDecimals: 6,
  eip712Name: 'USD Coin', eip712Version: '2',
}

// Per-chain USDT0 configurations (Tether OFT — name="USD₮0", version="1")
export const OPTIMISM_USDT0_CONFIG: GaslessTokenConfig = {
  network: 'optimism', chainId: 10,
  tokenAddress: '0x01bFF41798a0BcF287b996046Ca68b395DbC1071',
  tokenSymbol: 'USDT0', tokenDecimals: 6,
  eip712Name: 'USD\u20AE0', eip712Version: '1',
}

export const ARBITRUM_USDT0_CONFIG: GaslessTokenConfig = {
  network: 'arbitrum', chainId: 42161,
  tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  tokenSymbol: 'USDT0', tokenDecimals: 6,
  eip712Name: 'USD\u20AE0', eip712Version: '1',
}

/** All mainnet USDC configs */
export const USDC_CONFIGS_MAINNET: GaslessTokenConfig[] = [
  BASE_USDC_CONFIG,
  ETHEREUM_USDC_CONFIG,
  OPTIMISM_USDC_CONFIG,
  ARBITRUM_USDC_CONFIG,
  POLYGON_USDC_CONFIG,
]

/** All testnet USDC configs */
export const USDC_CONFIGS_TESTNET: GaslessTokenConfig[] = [
  BASE_SEPOLIA_USDC_CONFIG,
]

/** All mainnet USDT0 configs */
export const USDT0_CONFIGS_MAINNET: GaslessTokenConfig[] = [
  OPTIMISM_USDT0_CONFIG,
  ARBITRUM_USDT0_CONFIG,
]

/** All mainnet gasless configs (USDC + USDT0) */
export const GASLESS_CONFIGS_MAINNET: GaslessTokenConfig[] = [
  ...USDC_CONFIGS_MAINNET,
  ...USDT0_CONFIGS_MAINNET,
]

/** All testnet gasless configs */
export const GASLESS_CONFIGS_TESTNET: GaslessTokenConfig[] = [
  ...USDC_CONFIGS_TESTNET,
]

/** Look up USDC config by chain ID (backward compat) */
export function getUsdcConfigForChainId(chainId: number): GaslessTokenConfig | undefined {
  const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
  const configs = isTestnet ? USDC_CONFIGS_TESTNET : USDC_CONFIGS_MAINNET
  return configs.find(c => c.chainId === chainId)
}

/** Look up gasless config by chain ID + token address */
export function getGaslessTokenConfig(chainId: number, tokenAddress: string): GaslessTokenConfig | undefined {
  const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
  const configs = isTestnet ? GASLESS_CONFIGS_TESTNET : GASLESS_CONFIGS_MAINNET
  return configs.find(c => c.chainId === chainId && c.tokenAddress.toLowerCase() === tokenAddress.toLowerCase())
}

/** Get all gasless configs for a chain (may return multiple tokens) */
export function getGaslessConfigsForChain(chainId: number): GaslessTokenConfig[] {
  const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
  const configs = isTestnet ? GASLESS_CONFIGS_TESTNET : GASLESS_CONFIGS_MAINNET
  return configs.filter(c => c.chainId === chainId)
}

/** Get all gasless configs */
export function getAllGaslessConfigs(): GaslessTokenConfig[] {
  const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
  return isTestnet ? GASLESS_CONFIGS_TESTNET : GASLESS_CONFIGS_MAINNET
}

/** Get all chain IDs that support gasless (deduplicated) */
export function getGaslessChainIds(): number[] {
  return [...new Set(getAllGaslessConfigs().map(c => c.chainId))]
}

/** @deprecated Use getGaslessChainIds */
export function getGaslessUsdcChainIds(): number[] {
  const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV !== 'mainnet'
  const configs = isTestnet ? USDC_CONFIGS_TESTNET : USDC_CONFIGS_MAINNET
  return configs.map(c => c.chainId)
}

/**
 * EIP-3009 ReceiveWithAuthorization types for gasless USDC transfers
 */
export interface EIP3009Authorization {
  /** Address that signed the authorization */
  from: string
  /** Address receiving the tokens */
  to: string
  /** Amount in smallest unit */
  value: string
  /** Earliest timestamp when authorization is valid */
  validAfter: number
  /** Latest timestamp when authorization is valid (0 = no expiry) */
  validBefore: number
  /** Unique nonce to prevent replay */
  nonce: string
}

export interface EIP3009SignedAuthorization extends EIP3009Authorization {
  /** v component of signature */
  v: number
  /** r component of signature */
  r: string
  /** s component of signature */
  s: string
}

export interface PrepareAuthorizationRequest {
  /** Payment reference from purchase response */
  paymentReference: string
  /** Address that will sign the authorization */
  from: string
  /** Chain ID for multi-chain gasless USDC. Defaults to Base if omitted. */
  chainId?: number
}

export interface PrepareAuthorizationResponse {
  success: true
  /** EIP-712 typed data for signing */
  typedData: {
    domain: {
      name: string
      version: string
      chainId: number
      verifyingContract: string
    }
    types: Record<string, { name: string; type: string }[]>
    primaryType: string
    message: EIP3009Authorization
  }
  /** Authorization details */
  authorization: EIP3009Authorization
}

export interface ExecuteTransferRequest {
  /** Payment reference from purchase response */
  paymentReference: string
  /** The signed authorization */
  authorization: EIP3009Authorization
  /** Signature components */
  signature: {
    v: number
    r: string
    s: string
  }
  /** Chain ID for multi-chain gasless USDC. Defaults to Base if omitted. */
  chainId?: number
}

export interface ExecuteTransferResponse {
  success: true
  /** Transaction hash of the relayer's transaction */
  txHash: string
}

// ============== x402 Protocol – use @x402/core types ==============

export { x402Version as X402_VERSION } from '@x402/core'
export type {
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
  PaymentPayload,
  VerifyResponse,
  SettleResponse,
  SupportedResponse,
  VerifyRequest,
  SettleRequest,
} from '@x402/core/types'

import type { PaymentPayload, PaymentRequirements } from '@x402/core/types'

/** Facilitator verify/settle request body (SDK sends paymentPayload + paymentRequirements) */
export interface X402FacilitatorVerifyRequest {
  paymentPayload: PaymentPayload
  paymentRequirements: PaymentRequirements
}

/** Spec error codes (§9) */
export const X402_ERROR_CODES = {
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALID_AFTER: 'invalid_exact_evm_payload_authorization_valid_after',
  INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALID_BEFORE: 'invalid_exact_evm_payload_authorization_valid_before',
  INVALID_EXACT_EVM_PAYLOAD_AUTHORIZATION_VALUE: 'invalid_exact_evm_payload_authorization_value',
  INVALID_EXACT_EVM_PAYLOAD_SIGNATURE: 'invalid_exact_evm_payload_signature',
  INVALID_EXACT_EVM_PAYLOAD_RECIPIENT_MISMATCH: 'invalid_exact_evm_payload_recipient_mismatch',
  INVALID_NETWORK: 'invalid_network',
  INVALID_PAYLOAD: 'invalid_payload',
  INVALID_PAYMENT_REQUIREMENTS: 'invalid_payment_requirements',
  INVALID_SCHEME: 'invalid_scheme',
  UNSUPPORTED_SCHEME: 'unsupported_scheme',
  INVALID_X402_VERSION: 'invalid_x402_version',
  INVALID_TRANSACTION_STATE: 'invalid_transaction_state',
  UNEXPECTED_VERIFY_ERROR: 'unexpected_verify_error',
  UNEXPECTED_SETTLE_ERROR: 'unexpected_settle_error',
} as const
