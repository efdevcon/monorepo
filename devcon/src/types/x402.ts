/**
 * x402 Payment Protocol Types
 * Used for HTTP 402 Payment Required responses
 */

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

// Base Mainnet USDC configuration
export const BASE_USDC_CONFIG = {
  network: 'base',
  chainId: 8453,
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  tokenSymbol: 'USDC',
  tokenDecimals: 6,
} as const

// Base Sepolia USDC configuration (for testing)
export const BASE_SEPOLIA_USDC_CONFIG = {
  network: 'base-sepolia',
  chainId: 84532,
  tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
  tokenSymbol: 'USDC',
  tokenDecimals: 6,
} as const

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
}

export interface ExecuteTransferResponse {
  success: true
  /** Transaction hash of the relayer's transaction */
  txHash: string
}
