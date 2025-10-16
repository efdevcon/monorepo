/**
 * Coinbase Server Smart Wallet & Paymaster Configuration
 * 
 * This configuration enables gasless USDC transfers using:
 * - Coinbase Server Smart Wallet (ERC-4337 smart account)
 * - Coinbase Paymaster (gas sponsorship)
 * - Coinbase Bundler (UserOperation submission)
 */

export const COINBASE_CONFIG = {
  // Feature flag to enable Coinbase Smart Wallet mode
  ENABLED: process.env.NEXT_PUBLIC_USE_COINBASE_SMART_WALLET === 'true',

  // Coinbase API credentials (from CDP dashboard)
  API_KEY_ID: process.env.CDP_API_KEY_ID,
  API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
  WALLET_SECRET: process.env.CDP_WALLET_SECRET,

  // Network configuration (accounts are managed by CDP with persistent names)
  NETWORK_ID: process.env.CDP_NETWORK_ID || 'base-sepolia',

  // Paymaster URL (from CDP dashboard)
  PAYMASTER_URL: process.env.CDP_PAYMASTER_URL,

  // USDC contract address (Base Mainnet)
  USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDC_DECIMALS: 6,

  // Chain ID
  CHAIN_ID: 8453, // Base Mainnet (84532 for Sepolia)
} as const;

/**
 * Validate configuration on startup
 */
export function validateCoinbaseConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (COINBASE_CONFIG.ENABLED) {
    if (!COINBASE_CONFIG.API_KEY_ID) {
      errors.push('CDP_API_KEY_ID is required');
    }
    if (!COINBASE_CONFIG.API_KEY_SECRET) {
      errors.push('CDP_API_KEY_SECRET is required');
    }
    if (!COINBASE_CONFIG.WALLET_SECRET) {
      errors.push('CDP_WALLET_SECRET is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration status for monitoring
 */
export function getCoinbaseConfigStatus() {
  return {
    enabled: COINBASE_CONFIG.ENABLED,
    hasApiKey: !!COINBASE_CONFIG.API_KEY_ID,
    hasWalletSecret: !!COINBASE_CONFIG.WALLET_SECRET,
    network: COINBASE_CONFIG.NETWORK_ID,
    chainId: COINBASE_CONFIG.CHAIN_ID,
  };
}

