'use client';

import { useState } from 'react';
import { useWallet } from '@getpara/react-sdk';
import { useViemAccount } from '@getpara/react-sdk/evm';
import { para } from '@/config/para';
import { clearEIP7702WithRelayer } from '@/utils/clear-eip7702-relayer';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

type ClearStatus = 'idle' | 'checking' | 'clearing' | 'success' | 'error';

/**
 * Hook to clear EIP-7702 delegation using backend relayer
 * EOA signs the authorization, relayer executes and pays gas
 */
export function useClearEIP7702() {
  const paraWallet = useWallet();
  const { viemAccount } = useViemAccount();
  const [status, setStatus] = useState<ClearStatus>('idle');
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [hasDelegation, setHasDelegation] = useState<boolean | null>(null);

  /**
   * Check if the wallet has active EIP-7702 delegation
   */
  const checkDelegation = async () => {
    const address = paraWallet?.data?.address;
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setStatus('checking');
      const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      });

      const code = await publicClient.getCode({ address: address as `0x${string}` });
      const hasDelegate = code?.startsWith('0xef0100') || false;
      
      setHasDelegation(hasDelegate);
      setStatus('idle');
      return hasDelegate;
    } catch (err) {
      console.error('Failed to check delegation:', err);
      setError(err instanceof Error ? err.message : 'Failed to check delegation');
      setStatus('error');
      return false;
    }
  };

  /**
   * Clear EIP-7702 delegation using backend relayer
   * EOA signs the authorization, relayer executes and pays gas
   * NO ETH needed in the user's wallet!
   */
  const clearDelegation = async () => {
    const address = paraWallet?.data?.address;
    if (!address) {
      setError('Wallet not connected');
      setStatus('error');
      throw new Error('Wallet not connected');
    }

    if (!viemAccount) {
      setError('Viem account not available for signing');
      setStatus('error');
      throw new Error('Viem account not available for signing');
    }

    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

    try {
      setStatus('clearing');
      setError('');
      setTxHash(null);

      console.log('🔄 Clearing EIP-7702 delegation via backend relayer...');
      console.log('💡 EOA signs, relayer executes & pays gas - NO ETH needed!');

      const hash = await clearEIP7702WithRelayer(
        para,
        address,
        viemAccount,
        rpcUrl
      );

      setTxHash(hash);
      setStatus('success');
      setHasDelegation(false);
      
      console.log('✅ EIP-7702 delegation cleared successfully!');
      console.log('🎉 Transaction hash:', hash);

      return hash;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Failed to clear delegation:', errorMsg);
      setError(errorMsg);
      setStatus('error');
      throw err;
    }
  };

  /**
   * Reset state
   */
  const reset = () => {
    setStatus('idle');
    setError('');
    setTxHash(null);
    setHasDelegation(null);
  };

  return {
    // Methods
    checkDelegation,
    clearDelegation,
    reset,

    // State
    status,
    error,
    txHash,
    hasDelegation,

    // Status flags
    isChecking: status === 'checking',
    isClearing: status === 'clearing',
    isSuccess: status === 'success',
    isError: status === 'error',
    isIdle: status === 'idle',

    // Wallet info
    isConnected: !!paraWallet?.data?.address,
    address: paraWallet?.data?.address || null,
  };
}
