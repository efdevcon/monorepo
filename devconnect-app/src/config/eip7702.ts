// Configuration for EIP-7702 + Alchemy Account Kit
export const EIP7702_CONFIG = {
  // Feature flag - set NEXT_PUBLIC_ENABLE_EIP7702=true to enable
  ENABLED: process.env.NEXT_PUBLIC_ENABLE_EIP7702 === 'true',
  
  // Alchemy RPC URL (e.g., https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY)
  ALCHEMY_RPC_URL: process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || '',
  
  // Alchemy Gas Manager Policy ID for sponsorship
  ALCHEMY_GAS_POLICY_ID: process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID || '',
  
  // USDC contract on Base
  USDC_CONTRACT: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  
  // USDC decimals
  USDC_DECIMALS: 6,
  
  // Base chain ID
  CHAIN_ID: 8453,
} as const;

// Validation
if (typeof window !== 'undefined' && EIP7702_CONFIG.ENABLED) {
  if (!EIP7702_CONFIG.ALCHEMY_RPC_URL || !EIP7702_CONFIG.ALCHEMY_GAS_POLICY_ID) {
    console.warn(
      '⚠️ EIP-7702 is enabled but Alchemy credentials are missing. ' +
      'Set NEXT_PUBLIC_ALCHEMY_RPC_URL and NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID. ' +
      'Falling back to legacy transaction system.'
    );
  }
}

/**
 * Check if EIP-7702 is available (enabled and configured)
 */
export const isEIP7702Available = () => {
  return EIP7702_CONFIG.ENABLED && 
         !!EIP7702_CONFIG.ALCHEMY_RPC_URL && 
         !!EIP7702_CONFIG.ALCHEMY_GAS_POLICY_ID;
};

