/**
 * Backend Relayer Sponsorship Policy
 * 
 * Simple rules to control what transactions get sponsored
 */

import { parseUnits } from 'ethers';

export const SPONSOR_POLICY = {
  // Maximum amount per transaction (USDC)
  maxTransactionAmount: parseUnits('100', 6), // 100 USDC max per transaction
  
  // Rate limiting per user
  rateLimit: {
    maxTransactionsPerMinute: 5,
    maxTransactionsPerHour: 50,
  },
  
  // Allowed contracts (only USDC)
  allowedContracts: [
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  ],
  
  // Minimum amount (to prevent spam)
  minTransactionAmount: parseUnits('0.01', 6), // 0.01 USDC minimum
} as const;

// In-memory rate limiting tracker (resets on server restart)
// For production, use Redis or a database
const userTransactionTracker = new Map<string, { timestamps: number[] }>();

/**
 * Check if user has exceeded rate limits
 */
export function checkRateLimit(userAddress: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const userData = userTransactionTracker.get(userAddress.toLowerCase()) || { timestamps: [] };
  
  // Clean up old timestamps (older than 1 hour)
  userData.timestamps = userData.timestamps.filter(ts => now - ts < 60 * 60 * 1000);
  
  // Check per-minute limit
  const lastMinute = userData.timestamps.filter(ts => now - ts < 60 * 1000);
  if (lastMinute.length >= SPONSOR_POLICY.rateLimit.maxTransactionsPerMinute) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: Maximum ${SPONSOR_POLICY.rateLimit.maxTransactionsPerMinute} transactions per minute`
    };
  }
  
  // Check per-hour limit
  if (userData.timestamps.length >= SPONSOR_POLICY.rateLimit.maxTransactionsPerHour) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: Maximum ${SPONSOR_POLICY.rateLimit.maxTransactionsPerHour} transactions per hour`
    };
  }
  
  // Record this transaction
  userData.timestamps.push(now);
  userTransactionTracker.set(userAddress.toLowerCase(), userData);
  
  return { allowed: true };
}

/**
 * Check if transaction amount is within limits
 */
export function checkTransactionAmount(amount: bigint): { allowed: boolean; reason?: string } {
  if (amount < SPONSOR_POLICY.minTransactionAmount) {
    return {
      allowed: false,
      reason: `Amount too small: Minimum ${formatAmount(SPONSOR_POLICY.minTransactionAmount)} USDC required`
    };
  }
  
  if (amount > SPONSOR_POLICY.maxTransactionAmount) {
    return {
      allowed: false,
      reason: `Amount too large: Maximum ${formatAmount(SPONSOR_POLICY.maxTransactionAmount)} USDC allowed per transaction`
    };
  }
  
  return { allowed: true };
}

/**
 * Check if contract is allowed
 */
export function checkAllowedContract(contractAddress: string): { allowed: boolean; reason?: string } {
  const isAllowed = SPONSOR_POLICY.allowedContracts.some(
    addr => addr.toLowerCase() === contractAddress.toLowerCase()
  );
  
  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Contract not allowed: Only USDC transfers are sponsored`
    };
  }
  
  return { allowed: true };
}

/**
 * Format amount for display
 */
function formatAmount(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}

/**
 * Validate all policies for a transaction
 */
export function validateSponsorshipPolicy(
  userAddress: string,
  amount: bigint,
  contractAddress: string
): { allowed: boolean; reason?: string } {
  // Check contract allowlist
  const contractCheck = checkAllowedContract(contractAddress);
  if (!contractCheck.allowed) {
    return contractCheck;
  }
  
  // Check transaction amount
  const amountCheck = checkTransactionAmount(amount);
  if (!amountCheck.allowed) {
    return amountCheck;
  }
  
  // Check rate limit
  const rateLimitCheck = checkRateLimit(userAddress);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck;
  }
  
  return { allowed: true };
}

