'use client';

import { useState } from 'react';
import { useWallet } from '@getpara/react-sdk';
import { useViemAccount } from '@getpara/react-sdk/evm';
import { createWalletClient, http, encodeFunctionData, parseUnits, type Hex, type WalletClient } from 'viem';
import { createModularAccountV2Client } from '@account-kit/smart-contracts';
import { alchemy, base } from '@account-kit/infra';
import { WalletClientSigner } from '@aa-sdk/core';
import { EIP7702_CONFIG } from '@/config/eip7702';
import { para } from '@/config/para';
import { customSignAuthorization, customSignMessage, customSignTypedData } from '@/lib/para-signature-utils';

export type TransactionStatus = 
  | 'idle' 
  | 'preparing' 
  | 'signing' 
  | 'executing' 
  | 'confirming'
  | 'confirmed' 
  | 'error';

interface SimulationDetails {
  estimatedGas: string;
  estimatedCost: string;
  gasPrice: string;
  success: boolean;
  message: string;
}

// USDC ABI (minimal - just the transfer function)
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

/**
 * Para EIP-7702 Transaction Hook
 * 
 * Uses EIP-7702 to temporarily upgrade Para EOA to smart account
 * Leverages Coinbase Paymaster for gas sponsorship
 * 
 * Flow:
 * 1. Para wallet signs EIP-7702 authorization
 * 2. Transaction is sent to Coinbase Paymaster
 * 3. Paymaster sponsors gas and submits to Base
 * 4. Transaction is confirmed on-chain
 */
