import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useSendTransaction, useSwitchChain } from 'wagmi';
import { toast } from 'sonner';
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

interface UsePaymentTransactionProps {
  isPara: boolean;
}

export function usePaymentTransaction({ isPara }: UsePaymentTransactionProps) {
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txError, setTxError] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSimulation, setIsSimulation] = useState<boolean>(false);
  const [simulationDetails, setSimulationDetails] = useState<{
    estimatedGas: string;
    estimatedCost: string;
    gasPrice: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Track which wallet initiated the current transaction
  const [currentTransactionWallet, setCurrentTransactionWallet] = useState<'regular' | 'para' | null>(null);

  // Track if we've already handled errors to prevent loops
  const [hasHandledError, setHasHandledError] = useState(false);

  // Helper function to detect user rejection errors
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

  // Wallet connection hooks
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Network switching hook
  const { switchChain } = useSwitchChain();

  // Contract write hooks for regular wallets
  const { writeContract, isPending: isWritePending, data: hash, error: writeError } = useWriteContract();
  
  // Native token transfer hook
  const { sendTransaction: sendNativeTransaction, isPending: isNativePending, data: nativeHash, error: nativeError } = useSendTransaction();

  // Transaction receipt hook
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash: hash || nativeHash,
  });

  // Typed data signing for Para wallets
  const { signTypedDataAsync, isPending: isSigningTypedData } = useSignTypedData();

  const resetTransaction = () => {
    setTxStatus('idle');
    setTxError('');
    setTxHash(null);
    setIsSimulation(false);
    setSimulationDetails(null);
    setCurrentTransactionWallet(null);
    setHasHandledError(false);
  };

  const sendRegularTransaction = async (recipient: string, amount: string, token?: string, chainId?: number) => {
    if (!isConnected || !connectedAddress) {
      throw new Error('Wallet not connected');
    }

    if (!token || !chainId) {
      throw new Error('Token and chainId are required');
    }

    try {
      console.log('🔄 [REGULAR_TX] Starting regular wallet transaction');
      setCurrentTransactionWallet('regular');
      setTxStatus('preparing');

      // Switch to the selected network if needed
      try {
        await switchChain({ chainId });
        console.log(`Switched to network ${chainId}`);
      } catch (switchError) {
        console.error('Network switch failed:', switchError);
        // Continue with transaction even if network switch fails
        // The user might already be on the correct network
      }

      setTxStatus('transfer');
      
      // Get token information dynamically
      const tokenInfo = getTokenInfo(token, chainId);
      if (!tokenInfo) {
        throw new Error(`Token ${token} not supported on chain ${chainId}`);
      }

      // Convert amount to wei based on token decimals
      const amountNumber = parseFloat(amount);
      const amountWei = BigInt(Math.floor(amountNumber * Math.pow(10, tokenInfo.decimals)));
      
      console.log(`Initiating ${token} transaction on chain ${chainId}...`);
      console.log('Token info:', tokenInfo);

      // For native tokens (ETH), use native transfer
      if ('isNative' in tokenInfo && tokenInfo.isNative) {
        // Handle native token transfer (ETH)
        console.log('Sending native ETH transfer...');

        sendNativeTransaction({
          to: recipient as `0x${string}`,
          value: amountWei,
        });
      } else {
        // Handle ERC-20 token transfer
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

        // Write the contract transaction
        writeContract({
          address: tokenInfo.address as `0x${string}`,
          abi: tokenABI,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, amountWei],
        });
      }
      
      console.log('writeContract called successfully');

    } catch (error) {
      console.error('Regular transfer failed (caught in try-catch):', error);
      setTxStatus('error');

      // Handle user rejection specifically
      if (isUserRejectionError(error)) {
        setTxError('Transaction was cancelled by user');
      } else if (error instanceof Error) {
        setTxError(error.message);
      } else {
        setTxError('Failed to initiate transfer');
      }
      // Don't re-throw the error - let the UI handle it
    }
  };

  const sendParaTransaction = async (recipient: string, amount: string, token?: string, chainId?: number) => {
    if (!isConnected || !connectedAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🔄 [PARA_TX] Starting Para wallet transaction');
      setCurrentTransactionWallet('para');
      setTxStatus('preparing');
      
      // For Para transactions, ensure we're on Base network (8453)
      const baseChainId = 8453;
      try {
        await switchChain({ chainId: baseChainId });
        console.log('Switched to Base network for Para transaction');
      } catch (switchError) {
        console.error('Failed to switch to Base network:', switchError);
        // Continue with transaction - user might already be on Base
      }

      // Step 1: Prepare authorization (hardcoded for Para - USDC on Base)
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

      // Check if this is a simulation response
      if (executeData.simulation) {
        setIsSimulation(true);
        setSimulationDetails(executeData.simulationDetails);
        setTxStatus('confirmed');
      } else {
      // Real transaction
        setTxHash(executeData.transaction?.hash || null);
        setTxStatus('confirming');

        // For now, we'll simulate confirmation since we're using mock responses
        setTimeout(() => {
          setTxStatus('confirmed');
        }, 2000);
      }

    } catch (error) {
      console.error('Para transfer failed:', error);
      setTxStatus('error');

      // Handle user rejection specifically
      if (isUserRejectionError(error)) {
        setTxError('Transaction was cancelled by user');
      } else if (error instanceof Error) {
        setTxError(error.message);
      } else {
        setTxError('Failed to process Para transfer');
      }
      // Don't re-throw the error - let the UI handle it
    }
  };

  const sendTransaction = async (recipient: string, amount: string, token?: string, chainId?: number) => {
    try {
      if (isPara) {
        await sendParaTransaction(recipient, amount, token, chainId);
      } else {
        await sendRegularTransaction(recipient, amount, token, chainId);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      // Don't re-throw - errors are already handled in the individual functions
    }
  };

  // Handle transaction success/error for regular wallets
  useEffect(() => {
    if (isSuccess && (hash || nativeHash) && txStatus !== 'confirmed' && currentTransactionWallet === 'regular') {
      setTxHash(hash || nativeHash || null);
      setTxStatus('confirmed');
    }
  }, [isSuccess, hash, nativeHash, txStatus, currentTransactionWallet]);

  // Handle write contract errors (user rejections, etc.) - only for regular wallet transactions
  useEffect(() => {
    if (writeError && txStatus !== 'error' && currentTransactionWallet === 'regular' && !hasHandledError) {
      console.error('🔄 [REGULAR_TX] Write contract error:', writeError);
      setTxStatus('error');
      setHasHandledError(true);

      if (isUserRejectionError(writeError)) {
        setTxError('Transaction was cancelled by user');
      } else if (writeError instanceof Error) {
        setTxError(writeError.message);
      } else {
        setTxError('Transaction failed');
      }
    } else if (writeError && currentTransactionWallet !== 'regular') {
      console.log('🔄 [IGNORED] Write contract error ignored - not from current transaction wallet:', {
        writeError,
        currentTransactionWallet,
        txStatus
      });
    }
  }, [writeError, txStatus, currentTransactionWallet, hasHandledError]);

  // Handle native transaction errors - only for regular wallet transactions
  useEffect(() => {
    if (nativeError && txStatus !== 'error' && currentTransactionWallet === 'regular' && !hasHandledError) {
      console.error('🔄 [REGULAR_TX] Native transaction error:', nativeError);
      setTxStatus('error');
      setHasHandledError(true);

      if (isUserRejectionError(nativeError)) {
        setTxError('Transaction was cancelled by user');
      } else if (nativeError instanceof Error) {
        setTxError(nativeError.message);
      } else {
        setTxError('Native transaction failed');
      }
    } else if (nativeError && currentTransactionWallet !== 'regular') {
      console.log('🔄 [IGNORED] Native transaction error ignored - not from current transaction wallet:', {
        nativeError,
        currentTransactionWallet,
        txStatus
      });
    }
  }, [nativeError, txStatus, currentTransactionWallet, hasHandledError]);

  // Handle blockchain-level errors - only for regular wallet transactions
  useEffect(() => {
    if (isError && txStatus !== 'error' && currentTransactionWallet === 'regular' && !hasHandledError) {
      console.error('🔄 [REGULAR_TX] Blockchain-level error');
      setTxStatus('error');
      setHasHandledError(true);
      // Note: For regular transactions, the error handling is done in the writeContract call
      // This useEffect handles blockchain-level errors
      setTxError('Transaction failed on blockchain');
    } else if (isError && currentTransactionWallet !== 'regular') {
      console.log('🔄 [IGNORED] Blockchain-level error ignored - not from current transaction wallet:', {
        isError,
        currentTransactionWallet,
        txStatus
      });
    }
  }, [isError, txStatus, currentTransactionWallet, hasHandledError]);

  return {
    sendTransaction,
    txStatus,
    txError,
    txHash,
    isSimulation,
    simulationDetails,
    resetTransaction,
    isConnected,
    connectedAddress,
    isPending: isWritePending || isNativePending || isSigningTypedData || isConfirming,
  };
} 
