'use client';

import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import Icon from '@mdi/react';
import { mdiLockOutline, mdiLoading } from '@mdi/js';
import { createPublicClient, http, isAddress } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';
import { APP_CONFIG } from '@/config/config';
import { useTransaction } from '@/hooks/useTransaction';
import { getNetworkConfig } from '@/config/networks';

// Image assets
const imgPara = '/images/paraLogo.png';
const imgUSDC = 'https://storage.googleapis.com/zapper-fi-assets/tokens/base/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png';
const imgBase = 'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png';

type SendStep = 'form' | 'status';

export default function SendPage() {
  const { address, isPara, portfolio } = useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SendStep>('form');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Transaction hook for Para gas-sponsored transactions
  const {
    sendTransaction,
    txStatus,
    txError,
    txHash,
    userOpHash,
    isSimulation,
    simulationDetails,
    resetTransaction,
    isPending,
  } = useTransaction();

  // Get USDC balance from portfolio (Base chain)
  const usdcBalance = useMemo(() => {
    if (!portfolio || !address) return 0;
    const usdcToken = portfolio.tokenBalances.find(
      (token) =>
        token.symbol === 'USDC' &&
        token.chainId === 8453 // Base chain
    );
    return usdcToken?.balance || 0;
  }, [portfolio, address]);

  const usdcBalanceUSD = useMemo(() => {
    if (!portfolio || !address) return 0;
    const usdcToken = portfolio.tokenBalances.find(
      (token) =>
        token.symbol === 'USDC' &&
        token.chainId === 8453 // Base chain
    );
    return usdcToken?.balanceUSD || 0;
  }, [portfolio, address]);

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipientAddress(text);
      toast.success('Address pasted', {
        description: text,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to paste:', error);
      toast.error('Failed to paste', {
        description: 'Please paste manually or allow clipboard access',
        duration: 3000,
      });
    }
  };

  // Handle clear recipient
  const handleClear = () => {
    setRecipientAddress('');
    setAddressError(null);
    toast.success('Address cleared');
  };

  // Validate and resolve address on blur
  const handleAddressBlur = async () => {
    if (!recipientAddress || isResolvingAddress) {
      if (!recipientAddress) {
        setAddressError(null);
      }
      return;
    }

    const trimmedAddress = recipientAddress.trim();
    
    // Check if it's an ENS name
    if (trimmedAddress.endsWith('.eth')) {
      setIsResolvingAddress(true);
      setAddressError(null);
      
      try {
        toast.info('Resolving ENS name...', {
          description: trimmedAddress,
          duration: 2000,
        });

        const rpcUrl = APP_CONFIG.ALCHEMY_APIKEY
          ? `https://eth-mainnet.g.alchemy.com/v2/${APP_CONFIG.ALCHEMY_APIKEY}`
          : 'https://cloudflare-eth.com'; // Public fallback

        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(rpcUrl),
        });

        const resolvedAddress = await publicClient.getEnsAddress({
          name: normalize(trimmedAddress),
        });

        if (resolvedAddress) {
          setRecipientAddress(resolvedAddress);
          setAddressError(null);
          toast.success('ENS name resolved!', {
            description: `${trimmedAddress} → ${resolvedAddress}`,
            duration: 3000,
          });
        } else {
          setAddressError('ENS name not found. Please check and try again.');
          toast.error('ENS name not found', {
            description: `Could not resolve ${trimmedAddress}`,
            duration: 4000,
          });
        }
      } catch (error) {
        console.error('ENS resolution failed:', error);
        setAddressError('Failed to resolve ENS name. Please try again.');
        toast.error('Failed to resolve ENS name', {
          description: 'Please check the name and try again',
          duration: 4000,
        });
      } finally {
        setIsResolvingAddress(false);
      }
    } else {
      // Validate Ethereum address format
      if (!isAddress(trimmedAddress)) {
        setAddressError('Invalid Ethereum address. Please enter a valid address (0x...) or ENS name.');
        toast.error('Invalid address', {
          description: 'Please enter a valid Ethereum address (0x...) or ENS name',
          duration: 4000,
        });
      } else if (trimmedAddress.length !== 42) {
        setAddressError('Address length incorrect. Ethereum addresses should be 42 characters (including 0x).');
        toast.warning('Address length incorrect', {
          description: 'Ethereum addresses should be 42 characters (including 0x)',
          duration: 4000,
        });
      } else {
        // Valid address
        setAddressError(null);
      }
    }
  };

  // Handle max amount
  const handleMax = () => {
    setAmount(usdcBalance.toString());
  };

  // Check if address is valid
  const isAddressValid = useMemo(() => 
    recipientAddress &&
    !addressError &&
    !isResolvingAddress &&
    isAddress(recipientAddress.trim()) &&
    recipientAddress.trim().length === 42,
    [recipientAddress, addressError, isResolvingAddress]
  );

  // Handle confirm and send - Para gas-sponsored transaction
  const handleConfirmSend = useCallback(async () => {
    if (!isAddressValid) {
      toast.error('Invalid address', {
        description: 'Please enter a valid Ethereum address',
      });
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', {
        description: 'Please enter a valid amount',
      });
      return;
    }

    if (parseFloat(amount) > usdcBalance) {
      toast.error('Insufficient balance', {
        description: `You only have ${usdcBalance.toFixed(6)} USDC available`,
      });
      return;
    }

    try {
      // Move to status step
      setCurrentStep('status');

      // For Para wallets, always use USDC on Base (8453)
      // This will use gas-sponsored transactions automatically
      const token = 'USDC';
      const chainId = 8453; // Base

      console.log('Sending Para transaction:', {
        recipient: recipientAddress.trim(),
        amount,
        token,
        chainId,
        isPara,
      });

      // Send the transaction (gas-free for Para wallets)
      // Pass 'send' as transaction type for Send page
      await sendTransaction(
        recipientAddress.trim(),
        amount,
        token,
        chainId,
        'send'
      );
    } catch (error) {
      console.error('Transaction failed:', error);
      // Error handling is done through txStatus and txError state
    }
  }, [
    isAddressValid,
    amount,
    usdcBalance,
    recipientAddress,
    isPara,
    sendTransaction,
  ]);

  // Check if send is valid
  const canSend = useMemo(() =>
    isAddressValid &&
    amount &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) <= usdcBalance,
    [isAddressValid, amount, usdcBalance]
  );

  // Format address for display
  const formatAddress = useCallback((addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}....${addr.slice(-5)}`;
  }, []);

  // Format balance for display
  const formatBalance = useCallback((balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  }, []);

  // Handle transaction completion
  const handleDone = useCallback(() => {
    // Reset and go back to wallet
    resetTransaction();
    setCurrentStep('form');
    setRecipientAddress('');
    setAmount('');
    setAddressError(null);
    router.push('/wallet');
  }, [resetTransaction, router]);

  // Handle retry
  const handleTryAgain = useCallback(() => {
    resetTransaction();
    setCurrentStep('form');
  }, [resetTransaction]);

  // Early return for no address - AFTER all hooks are called
  if (!address) {
    return (
      <div className="bg-[#f6fafe] min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-[#242436] text-2xl font-bold tracking-[-0.1px]">
              Connect Your Wallet
            </h1>
            <p className="text-[#36364c] text-base">
              Connect your wallet to send crypto
            </p>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="bg-[#165a8d] text-white px-8 py-3 rounded-[4px] font-semibold text-base hover:bg-[#0f4a73] transition-colors cursor-pointer"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-auto flex-1"
      style={{
        backgroundImage:
          'linear-gradient(-7.43299e-07deg, rgba(246, 182, 19, 0.15) 6.8662%, rgba(255, 133, 166, 0.15) 14.794%, rgba(152, 148, 255, 0.15) 22.844%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.975%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      }}
    >
      {/* Header */}
      <div className="bg-white border-b border-[#ededf0] px-5 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/wallet')}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="#36364c"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-[#353548] text-lg font-bold tracking-[-0.1px]">
            Send
          </h1>
          <div className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content */}
      {currentStep === 'form' && (
        <div className="px-6 py-6 space-y-8">
          {/* From and To Section */}
          <div className="space-y-3">
            {/* From Field */}
            <div className="flex gap-5 items-center">
              <p className="text-[#353548] text-base font-semibold tracking-[-0.1px] whitespace-nowrap">
                From:
              </p>
              <div className="bg-white border border-[#ededf0] rounded-[1px] px-3 py-4 flex gap-2 items-center flex-1">
                <div className="relative w-4 h-4 flex-shrink-0 rounded-full overflow-hidden">
                  <img
                    src={imgPara}
                    alt="Para"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[#353548] text-sm font-normal">
                  {formatAddress(address)}{' '}
                  <span className="font-bold">(Para)</span>
                </p>
              </div>
            </div>

            {/* To Field */}
            <div className="flex gap-5 items-start">
              <p className="text-[#353548] text-base font-semibold tracking-[-0.1px] whitespace-nowrap pt-3">
                To:
              </p>
              <div className="flex-1 space-y-1">
                <div className="bg-white border border-[#ededf0] rounded-[1px] px-3 py-3 flex gap-3 items-center">
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => {
                      setRecipientAddress(e.target.value);
                      // Clear error when user starts typing
                      if (addressError) {
                        setAddressError(null);
                      }
                    }}
                    onBlur={handleAddressBlur}
                    placeholder="Paste address (0x) or ENS"
                    disabled={isResolvingAddress}
                    className="flex-1 text-[#353548] text-sm font-normal outline-none placeholder:text-[#4b4b66] leading-[1.2] disabled:opacity-50"
                  />
                  {isResolvingAddress ? (
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <div className="animate-spin w-3 h-3 border-2 border-[#0073de] border-t-transparent rounded-full"></div>
                      <span className="text-[#0073de] text-xs font-bold">
                        Resolving...
                      </span>
                    </div>
                  ) : recipientAddress ? (
                    <button
                      onClick={handleClear}
                      className="bg-[#eaf3fa] px-3 py-1.5 rounded-[1px] text-[#44445d] text-xs font-bold hover:bg-[#d5e7f4] transition-colors cursor-pointer flex-shrink-0"
                    >
                      Clear
                    </button>
                  ) : (
                    <button
                      onClick={handlePaste}
                      className="bg-[#0073de] px-3 py-1.5 rounded-[1px] text-white text-xs font-bold hover:bg-[#005bb5] transition-colors cursor-pointer flex-shrink-0"
                    >
                      Paste
                    </button>
                  )}
                </div>
                {addressError && (
                  <p className="text-red-600 text-xs leading-[1.3] px-1">
                    {addressError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="space-y-4">
            <p className="text-[#353548] text-base font-semibold tracking-[-0.1px]">
              Amount
            </p>

            <div className="space-y-2">
              {/* Amount Input */}
              <div className="bg-white border border-[#ededf0] rounded-[2px] px-4 py-4 flex gap-3 items-center">
                <div className="flex-1">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full text-[#353548] text-xl font-bold outline-none placeholder:text-[#353548]"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMax}
                    className="text-[#0073de] text-sm font-bold hover:underline cursor-pointer"
                  >
                    MAX
                  </button>
                  <span className="text-[#353548] text-xl font-bold">USDC</span>
                </div>
              </div>

              {/* Token Selection */}
              <div className="bg-white border border-[#ededf0] rounded-[2px] px-4 py-3 flex gap-3 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-5 h-5">
                    <img
                      src={imgUSDC}
                      alt="USDC"
                      className="w-full h-full rounded-full"
                    />
                    {/* Base network indicator */}
                    <img
                      src={imgBase}
                      alt="Base"
                      className="rounded-full absolute -bottom-1 -left-1 w-3 h-3 border border-white"
                    />
                  </div>
                  <span className="text-[#353548] text-base font-normal tracking-[-0.1px]">
                    USDC (Base)
                  </span>
                </div>
                <p className="text-[#4b4b66] text-sm font-normal">
                  <span className="font-bold">Available:</span>{' '}
                  {usdcBalance.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmSend}
            disabled={!canSend}
            className={`w-full px-6 py-3 rounded-[1px] flex items-center justify-center gap-2 transition-colors ${
              canSend
                ? 'bg-[#137c59] hover:bg-[#0f6347] cursor-pointer'
                : 'bg-[#137c59] opacity-40 cursor-not-allowed'
            }`}
          >
            <Icon path={mdiLockOutline} size={0.65} className="text-white" />
            <span className="text-white text-base font-bold">
              Confirm and send
            </span>
          </button>
        </div>
      )}

      {/* Transaction Status Step */}
      {currentStep === 'status' && (
        <div className="px-6 py-6">
          <div className="space-y-6">
            {/* Status Display */}
            {(txStatus === 'preparing' ||
              txStatus === 'signing' ||
              txStatus === 'executing' ||
              txStatus === 'confirming' ||
              txStatus === 'building' ||
              txStatus === 'broadcasting' ||
              txStatus === 'transfer') && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <Icon
                    path={mdiLoading}
                    size={3}
                    className="text-[#0073de] animate-spin"
                  />
                </div>
                <div>
                  <h3 className="text-[#20202b] text-xl font-bold mb-2">
                    Processing Transaction
                  </h3>
                  <p className="text-[#353548] text-sm">
                    Please wait while your transaction is being processed...
                  </p>
                  {isPara && (
                    <p className="text-[#0073de] text-sm mt-2 font-semibold">
                      ⚡ Gas-free transaction in progress
                    </p>
                  )}
                </div>
              </div>
            )}

            {txStatus === 'confirmed' && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-[#20202b] text-xl font-bold mb-2">
                    Transaction Successful!
                  </h3>
                  <p className="text-[#353548] text-sm mb-4">
                    Your transaction has been confirmed on the blockchain
                  </p>
                  {txHash && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#4b4b66]">
                        Transaction Hash:
                      </p>
                      <a
                        href={`${getNetworkConfig(8453).blockExplorers?.default.url}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0073de] text-sm font-mono hover:underline break-all"
                      >
                        {txHash}
                      </a>
                    </div>
                  )}
                  {userOpHash && (
                    <div className="space-y-2 mt-4">
                      <p className="text-xs text-[#4b4b66]">User Operation:</p>
                      <a
                        href={`https://jiffyscan.xyz/userOpHash/${userOpHash}?network=base`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0073de] text-sm font-mono hover:underline break-all"
                      >
                        {userOpHash}
                      </a>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleDone}
                  className="w-full bg-[#137c59] hover:bg-[#0f6347] text-white px-6 py-3 rounded-[1px] font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            {txStatus === 'error' && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-[#20202b] text-xl font-bold mb-2">
                    Transaction Failed
                  </h3>
                  <p className="text-[#353548] text-sm mb-2">
                    {txError ||
                      'An error occurred while processing your transaction'}
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleTryAgain}
                    className="w-full bg-[#0073de] hover:bg-[#005bb5] text-white px-6 py-3 rounded-[1px] font-bold transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleDone}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-[#353548] px-6 py-3 rounded-[1px] font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isSimulation && simulationDetails && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-orange-800 text-xs font-semibold mb-1">
                  ⚠️ Simulation Mode
                </p>
                <p className="text-orange-700 text-xs">
                  This is a test transaction. No real funds will be transferred.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