export function useParaEIP7702Transaction() {
  const paraWallet = useWallet();
  const { viemAccount } = useViemAccount();
  
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txError, setTxError] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [userOpHash, setUserOpHash] = useState<string | null>(null);
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
    setUserOpHash(null);
    setIsSimulation(false);
    setSimulationDetails(null);
  };

  /**
   * Send EIP-7702 transaction with Coinbase Paymaster
   */
  const sendTransaction = async (
    recipient: string,
    amount: string,
    token?: string,
    chainId?: number,
    transactionType?: 'payment' | 'send'
  ) => {
    const paraWalletAddress = paraWallet?.data?.address;

    if (!paraWalletAddress) {
      const error = 'Para wallet not connected';
      setTxStatus('error');
      setTxError(error);
      throw new Error(error);
    }

    if (!viemAccount) {
      const error = 'Para Viem account not available for signing';
      setTxStatus('error');
      setTxError(error);
      throw new Error(error);
    }

    if (!EIP7702_CONFIG.ALCHEMY_RPC_URL || !EIP7702_CONFIG.ALCHEMY_GAS_POLICY_ID) {
      const error = 'Alchemy credentials not configured. Please set NEXT_PUBLIC_ALCHEMY_RPC_URL and NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID';
      setTxStatus('error');
      setTxError(error);
      throw new Error(error);
    }

    try {
      console.log('🔄 [EIP-7702] Starting EIP-7702 transaction with Alchemy Account Kit');
      console.log('🔄 [EIP-7702] From:', paraWalletAddress);
      console.log('🔄 [EIP-7702] To:', recipient);
      console.log('🔄 [EIP-7702] Amount:', amount, 'USDC');
      
      setTxStatus('preparing');

      // Step 1: Extend Para's viem account with signAuthorization for EIP-7702
      console.log('🔄 [EIP-7702] Preparing Para account for EIP-7702...');
      
      // Para's viemAccount needs custom signing methods for EIP-7702
      // Override all signing methods to use Para's custom utilities
      const extendedAccount = {
        ...viemAccount,
        
        // EIP-7702 authorization signing using Para's custom utilities
        signAuthorization: async (authorization: any) => {
          console.log('🔄 [EIP-7702] Signing EIP-7702 authorization with Para custom utilities...');
          console.log('🔍 [EIP-7702] Authorization object:', authorization);
          
          try {
            const signedAuth = await customSignAuthorization(para, authorization);
            
            console.log('✅ [EIP-7702] Authorization signed successfully!');
            console.log('✅ [EIP-7702] Signature:', {
              r: signedAuth.r,
              s: signedAuth.s,
              yParity: signedAuth.yParity,
            });
            
            return signedAuth;
          } catch (error) {
            console.error('❌ [EIP-7702] Failed to sign authorization:', error);
            throw new Error(`Failed to sign EIP-7702 authorization: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
        
        // Message signing using Para's custom utilities
        signMessage: async ({ message }: { message: any }) => {
          console.log('🔄 [EIP-7702] Signing message with Para custom utilities...');
          
          try {
            const signature = await customSignMessage(para, message);
            console.log('✅ [EIP-7702] Message signed successfully');
            return signature;
          } catch (error) {
            console.error('❌ [EIP-7702] Failed to sign message:', error);
            throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
        
        // Typed data signing using Para's custom utilities
        signTypedData: async (typedData: any) => {
          console.log('🔄 [EIP-7702] Signing typed data with Para custom utilities...');
          
          try {
            const signature = await customSignTypedData(para, typedData);
            console.log('✅ [EIP-7702] Typed data signed successfully');
            return signature;
          } catch (error) {
            console.error('❌ [EIP-7702] Failed to sign typed data:', error);
            throw new Error(`Failed to sign typed data: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
      };

      // Step 2: Create wallet client with extended account
      console.log('🔄 [EIP-7702] Creating Wallet Client with Para account...');
      
      const walletClient: WalletClient = createWalletClient({
        account: extendedAccount as any,
        chain: base, // Use @account-kit/infra's base chain (Alchemy-configured)
        transport: http(EIP7702_CONFIG.ALCHEMY_RPC_URL),
      });

      // Step 3: Wrap wallet client with Alchemy's WalletClientSigner
      const walletClientSigner = new WalletClientSigner(
        walletClient,
        'para' // Source identifier
      );

      console.log('✅ [EIP-7702] Wallet Client Signer created');

      setTxStatus('signing');

      // Step 4: Create Alchemy Modular Account V2 with EIP-7702 mode
      // This will temporarily upgrade the EOA to have smart account features
      console.log('🔄 [EIP-7702] Creating Modular Account V2 with EIP-7702 mode...');
      
      const alchemyClient = await createModularAccountV2Client({
        mode: '7702', // 🔑 This enables EIP-7702 temporary EOA upgrade
        transport: alchemy({
          rpcUrl: EIP7702_CONFIG.ALCHEMY_RPC_URL,
        }),
        chain: base, // Use @account-kit/infra's pre-configured Base chain
        signer: walletClientSigner,
        policyId: EIP7702_CONFIG.ALCHEMY_GAS_POLICY_ID, // Gas sponsorship policy
      });

      console.log('✅ [EIP-7702] Alchemy Modular Account V2 created (mode: 7702)');
      console.log('🔄 [EIP-7702] Account address:', alchemyClient.account.address);

      // Step 5: Encode USDC transfer
      const amountWei = parseUnits(amount, EIP7702_CONFIG.USDC_DECIMALS);
      
      console.log('🔄 [EIP-7702] Encoding USDC transfer...');
      console.log('🔄 [EIP-7702] Amount (wei):', amountWei.toString());
      
      const transferData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, amountWei]
      });

      console.log('🔄 [EIP-7702] Transfer data:', transferData);
      
      setTxStatus('executing');

      // Step 6: Send UserOperation with Alchemy gas sponsorship
      console.log('🔄 [EIP-7702] Sending UserOperation via Alchemy...');
      
      let userOperationResult;
      try {
        // Try without gas multiplier first
        userOperationResult = await alchemyClient.sendUserOperation({
          uo: [{
            target: EIP7702_CONFIG.USDC_CONTRACT,
            data: transferData,
            value: BigInt(0),
          }],
        });
      } catch (error: any) {
        // Check if error is "replacement underpriced"
        const isUnderpricedError = 
          error?.message?.includes('replacement underpriced') ||
          error?.details?.includes('replacement underpriced') ||
          error?.shortMessage?.includes('replacement underpriced');
        
        if (isUnderpricedError) {
          console.log('⚠️  [EIP-7702] Transaction underpriced, retrying with 20% gas increase...');
          
          // Retry with 20% gas buffer
          userOperationResult = await alchemyClient.sendUserOperation({
            uo: [{
              target: EIP7702_CONFIG.USDC_CONTRACT,
              data: transferData,
              value: BigInt(0),
            }],
            overrides: {
              maxPriorityFeePerGas: {
                multiplier: 1.2,
              },
              maxFeePerGas: {
                multiplier: 1.2,
              },
            },
          });
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      console.log('✅ [EIP-7702] UserOperation submitted:', userOperationResult.hash);
      console.log('✅ [EIP-7702] UserOp Hash:', userOperationResult.hash);
      
      setUserOpHash(userOperationResult.hash);
      setTxStatus('confirming');

      // Step 7: Wait for UserOperation to be confirmed
      console.log('🔄 [EIP-7702] Waiting for UserOperation confirmation...');
      
      const txHash = await alchemyClient.waitForUserOperationTransaction(userOperationResult);

      console.log('✅ [EIP-7702] Transaction confirmed:', txHash);
      
      setTxHash(txHash as Hex);
      setTxStatus('confirmed');

      return txHash as Hex;

    } catch (error) {
      console.error('❌ [EIP-7702] Transaction failed:', error);
      setTxStatus('error');

      if (isUserRejectionError(error)) {
        setTxError('Transaction was cancelled by user');
      } else if (error instanceof Error) {
        // Provide more helpful error messages
        let errorMessage = error.message;
        
        if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient USDC balance for transfer';
        } else if (errorMessage.includes('gas policy')) {
          errorMessage = 'Transaction rejected by gas policy. Check Coinbase Paymaster allowlist settings.';
        } else if (errorMessage.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        setTxError(errorMessage);
      } else {
        setTxError('Failed to process EIP-7702 transaction');
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
    userOpHash,
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

