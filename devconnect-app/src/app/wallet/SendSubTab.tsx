'use client';

import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import Icon from '@mdi/react';
import { mdiLockOutline, mdiLoading, mdiContentPaste, mdiQrcodeScan } from '@mdi/js';
import { createPublicClient, http, isAddress } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';
import { APP_CONFIG } from '@/config/config';
import { useTransaction } from '@/hooks/useTransaction';
import { getNetworkConfig } from '@/config/networks';
import { useAlchemyBalance } from '@/hooks/useAlchemyBalance';
import Lottie from 'lottie-react';
import WalletLoadingAnimation from '@/images/Wallet-Loading.json';
import WalletConnectedAnimation from '@/images/Wallet-Connected.json';

// Image assets
const imgPara = '/images/paraLogo.png';
const imgUSDC =
  'https://storage.googleapis.com/zapper-fi-assets/tokens/base/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png';
const imgBase =
  'https://storage.googleapis.com/zapper-fi-assets/networks/base-icon.png';

type SendStep = 'form' | 'status';

export default function SendPage() {
  const { address, isPara, portfolio, triggerDelayedPortfolioRefresh } =
    useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SendStep>('form');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Handle prefilled address from query params (from QR scan)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const toAddress = params.get('to');
      if (toAddress) {
        console.log('Prefilling recipient address from QR scan:', toAddress);
        const normalizedAddress = toAddress.trim().toLowerCase();
        setRecipientAddress(normalizedAddress);
        // Validate the prefilled address
        validateAndResolveAddress(normalizedAddress);
        // Clear the query param
        router.replace('/wallet/send');
      }
    }
  }, []);

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

  // Fetch live balance using Alchemy (Base chain for Para wallets)
  const {
    balance: alchemyBalance,
    loading: balanceLoading,
    error: balanceError,
    getTokenBalance,
  } = useAlchemyBalance(8453); // Base chain

  // Get USDC balance from Alchemy (live) or fallback to portfolio cache
  const usdcBalance = useMemo(() => {
    // Prefer live Alchemy balance
    const liveBalance = getTokenBalance('USDC');
    if (liveBalance !== null) {
      return liveBalance;
    }

    // Fallback to portfolio cache
    if (!portfolio || !address) return 0;
    const usdcToken = portfolio.tokenBalances.find(
      (token) => token.symbol === 'USDC' && token.chainId === 8453 // Base chain
    );
    return usdcToken?.balance || 0;
  }, [getTokenBalance, portfolio, address]);

  const usdcBalanceUSD = useMemo(() => {
    if (!portfolio || !address) return 0;
    const usdcToken = portfolio.tokenBalances.find(
      (token) => token.symbol === 'USDC' && token.chainId === 8453 // Base chain
    );
    return usdcToken?.balanceUSD || 0;
  }, [portfolio, address]);

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const normalizedText = text.trim().toLowerCase();
      setRecipientAddress(normalizedText);
      toast.success('Address pasted', {
        description: normalizedText,
        duration: 2000,
      });

      // Trigger validation/resolution immediately with the pasted text
      await validateAndResolveAddress(normalizedText);
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

  // Validate and resolve address (accepts address as parameter)
  const validateAndResolveAddress = async (addressToValidate: string) => {
    if (!addressToValidate || isResolvingAddress) {
      if (!addressToValidate) {
        setAddressError(null);
      }
      return;
    }

    const trimmedAddress = addressToValidate.trim().toLowerCase();

    // Check if it's an ENS name
    if (trimmedAddress.includes('.')) {
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
          const normalizedResolvedAddress = resolvedAddress.toLowerCase();
          setRecipientAddress(normalizedResolvedAddress);
          setAddressError(null);
          toast.success('ENS name resolved!', {
            description: `${trimmedAddress} → ${normalizedResolvedAddress}`,
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
        setAddressError(
          'Invalid Ethereum address. Please enter a valid address (0x...) or ENS name.'
        );
        toast.error('Invalid address', {
          description:
            'Please enter a valid Ethereum address (0x...) or ENS name',
          duration: 4000,
        });
      } else if (trimmedAddress.length !== 42) {
        setAddressError(
          'Address length incorrect. Ethereum addresses should be 42 characters (including 0x).'
        );
        toast.warning('Address length incorrect', {
          description:
            'Ethereum addresses should be 42 characters (including 0x)',
          duration: 4000,
        });
      } else {
        // Valid address
        setAddressError(null);
      }
    }
  };

  // Wrapper for blur event that uses current state
  const handleAddressBlur = async () => {
    await validateAndResolveAddress(recipientAddress);
  };

  // Handle max amount
  const handleMax = () => {
    setAmount(usdcBalance.toString());
  };

  // Check if address is valid
  const isAddressValid = useMemo(
    () =>
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
  const canSend = useMemo(
    () =>
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

  // Trigger portfolio refresh when transaction is confirmed
  useEffect(() => {
    if (txStatus === 'confirmed' && !isSimulation) {
      console.log(
        '💰 [SEND_TAB] Transaction confirmed, triggering delayed portfolio refresh'
      );
      triggerDelayedPortfolioRefresh(3000);
    }
  }, [txStatus, isSimulation, triggerDelayedPortfolioRefresh]);

  // Early return for no address - AFTER all hooks are called
  if (!address) {
    return (
      <div className="bg-[#f6fafe] w-full flex items-center justify-center px-4">
        <div className="text-center space-y-4 sm:space-y-6 max-w-sm">
          <div className="space-y-2">
            <h1 className="text-[#242436] text-xl sm:text-2xl font-bold tracking-[-0.1px]">
              Connect Your Wallet
            </h1>
            <p className="text-[#36364c] text-sm sm:text-base px-2">
              Connect your wallet to send crypto
            </p>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="bg-[#165a8d] text-white px-6 xs:px-8 py-2.5 xs:py-3 rounded-[4px] font-semibold text-sm xs:text-base hover:bg-[#0f4a73] transition-colors cursor-pointer touch-manipulation"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-full flex flex-col"
      style={{
        backgroundImage:
          'linear-gradient(-7.43299e-07deg, rgba(246, 182, 19, 0.15) 6.8662%, rgba(255, 133, 166, 0.15) 14.794%, rgba(152, 148, 255, 0.15) 22.844%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.975%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      }}
    >
      {/* Header */}
      <div className="bg-white border-b border-[#ededf0] px-4 sm:px-5 py-3 sm:py-2">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={() => router.push('/wallet')}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors cursor-pointer touch-manipulation"
            aria-label="Back to wallet"
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
          <h1 className="text-[#353548] text-base sm:text-lg font-bold tracking-[-0.1px]">
            Send
          </h1>
          <div className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content */}
      {currentStep === 'form' && (
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 max-w-md mx-auto">
          {/* From and To Section */}
          <div className="space-y-3">
            {/* From Field */}
            <div className="flex flex-col xs:flex-row gap-2 xs:gap-5 xs:items-center">
              <p className="text-[#353548] text-sm xs:text-base font-semibold tracking-[-0.1px] whitespace-nowrap">
                From:
              </p>
              <div className="bg-white border border-[#ededf0] rounded-[1px] px-3 py-3 xs:py-4 flex gap-2 items-center flex-1 min-w-0">
                <div className="relative w-4 h-4 flex-shrink-0 rounded-full overflow-hidden">
                  <img
                    src={imgPara}
                    alt="Para"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[#353548] text-xs xs:text-sm font-normal truncate">
                  {formatAddress(address)}{' '}
                  <span className="font-bold">(Para)</span>
                </p>
              </div>
            </div>

            {/* To Field */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[#353548] text-sm xs:text-base font-semibold tracking-[-0.1px] whitespace-nowrap">
                  To:
                </p>
                {!recipientAddress && !isResolvingAddress && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePaste}
                      className="bg-[#0073de] px-3 xs:px-4 py-2 rounded-[1px] text-white text-xs xs:text-sm font-bold hover:bg-[#005bb5] transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5"
                    >
                      <Icon
                        path={mdiContentPaste}
                        size={0.65}
                        className="flex-shrink-0"
                      />
                      <span>Paste</span>
                    </button>
                    <button
                      onClick={() => router.push('/scan')}
                      className="bg-[#eaf3fa] px-3 xs:px-4 py-2 rounded-[1px] text-[#44445d] text-xs xs:text-sm font-bold hover:bg-[#d5e7f4] transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5"
                    >
                      <Icon
                        path={mdiQrcodeScan}
                        size={0.65}
                        className="flex-shrink-0"
                      />
                      <span>Scan</span>
                    </button>
                  </div>
                )}
                {isResolvingAddress && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-[#0073de] border-t-transparent rounded-full"></div>
                    <span className="text-[#0073de] text-xs xs:text-sm font-bold whitespace-nowrap">
                      Resolving...
                    </span>
                  </div>
                )}
                {recipientAddress && !isResolvingAddress && (
                  <button
                    onClick={handleClear}
                    className="bg-[#eaf3fa] px-3 xs:px-4 py-2 rounded-[1px] text-[#44445d] text-xs xs:text-sm font-bold hover:bg-[#d5e7f4] transition-colors cursor-pointer touch-manipulation"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <div className="bg-white border border-[#ededf0] rounded-[1px] px-3 py-3 min-h-[48px]">
                  <textarea
                    value={recipientAddress}
                    onChange={(e) => {
                      // Normalize: trim and lowercase while typing
                      const normalizedValue = e.target.value
                        .trim()
                        .toLowerCase();
                      setRecipientAddress(normalizedValue);
                      // Clear error when user starts typing
                      if (addressError) {
                        setAddressError(null);
                      }
                    }}
                    onPaste={(e) => {
                      // Trigger validation/resolution after paste with actual pasted content
                      setTimeout(() => {
                        const pastedText = e.clipboardData.getData('text');
                        const normalizedText = pastedText.trim().toLowerCase();
                        validateAndResolveAddress(normalizedText);
                      }, 100);
                    }}
                    onBlur={handleAddressBlur}
                    placeholder="Address (0x) or ENS name"
                    disabled={isResolvingAddress}
                    rows={2}
                    className="w-full text-[#353548] text-xs xs:text-sm font-normal outline-none placeholder:text-[#4b4b66] leading-[1.2] disabled:opacity-50 resize-none"
                  />
                </div>
                {addressError && (
                  <p className="text-red-600 text-[10px] xs:text-xs leading-[1.3] px-1">
                    {addressError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[#353548] text-sm xs:text-base font-semibold tracking-[-0.1px]">
              Amount
            </p>

            <div className="space-y-2">
              {/* Amount Input */}
              <div className="bg-white border border-[#ededf0] rounded-[2px] px-3 xs:px-4 py-3 xs:py-4 flex gap-2 xs:gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      // Replace comma with period for international users
                      let value = e.target.value.replace(',', '.');
                      // Only allow numbers and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setAmount(value);
                      }
                    }}
                    placeholder="0"
                    className="w-full text-[#353548] text-lg xs:text-xl font-bold outline-none placeholder:text-[#353548]"
                  />
                </div>
                <div className="flex items-center gap-1.5 xs:gap-2 flex-shrink-0">
                  <button
                    onClick={handleMax}
                    className="text-[#0073de] text-xs xs:text-sm font-bold hover:underline cursor-pointer touch-manipulation"
                  >
                    MAX
                  </button>
                  <span className="text-[#353548] text-lg xs:text-xl font-bold">
                    USDC
                  </span>
                </div>
              </div>

              {/* Token Selection */}
              <div className="bg-white border border-[#ededf0] rounded-[2px] px-3 xs:px-4 py-2.5 xs:py-3 flex gap-2 xs:gap-3 items-center justify-between">
                <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                  <div className="relative w-5 h-5 flex-shrink-0">
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
                  <span className="text-[#353548] text-sm xs:text-base font-normal tracking-[-0.1px] truncate">
                    USDC (Base)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 xs:gap-2 flex-shrink-0">
                  {balanceLoading && (
                    <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  )}
                  <p className="text-[#4b4b66] text-xs xs:text-sm font-normal whitespace-nowrap">
                    <span className="font-bold">Available:</span>{' '}
                    <span className="hidden xs:inline">
                      {usdcBalance.toFixed(6)}
                    </span>
                    <span className="xs:hidden">{usdcBalance.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gas-free notice for Para wallets */}
          {isPara && (
            <div className="bg-[#3a365e] border border-[#f6b613] rounded-[2px] px-3 xs:px-4 py-2.5 xs:py-3 w-full">
              <p className="text-[#ededf0] text-[10px] xs:text-xs font-bold text-center tracking-[-0.1px]">
                <span>Para: </span>
                <span className="font-normal">
                  This transaction is gas-free
                </span>
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirmSend}
            disabled={!canSend}
            className={`w-full px-4 xs:px-6 py-3 xs:py-3.5 rounded-[1px] flex items-center justify-center gap-2 transition-colors shadow-[0px_4px_0px_0px_#0c5039] touch-manipulation ${
              canSend
                ? 'bg-[#137c59] hover:bg-[#0f6347] cursor-pointer active:shadow-[0px_2px_0px_0px_#0c5039] active:translate-y-[2px]'
                : 'bg-[#137c59] opacity-40 cursor-not-allowed'
            }`}
          >
            <Icon
              path={mdiLockOutline}
              size={0.6}
              className="text-white flex-shrink-0"
            />
            <span className="text-white text-sm xs:text-base font-bold text-center leading-tight">
              {amount && parseFloat(amount) > 0
                ? `Confirm and send ${parseFloat(amount).toFixed(2)} USDC`
                : 'Confirm and send'}
            </span>
          </button>
        </div>
      )}

      {/* Transaction Status Step */}
      {currentStep === 'status' && (
        <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-md mx-auto">
          <div className="space-y-4 sm:space-y-6">
            {/* Status Display */}
            {(txStatus === 'preparing' ||
              txStatus === 'signing' ||
              txStatus === 'executing' ||
              txStatus === 'confirming' ||
              txStatus === 'building' ||
              txStatus === 'broadcasting' ||
              txStatus === 'transfer') && (
              <div className="flex flex-col items-center space-y-4">
                {/* Wallet Loading Animation */}
                <div className="w-[200px] h-[200px] sm:w-[280px] sm:h-[280px]">
                  <Lottie
                    animationData={WalletLoadingAnimation}
                    loop={true}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Text content */}
                <div className="space-y-3 w-full text-center">
                  <h3 className="text-[#20202b] text-lg sm:text-xl font-bold tracking-[-0.1px]">
                    Processing transaction
                  </h3>
                  <p className="text-[#353548] text-sm sm:text-base font-normal tracking-[-0.1px]">
                    This should only take a moment...
                  </p>
                </div>

                {/* Transaction details card */}
                <div className="w-full bg-white/70 backdrop-blur-sm border border-white rounded-[2px] p-3 sm:p-4 space-y-3">
                  <div className="text-center space-y-2">
                    <p className="text-[#353548] text-sm sm:text-base font-bold tracking-[-0.1px]">
                      Sending:
                    </p>
                    <p className="text-[#353548] text-sm sm:text-base tracking-[-0.1px]">
                      <span className="font-bold">
                        {amount
                          ? `${parseFloat(amount).toFixed(2)} USDC`
                          : '0 USDC'}
                      </span>{' '}
                      <span className="font-normal">to </span>
                      <span className="font-normal">
                        {formatAddress(recipientAddress)}
                      </span>
                    </p>
                  </div>

                  {/* Gas-free banner for Para */}
                  {isPara && (
                    <div className="bg-[#3a365e] border border-[#f6b613] rounded-[2px] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center gap-2">
                      <span className="text-[#ededf0] text-xs sm:text-sm font-normal tracking-[-0.1px]">
                        ⚡ Gas-free transaction in progress
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {txStatus === 'confirmed' && (
              <div className="flex flex-col items-center space-y-4">
                {/* Wallet Connected Animation */}
                <div className="w-[200px] h-[200px] sm:w-[280px] sm:h-[280px]">
                  <Lottie
                    animationData={WalletConnectedAnimation}
                    loop={false}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Title and description */}
                <div className="space-y-3 w-full text-center">
                  <h3 className="text-[#20202b] text-lg sm:text-xl font-bold tracking-[-0.1px]">
                    Transaction completed!
                  </h3>
                  <p className="text-[#353548] text-sm sm:text-base font-normal tracking-[-0.1px] leading-[1.3]">
                    Your transaction has been confirmed on the blockchain.
                  </p>
                </div>

                {/* Transaction details card */}
                <div className="w-full bg-white/70 backdrop-blur-sm border border-white rounded-[2px] p-3 sm:p-4 space-y-2">
                  <p className="text-[#353548] text-sm sm:text-base font-bold tracking-[-0.1px] text-center">
                    You sent:
                  </p>
                  <p className="text-[#353548] text-sm sm:text-base tracking-[-0.1px] text-center">
                    <span className="font-bold">
                      {amount
                        ? `${parseFloat(amount).toFixed(2)} USDC`
                        : '0 USDC'}
                    </span>{' '}
                    <span className="font-normal">to </span>
                    <span className="font-normal">
                      {formatAddress(recipientAddress)}
                    </span>
                  </p>
                </div>

                {/* Action buttons */}
                <div className="w-full space-y-2">
                  <div className="flex gap-3 w-full">
                    {txHash && (
                      <a
                        href={`${getNetworkConfig(8453).blockExplorers?.default.url}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-[#eaf3fa] hover:bg-[#d5e7f4] transition-colors flex items-center justify-center gap-2 px-4 xs:px-6 py-3 rounded-[1px] text-[#44445d] font-bold text-sm xs:text-base no-underline shadow-[0px_4px_0px_0px_#595978] touch-manipulation"
                      >
                        Transaction
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="flex-shrink-0"
                        >
                          <path d="M12 3.5L12 9.5L10.5 9.5L10.5 5.5L5 11L4 10L9.5 4.5L5.5 4.5L5.5 3L11.5 3C11.7761 3 12 3.22386 12 3.5Z" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={handleDone}
                      className="flex-1 bg-[#0073de] hover:bg-[#005bb5] text-white px-4 xs:px-6 py-3 rounded-[1px] text-sm xs:text-base font-bold transition-colors shadow-[0px_4px_0px_0px_#005493] touch-manipulation"
                    >
                      Return to App
                    </button>
                  </div>

                  {/* User Operation link on separate line */}
                  {userOpHash && (
                    <div className="text-center mt-4">
                      <a
                        href={`https://basescan.org/tx/${userOpHash}?network=base`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0073de] text-xs hover:underline inline-block"
                      >
                        View User Operation (might take a few minutes to be
                        indexed)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {txStatus === 'error' && (
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-7 h-7 sm:w-10 sm:h-10 text-red-600"
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
                <div className="space-y-2 px-2">
                  <h3 className="text-[#20202b] text-lg sm:text-xl font-bold">
                    Transaction Failed
                  </h3>
                  <p className="text-[#353548] text-xs sm:text-sm">
                    {txError ||
                      'An error occurred while processing your transaction'}
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleTryAgain}
                    className="w-full bg-[#0073de] hover:bg-[#005bb5] text-white px-4 xs:px-6 py-3 rounded-[1px] text-sm xs:text-base font-bold transition-colors touch-manipulation"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleDone}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-[#353548] px-4 xs:px-6 py-3 rounded-[1px] text-sm xs:text-base font-bold transition-colors touch-manipulation"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isSimulation && simulationDetails && (
              <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-orange-800 text-[10px] xs:text-xs font-semibold mb-1">
                  ⚠️ Simulation Mode
                </p>
                <p className="text-orange-700 text-[10px] xs:text-xs">
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

