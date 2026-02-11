/**
 * Strict format validation for x402 API (txHash, Ethereum addresses with EIP-55).
 * Uses viem getAddress for checksum validation to catch typos.
 */
import { getAddress } from 'viem'

const TXHASH_REGEX = /^0x[a-fA-F0-9]{64}$/

export function isValidTxHash(txHash: string): boolean {
  return typeof txHash === 'string' && TXHASH_REGEX.test(txHash.trim())
}

export type AddressValidation =
  | { valid: true; checksummed: string }
  | { valid: false; error: string }

/**
 * Validates Ethereum address and requires EIP-55 mixed-case checksum (rejects typos).
 */
export function validateAddressEIP55(addr: string): AddressValidation {
  const t = typeof addr === 'string' ? addr.trim() : ''
  if (!t) return { valid: false, error: 'Address is required' }
  try {
    const checksummed = getAddress(t)
    if (checksummed !== t) {
      return { valid: false, error: 'Address must use EIP-55 checksum (mixed-case)' }
    }
    return { valid: true, checksummed }
  } catch {
    return { valid: false, error: 'Invalid Ethereum address' }
  }
}

/**
 * Compare two addresses (case-insensitive). Use after validating format if needed.
 */
export function addressesEqual(a: string, b: string): boolean {
  try {
    return getAddress(a.trim()) === getAddress(b.trim())
  } catch {
    return false
  }
}
