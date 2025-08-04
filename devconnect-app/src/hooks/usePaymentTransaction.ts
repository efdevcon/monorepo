import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi';
import { toast } from 'sonner';

// USDC contract constants
const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_DECIMALS = 6;

// USDC ABI for transfer function
const USDC_ABI = [
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

interface UsePaymentTransactionProps {
  isPara: boolean;
}

export function usePaymentTransaction({ isPara }: UsePaymentTransactionProps) {
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txError, setTxError] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Wallet connection hooks
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Contract write hooks for regular wallets
  const { writeContract, isPending: isWritePending, data: hash } = useWriteContract();
  
  // Transaction receipt hook
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  // Typed data signing for Para wallets
  const { signTypedDataAsync, isPending: isSigningTypedData } = useSignTypedData();

  const resetTransaction = () => {
    setTxStatus('idle');
    setTxError('');
    setTxHash(null);
  };

  const sendRegularTransaction = async (recipient: string, amount: string) => {
    if (!isConnected || !connectedAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      setTxStatus('transfer');
      
      // Convert amount to wei (USDC has 6 decimals)
      const amountNumber = parseFloat(amount);
      const amountWei = BigInt(Math.floor(amountNumber * Math.pow(10, USDC_DECIMALS)));
      
      // Write the contract transaction
      writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, amountWei],
      });
      
    } catch (error) {
      console.error('Regular transfer failed:', error);
      setTxStatus('error');
      setTxError(error instanceof Error ? error.message : 'Failed to initiate transfer');
      throw error;
    }
  };

  const sendParaTransaction = async (recipient: string, amount: string) => {
    if (!isConnected || !connectedAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      setTxStatus('preparing');
      
      // Step 1: Prepare authorization
      const authResponse = await fetch('/api/base/prepare-authorization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: connectedAddress,
          to: recipient,
          amount: amount,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Failed to prepare authorization');
      }

      const authData = await authResponse.json();
      setTxStatus('signing');

      // Step 2: Sign the authorization message
      const signature = await signTypedDataAsync({
        domain: authData.authorization.domain,
        types: authData.authorization.types,
        primaryType: 'TransferWithAuthorization',
        message: authData.authorization.message,
      });

      setTxStatus('executing');

      // Step 3: Execute the transfer
      const executeResponse = await fetch('/api/base/execute-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature,
          authorization: authData.authorization,
        }),
      });

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json();
        throw new Error(errorData.error || 'Failed to execute transfer');
      }

      const executeData = await executeResponse.json();
      setTxHash(executeData.transaction?.hash || null);
      setTxStatus('confirming');

      // For now, we'll simulate confirmation since we're using mock responses
      setTimeout(() => {
        setTxStatus('confirmed');
      }, 2000);

    } catch (error) {
      console.error('Para transfer failed:', error);
      setTxStatus('error');
      setTxError(error instanceof Error ? error.message : 'Failed to process Para transfer');
      throw error;
    }
  };

  const sendTransaction = async (recipient: string, amount: string) => {
    try {
      if (isPara) {
        await sendParaTransaction(recipient, amount);
      } else {
        await sendRegularTransaction(recipient, amount);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  // Handle transaction success/error for regular wallets
  useEffect(() => {
    if (isSuccess && hash && txStatus !== 'confirmed') {
      setTxHash(hash);
      setTxStatus('confirmed');
    }
  }, [isSuccess, hash, txStatus]);

  useEffect(() => {
    if (isError && txStatus !== 'error') {
      setTxStatus('error');
      setTxError('Transaction failed on blockchain');
    }
  }, [isError, txStatus]);

  return {
    sendTransaction,
    txStatus,
    txError,
    txHash,
    resetTransaction,
    isConnected,
    connectedAddress,
    isPending: isWritePending || isSigningTypedData || isConfirming,
  };
} 
