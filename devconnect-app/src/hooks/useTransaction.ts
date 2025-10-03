'use client';

import { useParaTransaction } from './useParaTransaction';
import { useEOATransaction } from './useEOATransaction';
import { useWalletManager } from './useWalletManager';

/**
 * Unified Transaction Hook
 * Simple delegation to the appropriate transaction hook based on wallet type
 * No complex logic - just a clean interface
 */
export function useTransaction() {
  const { isPara } = useWalletManager();
  const paraTransaction = useParaTransaction();
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

