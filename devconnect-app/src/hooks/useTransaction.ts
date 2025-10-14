'use client';

import { useTransactionRouter } from './useTransactionRouter';
import { useEOATransaction } from './useEOATransaction';
import { useWalletManager } from './useWalletManager';

/**
 * Unified Transaction Hook
 * Routes to appropriate transaction implementation based on wallet type
 * 
 * For Para wallets: Uses useTransactionRouter which intelligently chooses between:
 *   - EIP-7702 + Coinbase Paymaster (if NEXT_PUBLIC_ENABLE_EIP7702=true)
 *   - Legacy backend relayer system (if EIP-7702 is disabled)
 * 
 * For EOA wallets: Uses standard EOA transaction flow
 */
export function useTransaction() {
  const { isPara } = useWalletManager();
  const paraTransaction = useTransactionRouter();
  const eoaTransaction = useEOATransaction();

  // Simple delegation based on wallet type
  if (isPara) {
    return {
      ...paraTransaction,
      walletType: 'para' as const,
      // Add default values for properties that don't exist in Para
      isSimulation: paraTransaction.isSimulation || false,
      simulationDetails: paraTransaction.simulationDetails || null,
    };
  } else {
    return {
      ...eoaTransaction,
      walletType: 'eoa' as const,
      // Add default values for properties that don't exist in EOA
      isSimulation: false,
      simulationDetails: null,
    };
  }
}

// Re-export types for convenience
export type { TransactionStatus } from './useParaTransaction';

