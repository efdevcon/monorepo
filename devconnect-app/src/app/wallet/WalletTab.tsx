'use client';

import { useAppKit } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { useState, useEffect } from 'react';
import { getNetworkConfig, getNetworkLogo } from '@/config/networks';
import { useNetworkSwitcher } from '@/hooks/useNetworkSwitcher';
import NetworkLogo from '@/components/NetworkLogo';
import NetworkModal from '@/components/NetworkModal';
import WalletModal from '@/components/WalletModal';
import ReceiveModal from '@/components/ReceiveModal';
import { toast } from 'sonner';
import { useLocalStorage } from 'usehooks-ts';
import PaymentModal from '@/components/PaymentModal';
import { fetchAuth } from '@/services/apiClient';

// Image assets from local public/images directory
const imgPara = '/images/paraLogo.png';
const imgSend = '/images/imgSend.svg';
const imgCallReceived = '/images/imgCallReceived.svg';
const imgSwapVert = '/images/imgSwapVert.svg';
const imgQrCodeScanner = '/images/imgQrCodeScanner.svg';
const imgGroup = '/images/imgGroup.svg';
const imgGroup1 = '/images/imgGroup1.svg';
const imgKeyboardArrowDown = '/images/imgKeyboardArrowDown.svg';
const imgDevconnectLogo = '/images/Devconnect-Logo-Square.svg';
const imgPeanutLogo = '/images/peanut-logo.svg';
const imgEnsLogo = '/images/ens-logo.svg';

// Types for stored payment info
type StoredPaymentInfo = {
  paymentId: string;
  amount: string;
  token: string;
  chainId: number;
  txHash: string | null;
  timestamp: number;
  orderId?: string;
  recipient?: string;
  connectedAddress?: string;
};

type StoredPayments = {
  [paymentId: string]: StoredPaymentInfo;
};

