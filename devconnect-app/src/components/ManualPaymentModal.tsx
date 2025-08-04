'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, ModalContent } from 'lib/components/modal';
import { Button } from '@/components/ui/button';
import { CreditCard, Copy, X, ExternalLink, Wallet, AlertCircle } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { toast } from 'sonner';

// USDC contract address on Base
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

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualPaymentModal({ isOpen, onClose }: ManualPaymentModalProps) {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasShownSuccess = useRef(false);

  // Reset success flag when modal opens
  useEffect(() => {
    if (isOpen) {
      hasShownSuccess.current = false;
    }
  }, [isOpen]);
  
  // Wallet connection hooks
  const { address: connectedAddress, isConnected } = useAccount();
  
  // Contract write hooks
  const { writeContract, isPending: isWritePending, data: hash } = useWriteContract();
  
  // Transaction receipt hook
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const handlePay = async () => {
    if (!address.trim()) {
      toast.error('Please enter a valid address');
      return;
    }
    
    // Validate if it's a valid 0x address
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address.trim())) {
      toast.error('Please enter a valid 0x address');
      return;
    }

    // Check if wallet is connected
    if (!isConnected || !connectedAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      
      // Amount: 0.01 USDC (in smallest units)
      const amount = BigInt(0.01 * Math.pow(10, USDC_DECIMALS)); // 0.01 USDC = 10000 wei
      
      // Write the contract transaction
      writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [address.trim() as `0x${string}`, amount],
      });
      
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('Failed to initiate transfer. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle transaction success and error with useEffect
  useEffect(() => {
    if (isSuccess && hash && !hasShownSuccess.current) {
      hasShownSuccess.current = true;
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">
            ✅ Transfer Successful!
          </div>
          <div className="text-sm text-green-700">
            <div>Amount: 0.01 USDC</div>
            <div>To: {address}</div>
            <div className="font-mono text-xs">
              Hash: {hash.slice(0, 6)}...{hash.slice(-4)}
            </div>
          </div>
        </div>,
        {
          duration: 5000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
      setIsLoading(false);
      onClose();
    }
  }, [isSuccess, hash, address, onClose]);

  useEffect(() => {
    if (isError) {
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">
            ❌ Transfer Failed
          </div>
          <div className="text-sm text-red-700">
            The transaction failed. Please check your balance and try again.
          </div>
        </div>,
        {
          duration: 5000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );
      setIsLoading(false);
    }
  }, [isError]);

  const productUrl = 'https://www.pagar.simplefi.tech/6603276727aaa6386588474d/products/688ba8db51fc6c100f32cd63';

  return (
    <Modal open={isOpen} close={onClose} className="p-0">
      <ModalContent className="w-[100vw] max-w-xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manual Payment
          </h2>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Wallet Connection Status */}
          <div className={`rounded-lg p-4 ${
            isConnected 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className={`h-5 w-5 ${
                isConnected ? 'text-green-600' : 'text-yellow-600'
              }`} />
              <h3 className="font-semibold text-lg">
                {isConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
              </h3>
            </div>
            {isConnected ? (
              <p className="text-sm text-green-700">
                Connected: {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
              </p>
            ) : (
              <p className="text-sm text-yellow-700">
                Please connect your wallet to make a payment
              </p>
            )}
          </div>

          {/* Product Link */}
          <div className="bg-gradient-to-r from-green-200 to-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-lg">Product</h3>
            </div>
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
            >
              View Product Details
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Payment Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-lg">Payment Details</h3>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Amount: 0.01 USDC</div>
              <div>Network: Base</div>
            </div>
          </div>

          {/* Address Input */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4" />
              <h3 className="font-semibold">Recipient Address</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter 0x address..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                onClick={handlePaste}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Paste
              </Button>
            </div>
          </div>

          {/* Pay Button */}
          <div className="flex justify-center">
            <Button
              onClick={handlePay}
              disabled={isLoading || isWritePending || isConfirming || !address.trim() || !isConnected}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading || isWritePending || isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {isConfirming ? 'Confirming...' : 'Processing...'}
                </div>
              ) : (
                'Send 0.01 USDC'
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
} 
