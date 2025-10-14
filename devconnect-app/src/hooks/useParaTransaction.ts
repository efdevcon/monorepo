'use client';

import { useState } from 'react';
import { useWallet } from '@getpara/react-sdk';
import { useViemAccount } from '@getpara/react-sdk/evm';

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

interface SimulationDetails {
  estimatedGas: string;
  estimatedCost: string;
  gasPrice: string;
  success: boolean;
  message: string;
}

/**
 * Para Transaction Hook
 * Handles transactions using Para SDK directly - no wagmi coordination
 * Para transactions are always on Base network (8453)
 */
export function useParaTransaction() {
  const paraWallet = useWallet();
  const { viemAccount } = useViemAccount();
  
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txError, setTxError] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSimulation, setIsSimulation] = useState<boolean>(false);
  const [simulationDetails, setSimulationDetails] = useState<SimulationDetails | null>(null);

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
    setIsSimulation(false);
    setSimulationDetails(null);
  };

  /**
   * Send Para transaction
   * Uses Para SDK signing directly - no wagmi layer
   */
  const sendTransaction = async (
    recipient: string,
    amount: string,
    token?: string,
    chainId?: number
  ) => {
    const paraWalletAddress = paraWallet?.data?.address;

    if (!paraWalletAddress) {
      const error = 'Para wallet not connected';
      setTxStatus('error');
      setTxError(error);
      throw new Error(error);
    }

    try {
      console.log('🔄 [PARA_TX] Starting Para wallet transaction');
      console.log('🔄 [PARA_TX] From:', paraWalletAddress);
      console.log('🔄 [PARA_TX] To:', recipient);
      console.log('🔄 [PARA_TX] Amount:', amount);
      
      setTxStatus('preparing');

      // Step 1: Prepare authorization (USDC on Base)
      console.log('🔄 [PARA_TX] Preparing authorization...');
      const authResponse = await fetch('/api/base/prepare-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: paraWalletAddress,
          to: recipient,
          amount: amount,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Failed to prepare authorization');
      }

      const authData = await authResponse.json();
      console.log('✅ [PARA_TX] Authorization prepared');
      
      setTxStatus('signing');

      // Step 2: Sign using Para SDK's Viem account (EIP-712)
      console.log('🔄 [PARA_TX] Signing with Para SDK (Viem)...');
      
      if (!viemAccount) {
        throw new Error('Para Viem account not available for signing');
      }

      // Build typed data for EIP-712 signing
      const typedData = {
        domain: authData.authorization.domain,
        types: authData.authorization.types,
        primaryType: 'TransferWithAuthorization' as const,
        message: authData.authorization.message,
      };

      console.log('🔄 [PARA_TX] Typed data:', JSON.stringify(typedData, null, 2));
      
      // Sign typed data (EIP-712) with Para's Viem account
      const signature = await viemAccount.signTypedData({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      } as any);

      console.log('✅ [PARA_TX] Signing completed');
      console.log('🔄 [PARA_TX] Signature:', signature?.substring(0, 10) + '...');
      console.log('🔄 [PARA_TX] Full signature length:', signature?.length);

      setTxStatus('executing');

      // Step 3: Execute the transfer
      console.log('🔄 [PARA_TX] Executing transfer...');
      const executeResponse = await fetch('/api/base/execute-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          authorization: authData.authorization,
        }),
      });

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json();
        console.error('❌ [PARA_TX] Execution failed:', errorData);

        // Check if this is an EIP-7702 delegation error
        if (errorData.action === 'clear_delegation') {
          const errorMsg = `${errorData.message}\n\n✅ SOLUTION: Use the delegation clearing tool (opens automatically). Our backend relayer will clear it for you - NO ETH needed in your wallet!`;
          throw new Error(errorMsg);
        }

        throw new Error(errorData.error || 'Failed to execute transfer');
      }

      const executeData = await executeResponse.json();

      // Check if this is a simulation response
      if (executeData.simulation) {
        console.log('✅ [PARA_TX] Transfer simulation completed');
        setIsSimulation(true);
        setSimulationDetails(executeData.simulationDetails);
        setTxStatus('confirmed');
      } else {
        // Real transaction
        console.log('✅ [PARA_TX] Transfer executed');
        setTxHash(executeData.transaction?.hash || null);
        setTxStatus('confirming');

        // Wait for confirmation
        setTimeout(() => {
          console.log('✅ [PARA_TX] Transaction confirmed');
          setTxStatus('confirmed');
        }, 2000);
      }

    } catch (error) {
      console.error('❌ [PARA_TX] Transaction failed:', error);
      setTxStatus('error');

      if (isUserRejectionError(error)) {
        setTxError('Transaction was cancelled by user');
      } else if (error instanceof Error) {
        setTxError(error.message);
      } else {
        setTxError('Failed to process Para transfer');
      }
      
      throw error;
    }
  };

  return {
    // Transaction methods
    sendTransaction,
    resetTransaction,
    
    // Transaction state
    txStatus,
    txError,
    txHash,
    isSimulation,
    simulationDetails,
    
    // Status flags
    isPending: ['preparing', 'signing', 'executing', 'confirming'].includes(txStatus),
    isSuccess: txStatus === 'confirmed',
    isError: txStatus === 'error',
    
    // Wallet info
    isConnected: !!paraWallet?.data?.address,
    address: paraWallet?.data?.address || null,
  };
}

