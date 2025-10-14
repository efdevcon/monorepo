'use client';

import { useParaTransaction } from './useParaTransaction';
import { useParaEIP7702Transaction } from './useParaEIP7702Transaction';
import { isEIP7702Available } from '@/config/eip7702';

/**
 * Transaction Router Hook
 * 
 * Intelligently routes between legacy and EIP-7702 transaction systems
 * based on feature flag (NEXT_PUBLIC_ENABLE_EIP7702)
 * 
 * Usage:
 *   const { sendTransaction } = useTransactionRouter();
 *   await sendTransaction(recipient, amount);
 * 
 * The returned hook has the same interface as both useParaTransaction
 * and useParaEIP7702Transaction, so it's a drop-in replacement.
 */
export function useTransactionRouter() {
  const legacyTransaction = useParaTransaction();
  const eip7702Transaction = useParaEIP7702Transaction();
  
  // Check if EIP-7702 is available and enabled
  const useEIP7702 = isEIP7702Available();
  
  // Log which system is being used (helps with debugging)
  if (typeof window !== 'undefined') {
    const system = useEIP7702 ? 'EIP-7702 (Alchemy Account Kit)' : 'Legacy (Backend Relayer)';
    console.log(`[Transaction Router] Using ${system}`);
  }
  
  // Return the appropriate hook based on feature flag
  return useEIP7702 ? eip7702Transaction : legacyTransaction;
}