export default function WalletTab() {
  const { open } = useAppKit();
  const router = useRouter();
  const {
    address,
    isPara,
    isDisconnecting,
    para,
    eoa,
    chainId,
    identity,
    identityLoading,
    portfolio, // Current address's portfolio
    portfolioCache, // All cached portfolios by address (e.g., portfolioCache[address])
    portfolioLoading,
    portfolioError,
    isConnected,
    refreshPortfolio,
    email,
    paraEmail,
    supabaseEmail,
    isAuthenticated,
  } = useWallet();
  const { currentChainId, getCurrentNetwork, switchToNetwork } =
    useNetworkSwitcher();

  // Use manager-level isDisconnecting for consistent UI control
  const shouldShowDisconnecting = isDisconnecting;

  // Debug logging for disconnecting state
  useEffect(() => {
    if (para.isDisconnecting || eoa.isDisconnecting) {
      console.log('🔄 [WALLET_TAB] Disconnecting state:', {
        shouldShowDisconnecting,
        paraIsDisconnecting: para.isDisconnecting,
        eoaIsDisconnecting: eoa.isDisconnecting,
        paraIsConnected: para.isConnected,
        eoaIsConnected: eoa.isConnected,
        calculation: {
          'para.isDisconnecting': para.isDisconnecting,
          'eoa.isDisconnecting && !para.isConnected':
            eoa.isDisconnecting && !para.isConnected,
          result:
            para.isDisconnecting || (eoa.isDisconnecting && !para.isConnected),
        },
      });
    }
  }, [
    shouldShowDisconnecting,
    para.isDisconnecting,
    eoa.isDisconnecting,
    para.isConnected,
    eoa.isConnected,
  ]);

  // UI state
  const [activeTab, setActiveTab] = useState<'assets' | 'activity'>('assets');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null
  );
  const [addressCopied, setAddressCopied] = useState(false);

  // Load stored payments from localStorage
  const [storedPayments] = useLocalStorage<StoredPayments>(
    'devconnect-payments',
    {}
  );

  // Debug logging - track if component is receiving props
  console.log('🏠 [WALLET_TAB] Component render:', {
    address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
    fullAddress: address,
    isPara,
    hasIdentity: !!identity,
    hasPortfolio: !!portfolio,
    email,
    paraEmail,
    supabaseEmail,
    isAuthenticated,
    para,
  });

  // Debug logging for wallet state changes
  useEffect(() => {
    console.log('🏠 [WALLET_TAB] Wallet state update (useEffect):', {
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      fullAddress: address,
      isPara,
      identity: identity
        ? { name: identity.name, hasAvatar: !!identity.avatar }
        : null,
      portfolio: portfolio
        ? {
            totalValue: portfolio.totalValue,
            assetsCount: portfolio.tokenBalances.length,
            activityCount: portfolio.recentActivity.length,
          }
        : null,
      portfolioLoading,
      portfolioError,
    });
  }, [address, isPara, identity, portfolio, portfolioLoading, portfolioError]);

  const handleSendClick = () => {
    if (isPara) {
      alert('TODO: Send tokens with Para');
    } else {
      open({ view: 'WalletSend' });
    }
  };

  const handleSwapClick = () => {
    open({
      view: 'Swap',
      arguments: {
        amount: '10',
        fromToken: 'USDC',
        toToken: 'ETH',
      },
    });
  };

  const handleScanClick = () => {
    router.push('/scan');
  };

  const handleReceiveClick = () => {
    setShowReceiveModal(true);
  };

  const handleDigitalClick = () => {
    router.push('/wallet/digital-onramp');
  };

  const handleInPersonClick = () => {
    router.push('/wallet/in-person-onramp');
  };

  const handleViewMoreActivity = () => {
    setShowAllActivity(!showAllActivity);
  };

  const handleViewMoreAssets = () => {
    setShowAllAssets(!showAllAssets);
  };

  // Handle Peanut claim
  const handlePeanutClaim = async () => {
    // Open popup immediately with blank URL (prevents mobile popup blockers)
    const popup = window.open('about:blank', '_blank', 'width=470,height=750');

    if (!popup) {
      toast.error('Popup Blocked', {
        description: 'Please allow popups for this site',
        duration: 4000,
      });
      return;
    }

    try {
      const response = await fetchAuth<{ link: string; message: string }>(
        '/api/auth/claim-peanut'
      );

      if (response.success && response.data?.link) {
        // add address to the link
        const linkWithAddress = `${response.data.link?.replace('?', `?address=${address}&tokenAddress=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&chainId=8453&event=devconnect&`)}`;
        console.log('linkWithAddress', linkWithAddress);
        // Navigate popup to the actual URL
        popup.location.href = linkWithAddress;
        toast.success('Claim link opened in new tab');
      } else {
        // Handle error - show user-friendly message
        const errorMessage = response.error || 'Failed to access claim link';

        // Close the popup
        popup.close();

        // Check if it's an authorization error
        if (
          errorMessage.includes('Not authorized') ||
          errorMessage.includes('not eligible')
        ) {
          toast.error('This perk is not available for your account', {
            description: 'Only eligible users can claim this reward',
            duration: 5000,
          });
        } else {
          toast.error('Unable to open claim link', {
            description: errorMessage,
            duration: 4000,
          });
        }

        console.error('Peanut claim error:', errorMessage);
      }
    } catch (error) {
      console.error('Peanut claim exception:', error);

      // Show error message in popup
      if (popup && !popup.closed) {
        popup.document.write(`
          <html>
            <head>
              <title>Error</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  margin: 0; 
                  background: #f5f5f5;
                }
                .error-container {
                  text-align: center;
                  padding: 2rem;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .error-title { color: #dc2626; margin-bottom: 1rem; }
                .error-message { color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="error-container">
                <h2 class="error-title">Connection Error</h2>
                <p class="error-message">Failed to retrieve claim link. Please try again or refresh the page.</p>
              </div>
            </body>
          </html>
        `);
      }

      toast.error('Failed to retrieve claim link', {
        description: 'Please try again',
        duration: 4000,
      });
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPortfolio();
    setIsRefreshing(false);
  };

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
      toast.success('Address copied to clipboard', {
        description: address,
      });
    }
  };

  // Format USD value
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format token balance
  const formatBalance = (balance: number, symbol: string) => {
    if (balance === 0) return '0';

    const absBalance = Math.abs(balance);
    if (absBalance >= 1e9) {
      return `${(balance / 1e9).toFixed(2)}B ${symbol}`;
    } else if (absBalance >= 1e6) {
      return `${(balance / 1e6).toFixed(2)}M ${symbol}`;
    } else if (absBalance >= 1e3) {
      return `${(balance / 1e3).toFixed(2)}K ${symbol}`;
    } else {
      return `${balance.toFixed(4)} ${symbol}`;
    }
  };

  // Format timestamp for activity
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate transaction hash
  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Find stored order for a transaction hash
  const findOrderForTxHash = (txHash: string): StoredPaymentInfo | null => {
    if (!txHash || !storedPayments) return null;

    // Search through all stored payments to find one with matching tx hash
    for (const paymentId in storedPayments) {
      const payment = storedPayments[paymentId];
      if (
        payment.txHash &&
        payment.txHash.toLowerCase() === txHash.toLowerCase()
      ) {
        return payment;
      }
    }
    return null;
  };

  // Handle viewing order details
  const handleViewOrder = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setShowPaymentModal(true);
  };

  // Show disconnecting state FIRST (before checking address)
  // This prevents showing "Connect Your Wallet" during disconnect
  if (shouldShowDisconnecting) {
    return (
      <div className="bg-[#f6fafe] min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <div className="text-[#242436] text-xl font-semibold">
              Disconnecting wallet...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen when not connected
  if (!para.isConnected && !eoa.isConnected) {
    return (
      <div className="bg-[#f6fafe] min-h-screen w-full flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-[#242436] text-2xl font-bold tracking-[-0.1px]">
              Connect Your Wallet
            </h1>
            <p className="text-[#36364c] text-base">
              Connect your wallet to access your portfolio and manage your
              assets
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
    <div className="bg-[#f6fafe] min-h-screen w-full">
      {/* Main Content */}
      <div className="px-6 pt-6 space-y-6">
        {/* Profile Section */}
        <div className="space-y-4">
          {/* Profile Info */}
          <div className="space-y-1 text-center" key={address || 'no-address'}>
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-[1px] relative">
              {/* Network Status - positioned on the left */}
              <div className="absolute left-0 flex items-center gap-1 px-2 py-1 rounded">
                {isPara ? (
                  // Show Base network icon when connected with Para
                  <div className="flex items-center gap-1 p-1">
                    <NetworkLogo chainId={8453} size="sm" />
                  </div>
                ) : (
                  // Show network selector for external wallets
                  <button
                    onClick={() => setShowNetworkModal(true)}
                    className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <NetworkLogo chainId={currentChainId} size="sm" />
                    <img
                      src={imgKeyboardArrowDown}
                      alt="dropdown"
                      className="w-4 h-4"
                    />
                  </button>
                )}
              </div>

              {/* Wallet Info - centered with dropdown */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (!address) {
                      router.push('/onboarding');
                    } else {
                      setShowWalletModal(true);
                    }
                  }}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {identity?.avatar ? (
                    <img
                      src={identity.avatar}
                      alt="avatar"
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <img src={imgPara} alt="checkbox" className="w-5 h-5" />
                  )}
                  <span className="text-[#242436] text-base font-normal">
                    {address
                      ? identity?.name ||
                        `${address.slice(0, 6)}...${address.slice(-4)}`
                      : 'Not connected'}
                  </span>
                  <img
                    src={imgKeyboardArrowDown}
                    alt="dropdown"
                    className="w-4 h-4"
                  />
                </button>
                {address && (
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 hover:bg-gray-100 rounded transition-colors relative"
                    title={addressCopied ? 'Copied!' : 'Copy address'}
                  >
                    {addressCopied ? (
                      <svg
                        className="w-4 h-4 text-green-600"
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
                    ) : (
                      <svg
                        className="w-4 h-4 text-[#36364c]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Email Display */}
            {email && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <svg
                  className="w-4 h-4 text-[#36364c]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-[#36364c] text-sm font-normal">
                  {email}
                </span>
                {paraEmail && supabaseEmail && (
                  <span className="text-[#8b8b99] text-xs">
                    {isPara ? '(Para)' : ''}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <span className="text-[#242436] text-[36px] font-bold tracking-[-0.1px]">
                {portfolioLoading ? (
                  <div className="animate-pulse bg-gray-200 h-9 w-32 rounded"></div>
                ) : portfolio ? (
                  formatUSD(portfolio.totalValue)
                ) : (
                  '$0.00'
                )}
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || portfolioLoading || !address}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Refresh portfolio data"
              >
                <svg
                  className={`w-5 h-5 text-[#36364c] ${isRefreshing || portfolioLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              <button
                onClick={handleSendClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-4 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgSend} alt="send" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">
                Send
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <button
                onClick={handleReceiveClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-4 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgCallReceived} alt="receive" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">
                Receive
              </span>
            </div>
            {/* <div className="flex-1 flex flex-col items-center gap-2">
              <button
                onClick={handleSwapClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-4 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgSwapVert} alt="swap" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">
                Swap
              </span>
            </div> */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <button
                onClick={handleScanClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-4 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgQrCodeScanner} alt="scan" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">
                Scan
              </span>
            </div>
          </div>
        </div>

        {/* My Perks Section */}
        <div className="flex flex-col gap-4">
          <p className="text-[#20202b] text-[18px] font-bold tracking-[-0.1px] leading-[1.2]">
            My Perks
          </p>

          {/* Peanut Claim Card */}
          <div
            className="bg-white p-4 flex flex-col gap-4 items-center w-full"
            style={{
              boxShadow: '4px 4px 0px black',
              outline: '1px black solid',
              outlineOffset: '-1px',
            }}
          >
            <button
              onClick={handlePeanutClaim}
              className="w-full bg-[#ff91e9] rounded-[1px] px-6 py-3 flex items-center justify-center gap-2 hover:bg-[#ff7de3] transition-colors cursor-pointer"
              style={{
                outline: '1px black solid',
                outlineOffset: '-1px',
              }}
            >
              <p className="text-black text-[16px] font-bold leading-4">
                Claim $3 (USDC)
              </p>
              <svg
                className="w-3.5 h-3.5 text-black flex-shrink-0"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7h8m0 0L7 3m4 4l-4 4"
                />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <p className="text-black text-[12px] font-normal leading-[15.6px]">
                Sponsored by
              </p>
              <img
                src={imgPeanutLogo}
                alt="Peanut"
                className="h-5 w-[82px] object-contain"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML +=
                    '<span class="text-black text-xs font-bold">Peanut</span>';
                }}
              />
            </div>
          </div>

          {/* ENS Claim Card */}
          <div className="bg-white border border-[#0080bc] rounded-[12px] p-4 flex flex-col gap-4 items-center">
            <button
              onClick={() => {
                // TODO: Implement ENS claim functionality
                alert('ENS claim coming soon!');
              }}
              className="w-full bg-[#247cff] rounded-[6px] px-6 py-3 flex items-center justify-center gap-2 hover:bg-[#1a69e6] transition-colors cursor-pointer"
            >
              <p className="text-white text-[16px] font-bold leading-none">
                Claim worldfair.eth name
              </p>
              <svg
                className="w-3.5 h-3.5 text-white flex-shrink-0"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7h8m0 0L7 3m4 4l-4 4"
                />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <p className="text-[#093c52] text-[12px] font-normal leading-[1.3]">
                Sponsored by
              </p>
              <img
                src={imgEnsLogo}
                alt="ENS"
                className="h-5 w-[62px] object-contain"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML +=
                    '<span class="text-[#093c52] text-xs font-bold">ENS</span>';
                }}
              />
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="space-y-1">
          {/* Tabs */}
          <div className="bg-[#e5f1fb] p-1 rounded-[2px] flex gap-2">
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex-1 px-3 py-1.5 rounded-[1px] transition-colors cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-white shadow-[0px_1px_2px_0px_rgba(54,54,76,0.15)]'
                  : ''
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  activeTab === 'assets' ? 'text-[#165a8d]' : 'text-[#4b4b66]'
                }`}
              >
                Assets
              </span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-3 py-1.5 rounded-[2px] transition-colors cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-white shadow-[0px_1px_2px_0px_rgba(54,54,76,0.15)]'
                  : ''
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  activeTab === 'activity' ? 'text-[#165a8d]' : 'text-[#4b4b66]'
                }`}
              >
                Activity
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="bg-white border border-[#f0f0f4] rounded-[2px] p-5 space-y-6">
            {activeTab === 'assets' ? (
              <>
                <h3 className="text-[#242436] text-lg font-bold tracking-[-0.1px]">
                  My Assets
                </h3>

                <div className="space-y-4">
                  {portfolioLoading ? (
                    // Loading skeleton
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="animate-pulse bg-gray-200 w-[41px] h-10 rounded"></div>
                            <div className="space-y-1">
                              <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                              <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                            </div>
                          </div>
                          <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                        </div>
                      ))}
                    </>
                  ) : portfolioError ? (
                    <div className="text-center py-4">
                      <p className="text-red-500 text-sm">
                        Failed to load assets
                      </p>
                      <button
                        onClick={handleRefresh}
                        className="text-blue-500 text-sm underline mt-2"
                      >
                        Retry
                      </button>
                    </div>
                  ) : portfolio && portfolio.tokenBalances.length > 0 ? (
                    // Dynamic assets from portfolio data
                    portfolio.tokenBalances
                      .slice(
                        0,
                        showAllAssets ? portfolio.tokenBalances.length : 3
                      )
                      .map((token, index) => (
                        <div
                          key={`${token.tokenAddress}-${index}`}
                          className="flex items-center gap-4"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="relative">
                              {token.imgUrlV2 ? (
                                <img
                                  src={token.imgUrlV2}
                                  alt={token.symbol}
                                  className="w-[41px] h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-[41px] h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {token.symbol[0]}
                                  </span>
                                </div>
                              )}
                              {/* Network logo overlay */}
                              {token.chainId && (
                                <img
                                  src={getNetworkLogo(token.chainId)}
                                  alt={getNetworkConfig(token.chainId).name}
                                  className="absolute -top-1 -left-1 w-4 h-4 rounded-full border border-white"
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="text-[#36364c] text-base font-bold">
                                {token.symbol}
                              </div>
                              <div className="text-[#4b4b66] text-sm font-normal">
                                {formatBalance(token.balance, token.symbol)}
                              </div>
                            </div>
                          </div>
                          <div className="text-[#242436] text-sm font-normal tracking-[-0.1px] w-[52px] text-right">
                            {formatUSD(token.balanceUSD)}
                          </div>
                        </div>
                      ))
                  ) : (
                    // No assets found
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">No assets found</p>
                    </div>
                  )}
                </div>

                {/* View More Assets Button */}
                {portfolio && portfolio.tokenBalances.length > 3 && (
                  <div className="bg-[#eaf3fa] border border-white shadow-[0px_4px_0px_0px_#595978] rounded-[1px] px-6 py-3 flex items-center justify-center">
                    <button
                      onClick={handleViewMoreAssets}
                      className="text-[#36364c] text-base font-bold cursor-pointer"
                    >
                      {showAllAssets ? 'Show Less Assets' : 'View More Assets'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-[#242436] text-lg font-bold tracking-[-0.1px]">
                  Recent Activity
                </h3>

                <div className="space-y-3">
                  {portfolioLoading ? (
                    // Loading skeleton for activity
                    <>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : portfolioError ? (
                    <div className="text-center py-4">
                      <p className="text-red-500 text-sm">
                        Failed to load activity
                      </p>
                      <button
                        onClick={handleRefresh}
                        className="text-blue-500 text-sm underline mt-2"
                      >
                        Retry
                      </button>
                    </div>
                  ) : portfolio &&
                    portfolio.recentActivity.filter(
                      (activity) => activity.transaction?.hash
                    ).length > 0 ? (
                    // Dynamic activity from portfolio data
                    portfolio.recentActivity
                      .filter((activity) => activity.transaction?.hash) // Only show activities with hash
                      .slice(
                        0,
                        showAllActivity
                          ? portfolio.recentActivity.filter(
                              (activity) => activity.transaction?.hash
                            ).length
                          : 3
                      )
                      .map((activity, index) => {
                        const hash = activity.transaction?.hash;
                        const timestamp = activity.transaction?.timestamp;
                        const chainId = activity.transaction?.chainId;
                        const networkConfig = chainId
                          ? getNetworkConfig(chainId)
                          : null;
                        const readableNetwork =
                          networkConfig?.name || 'Unknown Network';
                        const description =
                          activity.interpretation?.processedDescription;

                        // Check if this transaction matches a stored order
                        const matchedOrder = hash
                          ? findOrderForTxHash(hash)
                          : null;

                        return (
                          <div key={`${hash}-${index}`} className="space-y-2">
                            <div
                              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                              onClick={() => {
                                if (hash && chainId) {
                                  // Get explorer URL dynamically from network config
                                  const networkConfig =
                                    getNetworkConfig(chainId);
                                  const explorerUrl =
                                    networkConfig?.blockExplorers?.default?.url;
                                  if (explorerUrl) {
                                    window.open(
                                      `${explorerUrl}/tx/${hash}`,
                                      '_blank'
                                    );
                                  }
                                }
                              }}
                            >
                              <div className="w-full">
                                <div className="w-full">
                                  {description && (
                                    <p className="font-medium text-sm mb-1 text-[#36364c]">
                                      {description}
                                    </p>
                                  )}
                                  {hash && (
                                    <p className="text-xs text-gray-600 font-mono mb-1">
                                      {truncateHash(hash)} ↗
                                    </p>
                                  )}
                                  {chainId && timestamp && (
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="flex items-center gap-1">
                                        {getNetworkLogo(chainId) && (
                                          <img
                                            src={getNetworkLogo(chainId)}
                                            alt={readableNetwork}
                                            className="w-3 h-3 rounded-full"
                                          />
                                        )}
                                        <p className="text-xs text-[#4b4b66]">
                                          {readableNetwork}
                                        </p>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        {formatTimestamp(timestamp)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Devconnect Order Banner */}
                              {matchedOrder && (
                                <div
                                  className="bg-[#eaf4fb] flex gap-3 items-center p-3 rounded cursor-pointer hover:bg-[#d5e7f4] transition-colors mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewOrder(matchedOrder.paymentId);
                                  }}
                                >
                                  <div className="w-7 h-7 flex-shrink-0">
                                    <img
                                      src={imgDevconnectLogo}
                                      alt="Devconnect"
                                      className="w-full h-full"
                                    />
                                  </div>
                                  <div className="flex-1 flex flex-col gap-1">
                                    <p
                                      className="text-[11px] font-medium text-[#4b4b66] tracking-[0.2px]"
                                      style={{
                                        fontFamily: 'Roboto, sans-serif',
                                      }}
                                    >
                                      {matchedOrder.orderId
                                        ? `ORDER #${matchedOrder.orderId}`
                                        : 'ORDER'}
                                    </p>
                                    <p
                                      className="text-[14px] leading-[1.3] text-[#353548] tracking-[-0.1px]"
                                      style={{
                                        fontFamily: 'Roboto, sans-serif',
                                      }}
                                    >
                                      You paid{' '}
                                      <span className="font-bold">
                                        {matchedOrder.amount}{' '}
                                        {matchedOrder.token}
                                      </span>
                                      {' to '}
                                      <span className="font-bold">
                                        {matchedOrder.recipient || 'Devconnect'}
                                      </span>
                                    </p>
                                  </div>
                                  <p
                                    className="text-[14px] font-bold text-[#0073de] tracking-[-0.1px] flex-shrink-0"
                                    style={{ fontFamily: 'Roboto, sans-serif' }}
                                  >
                                    View
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    // No activity found
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">
                        No recent activity found
                      </p>
                    </div>
                  )}
                </div>

                {/* View More Activity Button */}
                {portfolio &&
                  portfolio.recentActivity.filter(
                    (activity) => activity.transaction?.hash
                  ).length > 3 && (
                    <div className="bg-[#eaf3fa] border border-white shadow-[0px_4px_0px_0px_#595978] rounded-[1px] px-6 py-3 flex items-center justify-center">
                      <button
                        onClick={handleViewMoreActivity}
                        className="text-[#36364c] text-base font-bold cursor-pointer"
                      >
                        {showAllActivity
                          ? 'Show Less Activity'
                          : 'View More Activity'}
                      </button>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        {/* Exchange Section */}
        <div className="bg-white border border-[#f0f0f4] rounded-[2px] p-5 space-y-5">
          <div className="space-y-2">
            <h2 className="text-[#242436] text-lg font-bold tracking-[-0.1px]">
              Exchange ARS/USD for Crypto
            </h2>
            <p className="text-[#36364c] text-sm font-normal">
              Fund your Ethereum wallet to fully experience the World's Fair.
              There are two ways to add funds to your wallet:
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleDigitalClick}
                className="flex-1 bg-gradient-to-b from-[#e9f4fc] to-[#d2e9f9] rounded-[2px] p-3 flex flex-col items-center gap-2 hover:from-[#d2e9f9] hover:to-[#b8dff0] transition-colors cursor-pointer"
              >
                <img src={imgGroup} alt="digital" className="w-8 h-8" />
                <div className="text-center">
                  <div className="text-[#36364c] text-sm font-bold">
                    Digital
                  </div>
                  <div className="text-[#4b4b66] text-xs font-medium">
                    Debit/Credit Card
                  </div>
                </div>
              </button>
              <div
                onClick={handleInPersonClick}
                className="flex-1 bg-gradient-to-b from-[#e9f4fc] to-[#d2e9f9] rounded-[2px] p-3 flex flex-col items-center gap-2 hover:from-[#d2e9f9] hover:to-[#b8dff0] transition-colors cursor-pointer"
              >
                <img src={imgGroup1} alt="in-person" className="w-8 h-8" />
                <div className="text-center">
                  <div className="text-[#36364c] text-sm font-bold">
                    In-Person
                  </div>
                  <div className="text-[#4b4b66] text-xs font-medium">
                    Currency & Card
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Switching Modal */}
      <NetworkModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
      />

      {/* Wallet Switching Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        address={address}
        identityName={identity?.name || null}
      />

      {/* Payment Details Modal */}
      {selectedPaymentId && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPaymentId(null);
          }}
          paymentRequestId={selectedPaymentId}
        />
      )}
    </div>
  );
}
