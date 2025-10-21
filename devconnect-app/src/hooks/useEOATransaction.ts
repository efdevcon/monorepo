'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSendTransaction,
  useSwitchChain,
} from 'wagmi';
import { getTokenInfo } from '@/config/tokens';

export type TransactionStatus = 
  | 'idle' 
  | 'preparing' 
  | 'building' 
  | 'signing' 
  | 'executing' 
  | 'broadcasting' 
  | 'confirming' 
  | 'transfer'
  | 'confirmed' 
  | 'error';

/**
 * EOA Transaction Hook
 * Handles transactions for external wallets (MetaMask, Zerion, etc.) via wagmi
 * No Para coordination needed
 */
export function useEOATransaction() {
  const { address, isConnected, chainId: currentChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  
  // Contract write hooks
  const { 
    writeContract, 
    isPending: isWritePending, 
    data: hash, 
    error: writeError 
  } = useWriteContract();
  
  // Native token transfer hook
  const { 
    sendTransaction: sendNativeTransaction, 
    isPending: isNativePending, 
    data: nativeHash, 
    error: nativeError 
  } = useSendTransaction();

  // Transaction receipt hook
  const { 
    isLoading: isConfirming, 
    isSuccess: isReceiptSuccess,
    isError: isReceiptError 
  } = useWaitForTransactionReceipt({
    hash: hash || nativeHash,
  });

  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txError, setTxError] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [hasHandledError, setHasHandledError] = useState(false);

  /**
   * Helper to detect user rejection errors
   */
  const isUserRejectionError = (error: any): boolean => {
    if (!error) return false;
    const errorMessage = error.message || '';
    const errorCode = error.code;
    return (
      errorMessage.includes('User denied') ||
      errorMessage.includes('User rejected') ||
      errorMessage.includes('User cancelled') ||
      errorMessage.includes('User denied transaction signature') ||
      errorCode === 4001 ||
      errorCode === '4001'
    );
  };

  /**
   * Reset transaction state
   */
  const resetTransaction = () => {
    setTxStatus('idle');
    setTxError('');
    setTxHash(null);
    setHasHandledError(false);
  };

  /**
   * Send EOA transaction
   * Supports both native tokens (ETH) and ERC-20 tokens
   */
  const sendTransaction = async (
    recipient: string,
    amount: string,
    token: string,
    chainId: number,
    transactionType?: 'payment' | 'send'
  ) => {
    if (!isConnected || !address) {
      const error = 'Wallet not connected';
      setTxStatus('error');
      setTxError(error);
      throw new Error(error);
    }

    try {
      console.log('🔄 [EOA_TX] Starting EOA wallet transaction');
      console.log('🔄 [EOA_TX] Type:', transactionType || 'payment');
      console.log('🔄 [EOA_TX] From:', address);
      console.log('🔄 [EOA_TX] To:', recipient);
      console.log('🔄 [EOA_TX] Amount:', amount);
      console.log('🔄 [EOA_TX] Token:', token);
      console.log('🔄 [EOA_TX] Chain:', chainId);
      
      setTxStatus('preparing');

      // Switch to the selected network if needed
      if (currentChainId !== chainId) {
        try {
          console.log('🔄 [EOA_TX] Switching to network:', chainId);
          await switchChain({ chainId });
          console.log('✅ [EOA_TX] Network switch successful');
        } catch (switchError) {
          console.error('❌ [EOA_TX] Network switch failed:', switchError);
          // Continue - user might already be on correct network
        }
      }

      setTxStatus('transfer');
      
      // Get token information
      const tokenInfo = getTokenInfo(token, chainId);
      if (!tokenInfo) {
        throw new Error(`Token ${token} not supported on chain ${chainId}`);
      }

      // Convert amount to wei based on token decimals
      const amountNumber = parseFloat(amount);
      const amountWei = BigInt(Math.floor(amountNumber * Math.pow(10, tokenInfo.decimals)));
      
      console.log('🔄 [EOA_TX] Token info:', tokenInfo);
      console.log('🔄 [EOA_TX] Amount in wei:', amountWei.toString());

      // Native token transfer (ETH, MATIC, etc.)
      if ('isNative' in tokenInfo && tokenInfo.isNative) {
        console.log('🔄 [EOA_TX] Sending native token transfer...');
        sendNativeTransaction({
          to: recipient as `0x${string}`,
          value: amountWei,
        });
      } else {
        // ERC-20 token transfer
        console.log('🔄 [EOA_TX] Sending ERC-20 token transfer...');
        const tokenABI = [
          {
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ] as const;

        writeContract({
          address: tokenInfo.address as `0x${string}`,
          abi: tokenABI,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, amountWei],
        });
      }
      
      console.log('✅ [EOA_TX] Transaction initiated');

    } catch (error) {
      console.error('❌ [EOA_TX] Transaction failed:', error);
      setTxStatus('error');

      if (isUserRejectionError(error)) {
        setTxError('Transaction was cancelled by user');
      } else if (error instanceof Error) {
        setTxError(error.message);
      } else {
        setTxError('Failed to initiate transfer');
      }
      
      throw error;
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isReceiptSuccess && (hash || nativeHash) && txStatus !== 'confirmed') {
      console.log('✅ [EOA_TX] Transaction confirmed');
      setTxHash(hash || nativeHash || null);
      setTxStatus('confirmed');
    }
  }, [isReceiptSuccess, hash, nativeHash, txStatus]);

  // Handle write contract errors
  useEffect(() => {
    if (writeError && txStatus !== 'error' && !hasHandledError) {
      console.error('❌ [EOA_TX] Write contract error:', writeError);
      setTxStatus('error');
      setHasHandledError(true);

      if (isUserRejectionError(writeError)) {
        setTxError('Transaction was cancelled by user');
      } else if (writeError instanceof Error) {
        setTxError(writeError.message);
      } else {
        setTxError('Transaction failed');
      }
    }
  }, [writeError, txStatus, hasHandledError]);

  // Handle native transaction errors
  useEffect(() => {
    if (nativeError && txStatus !== 'error' && !hasHandledError) {
      console.error('❌ [EOA_TX] Native transaction error:', nativeError);
      setTxStatus('error');
      setHasHandledError(true);

      if (isUserRejectionError(nativeError)) {
        setTxError('Transaction was cancelled by user');
      } else if (nativeError instanceof Error) {
        setTxError(nativeError.message);
      } else {
        setTxError('Native transaction failed');
      }
    }
  }, [nativeError, txStatus, hasHandledError]);

  // Handle blockchain-level errors
  useEffect(() => {
    if (isReceiptError && txStatus !== 'error' && !hasHandledError) {
      console.error('❌ [EOA_TX] Blockchain-level error');
      setTxStatus('error');
      setHasHandledError(true);
      setTxError('Transaction failed on blockchain');
    }
  }, [isReceiptError, txStatus, hasHandledError]);

  return {
    // Transaction methods
    sendTransaction,
    resetTransaction,
    
    // Transaction state
    txStatus,
    txError,
    txHash,
    
    // Status flags
    isPending: isWritePending || isNativePending || isConfirming,
    isSuccess: txStatus === 'confirmed',
    isError: txStatus === 'error',
    
    // Wallet info
    isConnected,
    address,
    chainId: currentChainId,
  };
}

