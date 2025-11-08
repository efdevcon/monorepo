'use client';

import { useAppKit } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { useState, useEffect, useMemo } from 'react';
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
import { WalletDisplay, WalletAvatar } from '@/components/WalletDisplay';
import { hasBetaAccess } from '@/utils/cookies';
import { RequiresAuthContent } from '@/components/RequiresAuth';
import PullToRefresh from 'react-simple-pull-to-refresh';
import Icon from '@mdi/react';
import {
  mdiSendOutline,
  mdiCallReceived,
  mdiCurrencyUsd,
  mdiQrcodeScan,
  mdiCached,
  mdiChevronDown,
  mdiContentCopy,
  mdiCheck,
  mdiEmail,
  mdiWalletPlusOutline,
  mdiWalletOutline,
  mdiSwapHorizontal,
} from '@mdi/js';

// Image assets from local public/images directory
const imgPara = '/images/paraLogo.png';
const imgOnrampDigital = '/images/onramp-digital.svg';
const imgOnrampCash = '/images/onramp-cash.svg';
const imgDevconnectLogo = '/images/Devconnect-Logo-Square.svg';
const imgPeanutLogo = '/images/peanut-logo.svg';
const imgEnsLogo = '/images/ens-logo.svg';
const imgZapperLogo = '/images/power-zap-gray.svg';
const imgNoAssetsIcon = '/images/no-assets-icon.svg';
const imgNoActivityIcon = '/images/no-activity-icon.svg';

// Types for stored payment info
type StoredPaymentInfo = {
  paymentId: string;
  amount: string;
  token: string;
  chainId: number;
  txHash: string | null;
  userOpHash?: string | null;
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
  const walletData = useWallet();
  const {
    address,
    isPara,
    isDisconnecting,
    para,
    eoa,
    identity,
    portfolioCache, // All cached portfolios by address (e.g., portfolioCache[address])
    portfolioRefreshTrigger, // Trigger to force useMemo recomputation
    portfolioLoading,
    portfolioError,
    refreshPortfolio,
    triggerDelayedPortfolioRefresh,
    email,
    paraEmail,
    supabaseEmail,
    isAuthenticated,
    hasMultipleWallets,
  } = walletData;

  // Debug: Log hasMultipleWallets value
  // console.log('🎯 [WALLET_TAB] hasMultipleWallets:', hasMultipleWallets);

  // Check if beta mode is enabled (hide features for beta users)
  const isBetaMode = hasBetaAccess();

  // Debug: Log the refresh trigger value received from useWallet
  // console.log('🔍 [WALLET_TAB] Received from useWallet:', {
  //   address: address?.slice(0, 10),
  //   portfolioRefreshTrigger,
  //   portfolioCacheKeys: Object.keys(portfolioCache).length,
  // });

  // Get portfolio for current address from cache
  const portfolio = useMemo(() => {
    const addressKey = address?.toLowerCase();

    // console.log('📊 [WALLET_TAB] Portfolio computing with trigger:', {
    //   addressKey,
    //   refreshTrigger: portfolioRefreshTrigger,
    //   cacheKeys: Object.keys(portfolioCache),
    //   hasAddressInCache: addressKey ? !!portfolioCache[addressKey] : false,
    // });

    const result = addressKey ? portfolioCache[addressKey] || null : null;

    // Deep log the portfolio cache to understand what's happening
    // console.log('📊 [WALLET_TAB] Portfolio computed:', {
    //   address: addressKey,
    //   hasPortfolio: !!result,
    //   totalValue: result?.totalValue,
    //   tokenBalancesCount: result?.tokenBalances?.length,
    //   activityCount: result?.recentActivity?.length,
    //   cacheKeys: Object.keys(portfolioCache),
    //   refreshTrigger: portfolioRefreshTrigger,
    //   recentActivitySample: result?.recentActivity?.slice(0, 3).map((a) => ({
    //     hash: a.transaction?.hash?.slice(0, 10),
    //     timestamp: a.transaction?.timestamp,
    //   })),
    //   peanutClaimingState: result?.peanutClaimingState,
    // });
    return result;
  }, [address, portfolioCache, portfolioRefreshTrigger]);

  // Get peanut claiming state from portfolio
  const peanutClaimingState = portfolio?.peanutClaimingState;
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
  const [refreshTimestamps, setRefreshTimestamps] = useState<number[]>([]);
  const [isPeanutPopupOpen, setIsPeanutPopupOpen] = useState(false);

  // Load stored payments from localStorage
  const [storedPayments] = useLocalStorage<StoredPayments>(
    'devconnect-payments',
    {}
  );

  // Merge stored payments with portfolio activity
  // This ensures locally stored payments appear immediately without waiting for API refresh
  const mergedActivity = useMemo(() => {
    // console.log('🔄 [WALLET_TAB] mergedActivity computing...', {
    //   hasPortfolio: !!portfolio,
    //   portfolioActivityCount: portfolio?.recentActivity?.length,
    //   storedPaymentsCount: Object.keys(storedPayments).length,
    //   storedPaymentsKeys: Object.keys(storedPayments),
    //   storedPaymentsDetails: Object.values(storedPayments).map((p) => ({
    //     paymentId: p.paymentId,
    //     txHash: p.txHash?.slice(0, 10),
    //     timestamp: p.timestamp,
    //     amount: p.amount,
    //   })),
    // });

    if (!portfolio) {
      console.log('⚠️ [WALLET_TAB] No portfolio, returning empty activity');
      return [];
    }

    // Convert stored payments to activity format
    const localPaymentsActivity = Object.values(storedPayments)
      .filter(
        (payment) =>
          payment.txHash &&
          payment.timestamp &&
          payment.connectedAddress?.toLowerCase() === address?.toLowerCase()
      ) // Only payments with txHash and matching connected address
      .map((payment) => ({
        transaction: {
          hash: payment.txHash!,
          timestamp: payment.timestamp,
          chainId: payment.chainId,
        },
        interpretation: {
          processedDescription: `Paid ${payment.amount} ${payment.token}`,
        },
        // Mark as local payment for identification
        isLocalPayment: true,
        paymentId: payment.paymentId,
        userOpHash: payment.userOpHash,
      }));

    // console.log('🔄 [WALLET_TAB] Merging activity:', {
    //   portfolioActivityCount: portfolio.recentActivity?.length || 0,
    //   localPaymentsCount: localPaymentsActivity.length,
    //   localPaymentsHashes: localPaymentsActivity.map((p) =>
    //     p.transaction.hash.slice(0, 10)
    //   ),
    // });

    // Merge with portfolio activity, removing duplicates by hash
    const activityMap = new Map();

    // Add portfolio activity first (from API)
    const portfolioActivity = portfolio.recentActivity || [];
    // console.log('🔄 [WALLET_TAB] Processing portfolio activity:', {
    //   count: portfolioActivity.length,
    //   sample: portfolioActivity.slice(0, 2).map((a) => ({
    //     hash: a.transaction?.hash?.slice(0, 10),
    //     timestamp: a.transaction?.timestamp,
    //   })),
    // });

    portfolioActivity.forEach((activity) => {
      if (activity.transaction?.hash) {
        activityMap.set(activity.transaction.hash.toLowerCase(), {
          ...activity,
          isLocalPayment: false,
        });
      }
    });

    // Add/override with local payments (more recent/accurate)
    localPaymentsActivity.forEach((activity) => {
      activityMap.set(activity.transaction.hash.toLowerCase(), activity);
      // console.log('✅ [WALLET_TAB] Added local payment to activity:', {
      //   hash: activity.transaction.hash.substring(0, 10) + '...',
      //   timestamp: new Date(activity.transaction.timestamp).toISOString(),
      //   paymentId: activity.paymentId,
      // });
    });

    // Convert back to array and sort by timestamp (newest first)
    const merged = Array.from(activityMap.values()).sort((a, b) => {
      const timeA = a.transaction?.timestamp || 0;
      const timeB = b.transaction?.timestamp || 0;
      return timeB - timeA;
    });

    // console.log('✅ [WALLET_TAB] Final merged activity:', {
    //   count: merged.length,
    //   hashes: merged.slice(0, 5).map((a) => ({
    //     hash: a.transaction?.hash?.slice(0, 10),
    //     timestamp: a.transaction?.timestamp,
    //     isLocal: a.isLocalPayment,
    //     paymentId: a.paymentId,
    //   })),
    //   refreshTrigger: portfolioRefreshTrigger,
    // });

    return merged;
  }, [portfolio, storedPayments, portfolioRefreshTrigger]);

  // Debug logging - track if component is receiving props
  // console.log('🏠 [WALLET_TAB] Component render:', {
  //   address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
  //   fullAddress: address,
  //   isPara,
  //   hasIdentity: !!identity,
  //   hasPortfolio: !!portfolio,
  //   email,
  //   paraEmail,
  //   supabaseEmail,
  //   isAuthenticated,
  //   hasMultipleWallets,
  //   para: {
  //     isConnected: para.isConnected,
  //     address: para.address,
  //   },
  //   eoa: {
  //     isConnected: eoa.isConnected,
  //     address: eoa.address,
  //   },
  // });

  // Debug logging for wallet state changes
  // useEffect(() => {
  //   console.log('🏠 [WALLET_TAB] Wallet state update (useEffect):', {
  //     address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
  //     fullAddress: address,
  //     isPara,
  //     identity: identity
  //       ? { name: identity.name, hasAvatar: !!identity.avatar }
  //       : null,
  //     portfolio: portfolio
  //       ? {
  //           totalValue: portfolio.totalValue,
  //           assetsCount: portfolio.tokenBalances.length,
  //           activityCount: portfolio.recentActivity.length,
  //         }
  //       : null,
  //     portfolioLoading,
  //     portfolioError,
  //   });
  // }, [address, isPara, identity, portfolio, portfolioLoading, portfolioError]);

  const handleSendClick = () => {
    if (isPara) {
      router.push('/wallet/send');
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
    router.push('/wallet/onramp');
  };

  const handleInPersonClick = () => {
    router.push('/wallet/onramp#in-person');
    // Use setTimeout to ensure navigation completes before scrolling
    setTimeout(() => {
      const element = document.getElementById('in-person-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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

    // Set popup open state
    setIsPeanutPopupOpen(true);

    // Monitor popup closure and refresh portfolio when closed
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        console.log(
          '🔄 [WALLET_TAB] Peanut popup closed, refreshing portfolio'
        );
        // Wait 2 seconds before changing popup state to closed
        setTimeout(() => {
          setIsPeanutPopupOpen(false);
        }, 5000);
        triggerDelayedPortfolioRefresh(2000);
      }
    }, 500);

    try {
      const response = await fetchAuth<{ link: string; message: string }>(
        '/api/auth/claim-peanut',
        {
          headers: {
            'x-wallet-address': address || '',
          },
        }
      );

      if (response.success && response.data?.link) {
        // add address to the link
        const linkWithAddress = `${response.data.link?.replace('?', `?address=${address}&tokenAddress=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&chainId=8453&campaignTag=devconnect_ba_2025&step=claim&`)}`;
        console.log('linkWithAddress', linkWithAddress);
        // Navigate popup to the actual URL
        popup.location.href = linkWithAddress;
        // toast.success('Claim link opened in new tab');
      } else {
        // Handle error - show user-friendly message
        const errorTitle = response.error || 'Failed to access claim link';
        const errorMessage = response.message || 'Please try again';

        // Close the popup
        popup.close();
        clearInterval(checkPopupClosed);
        setIsPeanutPopupOpen(false);

        // Show error toast with dynamic content from API
        // Use info toast for "already claimed" scenarios
        if (errorTitle.toLowerCase().includes('already claimed')) {
          toast.info(errorTitle, {
            description: errorMessage,
            duration: 5000,
          });
        } else if (
          errorMessage.toLowerCase().includes('add your devconnect ticket')
        ) {
          // Special handling for ticket requirement message with clickable link
          const toastId = toast.error(errorTitle, {
            description: (
              <span>
                Add your devconnect ticket{' '}
                <a
                  href="/tickets"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.dismiss(toastId);
                    router.push('/tickets');
                  }}
                  className="underline font-bold hover:text-blue-600"
                >
                  here
                </a>{' '}
                to claim this perk
              </span>
            ),
            duration: Infinity, // Persistent toast
            cancel: {
              label: 'Close',
              onClick: () => {},
            },
          });
        } else {
          toast.error(errorTitle, {
            description: errorMessage,
            duration: 5000,
          });
        }

        console.error('Peanut claim error:', {
          error: errorTitle,
          message: errorMessage,
        });
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
      } else {
        clearInterval(checkPopupClosed);
        setIsPeanutPopupOpen(false);
      }

      toast.error('Failed to retrieve claim link', {
        description: 'Please try again',
        duration: 4000,
      });
    }
  };

  // Check if we should show BlockExplorer link (more than 2 refreshes in last minute)
  const shouldShowBlockExplorer = useMemo(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 60 seconds
    const recentRefreshes = refreshTimestamps.filter((ts) => ts > oneMinuteAgo);
    return recentRefreshes.length >= 2;
  }, [refreshTimestamps]);

  // Manual refresh function
  const handleRefresh = async () => {
    console.log('🔄 [WALLET_TAB] Manual refresh started for:', address);

    // Track this refresh attempt
    const now = Date.now();
    setRefreshTimestamps((prev) => {
      // Keep only timestamps from the last minute
      const oneMinuteAgo = now - 60000;
      const recentTimestamps = prev.filter((ts) => ts > oneMinuteAgo);
      return [...recentTimestamps, now];
    });

    setIsRefreshing(true);
    try {
      await refreshPortfolio();
      console.log('✅ [WALLET_TAB] Manual refresh completed');
    } catch (error) {
      console.error('❌ [WALLET_TAB] Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
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
      <div
        className="flex-1 w-full flex items-center justify-center"
        style={{
          background:
            'linear-gradient(0deg, rgba(246, 182, 19, 0.15) 6.87%, rgba(255, 133, 166, 0.15) 14.79%, rgba(152, 148, 255, 0.15) 22.84%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.97%), #FFF',
        }}
      >
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
      <RequiresAuthContent
        message="Connect your wallet to access your portfolio and manage your assets."
        asModal={false}
      />
    );
  }

  return (
    <>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent={
          <div className="flex flex-col items-center justify-center py-4 text-[#0073de]">
            <Icon path={mdiCached} size={1.2} className="mb-2" />
            <span className="text-sm font-medium">
              Pull to refresh portfolio
            </span>
          </div>
        }
        refreshingContent={
          <div className="flex flex-col items-center justify-center py-4 text-[#0073de]">
            <Icon path={mdiCached} size={1.2} className="mb-2 animate-spin" />
            <span className="text-sm font-medium">
              Refreshing portfolio balances and perks status...
            </span>
          </div>
        }
        pullDownThreshold={80}
        maxPullDownDistance={120}
        resistance={2}
        className="flex-1 w-full"
      >
        <div className="flex-1 w-full gradient-background">
          {/* Main Content */}
          <div className="px-6 pt-6 space-y-6">
            {/* Profile Section */}
            <div className="space-y-4">
              {/* Profile Info */}
              <div
                className="space-y-1 text-center"
                key={address || 'no-address'}
              >
                <div className="flex items-center justify-center gap-2 py-2 rounded-[1px] relative">
                  {/* Network Status - positioned on the left */}
                  <div className="absolute left-0 flex items-center gap-1 py-1 rounded">
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
                        <Icon
                          path={mdiChevronDown}
                          size={0.7}
                          className="text-[#20202b]"
                        />
                      </button>
                    )}
                  </div>

                  {/* Wallet Info - centered with copy functionality */}
                  <div className="flex items-center">
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
                      <WalletAvatar
                        address={address}
                        fallbackSrc={imgPara}
                        alt="wallet"
                        className="w-5 h-5 rounded-full"
                      />
                    </button>
                    <button
                      onClick={handleCopyAddress}
                      className="px-1 py-1 hover:bg-gray-100 rounded transition-colors"
                      title={
                        addressCopied ? 'Copied!' : 'Click to copy address'
                      }
                    >
                      <WalletDisplay
                        address={address}
                        className="text-[#242436] text-base font-normal"
                      />
                    </button>
                    {address && (
                      <button
                        onClick={handleCopyAddress}
                        className="p-1 hover:bg-gray-100 rounded transition-colors relative"
                        title={addressCopied ? 'Copied!' : 'Copy address'}
                      >
                        {addressCopied ? (
                          <Icon
                            path={mdiCheck}
                            size={0.7}
                            className="text-green-600"
                          />
                        ) : (
                          <Icon
                            path={mdiContentCopy}
                            size={0.7}
                            className="text-[#353548]"
                          />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Add/Switch Wallet Button - positioned on the right */}
                  <div className="absolute right-0 flex items-center gap-1 py-1 rounded">
                    <button
                      onClick={() => setShowWalletModal(true)}
                      className="flex items-center gap-1 py-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {hasMultipleWallets ? (
                        <>
                          <Icon
                            path={mdiWalletOutline}
                            size={0.8}
                            className="text-[#0073de] mr-[-6px]"
                          />
                          <Icon
                            path={mdiSwapHorizontal}
                            size={0.8}
                            className="text-[#0073de]"
                          />
                        </>
                      ) : (
                        <>
                          <Icon
                            path={mdiWalletPlusOutline}
                            size={0.8}
                            className="text-[#0073de]"
                          />
                          <span className="text-[#0073de] text-base font-semibold">
                            Add
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Email Display */}
                {/* {email && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Icon path={mdiEmail} size={0.7} className="text-[#353548]" />
                <span className="text-[#353548] text-sm font-normal">
                  {email}
                </span>
                {paraEmail && supabaseEmail && (
                  <span className="text-[#8b8b99] text-xs">
                    {paraEmail ? '(Para)' : ''}
                  </span>
                )}
              </div>
            )} */}

                <div className="flex items-center justify-center">
                  <div className="relative inline-flex items-center">
                    <span className="text-[#20202b] text-[36px] font-bold tracking-[-0.1px] leading-[1.2]">
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
                      className="absolute left-full ml-[14px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Refresh portfolio data"
                    >
                      <Icon
                        path={mdiCached}
                        size={1}
                        className={`text-[#0073de] ${isRefreshing || portfolioLoading ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* BlockExplorer Link - shown after multiple refreshes */}
                {shouldShowBlockExplorer && address && (
                  <div className="flex items-center justify-center mt-1">
                    <button
                      onClick={() => {
                        // Use Base network (8453) for Para wallet, otherwise use current network
                        const chainId = isPara ? 8453 : currentChainId;
                        const networkConfig = getNetworkConfig(chainId);
                        const baseUrl =
                          networkConfig?.blockExplorers?.default?.url;
                        if (baseUrl && address) {
                          window.open(
                            `${baseUrl}/address/${address}`,
                            '_blank'
                          );
                        }
                      }}
                      className="border border-[#0073de] border-solid flex items-center gap-[2px] px-[8px] py-[6px] rounded-[1px] hover:bg-[#eaf4fb] transition-colors cursor-pointer"
                    >
                      <span className="text-[#0073de] text-[12px] font-medium leading-none">
                        Block Explorer
                      </span>
                      <svg
                        className="w-3 h-3 text-[#0073de]"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 9l6-6m0 0H4.5M9 3v4.5"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-nowrap justify-center gap-2 md:gap-4">
                {/* Receive Button - Always visible */}
                <div
                  className="flex flex-col items-center gap-2 flex-1 md:flex-none md:w-[100px]"
                  style={{ maxWidth: 'min(21vw, 100%)' }}
                >
                  <button
                    onClick={handleReceiveClick}
                    className="bg-white border border-[#f0f0f4] rounded-[4px] p-3 md:p-5 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Icon
                      path={mdiCallReceived}
                      size={1.3}
                      className="text-[#0073de]"
                    />
                  </button>
                  <span className="text-[#353548] text-xs md:text-sm font-medium tracking-[-0.1px]">
                    Receive
                  </span>
                </div>

                {/* Send Button - Only when Para wallet */}
                {isPara && (
                  <div
                    className="flex flex-col items-center gap-2 flex-1 md:flex-none md:w-[100px]"
                    style={{ maxWidth: 'min(21vw, 100%)' }}
                  >
                    <button
                      onClick={handleSendClick}
                      className="bg-white border border-[#f0f0f4] rounded-[4px] p-3 md:p-5 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Icon
                        path={mdiSendOutline}
                        size={1.3}
                        className="text-[#0073de]"
                      />
                    </button>
                    <span className="text-[#353548] text-xs md:text-sm font-medium tracking-[-0.1px]">
                      Send
                    </span>
                  </div>
                )}

                {/* Add Button - Only when not in beta mode */}
                {!isBetaMode && (
                  <div
                    className="flex flex-col items-center gap-2 flex-1 md:flex-none md:w-[100px]"
                    style={{ maxWidth: 'min(21vw, 100%)' }}
                  >
                    <button
                      onClick={handleDigitalClick}
                      className="bg-white border border-[#f0f0f4] rounded-[4px] p-3 md:p-5 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Icon
                        path={mdiCurrencyUsd}
                        size={1.3}
                        className="text-[#0073de]"
                      />
                    </button>
                    <span className="text-[#353548] text-xs md:text-sm font-medium tracking-[-0.1px]">
                      Add
                    </span>
                  </div>
                )}

                {/* Scan Button - Mobile only */}
                <div
                  className="flex flex-col items-center gap-2 flex-1 md:hidden"
                  style={{ maxWidth: '21vw' }}
                >
                  <button
                    onClick={handleScanClick}
                    className="bg-white border border-[#f0f0f4] rounded-[4px] p-3 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Icon
                      path={mdiQrcodeScan}
                      size={1.3}
                      className="text-[#0073de]"
                    />
                  </button>
                  <span className="text-[#353548] text-xs font-medium tracking-[-0.1px]">
                    Scan
                  </span>
                </div>
              </div>
            </div>

            {/* My Perks Section */}

            <>
              <div className="flex flex-col gap-4">
                <p className="text-[#20202b] text-[18px] font-bold tracking-[-0.1px] leading-[1.2]">
                  My Perks
                </p>

                <div className="flex flex-col md:flex-row gap-4">
                  {/* Peanut Claim Card */}
                  <div
                    className="bg-white p-4 flex flex-col gap-4 items-center w-full md:flex-1"
                    style={{
                      boxShadow: '4px 4px 0px black',
                      outline: '1px black solid',
                      outlineOffset: '-1px',
                    }}
                  >
                    <button
                      onClick={handlePeanutClaim}
                      disabled={
                        peanutClaimingState?.peanut_claimed === true ||
                        isPeanutPopupOpen
                      }
                      className={`w-full rounded-[1px] px-6 py-3 flex items-center justify-center gap-2 transition-colors ${
                        peanutClaimingState?.peanut_claimed === true ||
                        isPeanutPopupOpen
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-[#ff91e9] hover:bg-[#ff7de3] cursor-pointer'
                      }`}
                      style={{
                        outline: '1px black solid',
                        outlineOffset: '-1px',
                      }}
                    >
                      <p className="text-black text-[16px] font-bold leading-4">
                        {isPeanutPopupOpen
                          ? 'Claiming...'
                          : peanutClaimingState?.peanut_claimed === true
                            ? '✓ Claimed'
                            : peanutClaimingState?.peanut_claimed === false
                              ? 'Claim $2 (USDC)'
                              : 'Claim $2 (USDC)'}
                      </p>
                      {peanutClaimingState?.peanut_claimed !== true &&
                        !isPeanutPopupOpen && (
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
                        )}
                    </button>
                    {/* Transaction Link or Claiming Status */}
                    {peanutClaimingState?.peanut_claimed === true && (
                      <>
                        {peanutClaimingState?.tx_hash ? (
                          <a
                            href={`https://axelarscan.io/gmp/${peanutClaimingState.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0073de] text-[12px] font-medium hover:underline flex items-center gap-1"
                          >
                            View transaction
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M3 9l6-6m0 0H4.5M9 3v4.5"
                              />
                            </svg>
                          </a>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[#4b4b66] text-[12px] font-medium">
                              {isPeanutPopupOpen
                                ? 'Claiming...'
                                : 'Waiting for transaction...'}
                            </span>
                            <button
                              onClick={handleRefresh}
                              disabled={isRefreshing || portfolioLoading}
                              className="text-[#0073de] text-[12px] font-medium hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Refresh to check if transaction is available"
                            >
                              <Icon
                                path={mdiCached}
                                size={0.5}
                                className={`${isRefreshing || portfolioLoading ? 'animate-spin' : ''}`}
                              />
                              Refresh
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {/* {peanutClaimingState && (
                  <div className="w-full">
                    {peanutClaimingState.peanut_claimed === true ? (
                      <p className="text-green-700 text-[11px] font-medium text-center leading-[1.3]">
                        ✓ Successfully claimed on{' '}
                        {peanutClaimingState.claimed_date
                          ? new Date(peanutClaimingState.claimed_date).toLocaleDateString()
                          : 'blockchain'}
                      </p>
                    ) : peanutClaimingState.peanut_claimed === false ? (
                      <p className="text-orange-700 text-[11px] font-medium text-center leading-[1.3]">
                        ⚠️ Link assigned but not yet claimed on Peanut
                      </p>
                    ) : peanutClaimingState.error ? (
                      <p className="text-gray-600 text-[11px] font-medium text-center leading-[1.3]">
                        Link assigned - claim status unknown
                      </p>
                    ) : null}
                  </div>
                )} */}
                    <div className="flex items-center gap-3">
                      <p className="text-black text-[12px] font-normal leading-[15.6px]">
                        Sponsored by
                      </p>
                      <img
                        src={imgPeanutLogo}
                        alt="Peanut"
                        className="h-5 w-[82px] object-contain"
                      />
                    </div>
                  </div>

                  {/* ENS Claim Card */}
                  {!isBetaMode && (
                    <div className="bg-white border border-[#0080bc] rounded-[12px] p-4 flex flex-col gap-4 items-center w-full md:flex-1">
                      <button
                        onClick={() => {
                          // TODO: Implement ENS claim functionality
                          toast.error('❌ ENS claim is not available yet');
                          return;
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
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>

            {/* Assets Section */}
            <div className="space-y-1 mb-0 pb-5">
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
                      activeTab === 'assets'
                        ? 'text-[#165a8d]'
                        : 'text-[#4b4b66]'
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
                      activeTab === 'activity'
                        ? 'text-[#165a8d]'
                        : 'text-[#4b4b66]'
                    }`}
                  >
                    Activity
                  </span>
                </button>
              </div>

              {/* Assets and Activity Sections */}
              <div className="bg-white border border-[#f0f0f4] rounded-[2px] p-5 space-y-6">
                {activeTab === 'assets' ? (
                  <>
                    <div className="flex gap-6 items-center w-full">
                      <h3 className="flex-grow text-[#20202b] text-lg font-bold tracking-[-0.1px] whitespace-nowrap">
                        My Assets
                      </h3>
                      <div className="shrink-0 w-auto max-w-[140px]">
                        <img
                          src={imgZapperLogo}
                          alt="Powered by Zapper"
                          className="block w-full h-auto object-contain"
                        />
                      </div>
                    </div>

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
                        <div className="flex flex-col items-center gap-3 py-4">
                          <img
                            src={imgNoAssetsIcon}
                            alt="No assets"
                            className="w-12 h-12"
                          />
                          <p className="text-[#353548] text-base font-bold tracking-[-0.1px]">
                            No assets to show
                          </p>
                          <button
                            onClick={handleDigitalClick}
                            className="bg-[#0073de] text-white text-sm font-bold px-6 py-3 rounded-[1px] shadow-[0px_4px_0px_0px_#005493] hover:bg-[#005493] transition-colors"
                          >
                            Add Funds
                          </button>
                        </div>
                      )}
                    </div>

                    {/* View More Assets Button */}
                    {portfolio && portfolio.tokenBalances.length > 3 && (
                      <button
                        onClick={handleViewMoreAssets}
                        className="w-full bg-[#eaf3fa] border border-white shadow-[0px_4px_0px_0px_#595978] rounded-[1px] px-6 py-3 flex items-center justify-center hover:bg-[#d5e7f4] transition-colors cursor-pointer"
                      >
                        <span className="text-[#36364c] text-base font-bold">
                          {showAllAssets
                            ? 'Show Less Assets'
                            : 'View More Assets'}
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex gap-6 items-center w-full">
                      <h3 className="flex-grow text-[#20202b] text-lg font-bold tracking-[-0.1px] whitespace-nowrap">
                        Recent Activity
                      </h3>
                      <div className="shrink-0 w-auto max-w-[140px]">
                        <img
                          src={imgZapperLogo}
                          alt="Powered by Zapper"
                          className="block w-full h-auto object-contain"
                        />
                      </div>
                    </div>

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
                      ) : mergedActivity.length > 0 ? (
                        // Dynamic activity from merged portfolio + local payments
                        mergedActivity
                          .slice(0, showAllActivity ? mergedActivity.length : 3)
                          .map((activity: any, index: number) => {
                            const hash = activity.transaction?.hash;
                            const timestamp = activity.transaction?.timestamp;
                            const chainId = activity.transaction?.chainId;
                            const paymentId = (activity as any).paymentId;
                            const networkConfig = chainId
                              ? getNetworkConfig(chainId)
                              : null;
                            const readableNetwork =
                              networkConfig?.name || 'Unknown Network';
                            const description =
                              activity.interpretation?.processedDescription;

                            // Check if this transaction matches a stored order
                            // First check by hash, then by paymentId (for local payments)
                            let matchedOrder = hash
                              ? findOrderForTxHash(hash)
                              : null;

                            // If not found by hash and we have a paymentId, use it directly
                            if (
                              !matchedOrder &&
                              paymentId &&
                              storedPayments[paymentId]
                            ) {
                              matchedOrder = storedPayments[paymentId];
                            }

                            // Get UserOp Hash if available (for ERC-4337 transactions)
                            // Check both the activity object and matched order
                            const userOpHash =
                              (activity as any).userOpHash ||
                              matchedOrder?.userOpHash;

                            return (
                              <div
                                key={`${hash}-${index}`}
                                className="space-y-2"
                              >
                                <div
                                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                                  onClick={() => {
                                    if (hash && chainId) {
                                      let explorerUrl: string;

                                      // Use Basescan for User Operations (ERC-4337)
                                      if (userOpHash) {
                                        const networkMap: Record<
                                          number,
                                          string
                                        > = {
                                          1: 'mainnet',
                                          8453: 'base',
                                          10: 'optimism',
                                          137: 'polygon',
                                          42161: 'arbitrum',
                                          84532: 'base-sepolia',
                                        };
                                        const network =
                                          networkMap[chainId] || 'base';
                                        explorerUrl = `https://basescan.org/tx/${userOpHash}?network=${network}`;
                                      } else {
                                        // Regular block explorer for standard transactions
                                        const networkConfig =
                                          getNetworkConfig(chainId);
                                        const baseUrl =
                                          networkConfig?.blockExplorers?.default
                                            ?.url;
                                        if (!baseUrl) return;
                                        explorerUrl = `${baseUrl}/tx/${hash}`;
                                      }

                                      window.open(explorerUrl, '_blank');
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
                                          {truncateHash(userOpHash || hash)} ↗
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
                                            {matchedOrder.recipient ||
                                              'Devconnect'}
                                          </span>
                                        </p>
                                      </div>
                                      <p
                                        className="text-[14px] font-bold text-[#0073de] tracking-[-0.1px] flex-shrink-0"
                                        style={{
                                          fontFamily: 'Roboto, sans-serif',
                                        }}
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
                        <div className="flex flex-col items-center gap-3 py-4">
                          <img
                            src={imgNoActivityIcon}
                            alt="No activity"
                            className="w-12 h-12"
                          />
                          <p className="text-[#353548] text-base font-bold tracking-[-0.1px]">
                            No activity to show
                          </p>
                        </div>
                      )}
                    </div>

                    {/* View More Activity Button */}
                    {mergedActivity.length > 3 && (
                      <button
                        onClick={handleViewMoreActivity}
                        className="w-full bg-[#eaf3fa] border border-white shadow-[0px_4px_0px_0px_#595978] rounded-[1px] px-6 py-3 flex items-center justify-center hover:bg-[#d5e7f4] transition-colors cursor-pointer"
                      >
                        <span className="text-[#36364c] text-base font-bold">
                          {showAllActivity
                            ? 'Show Less Activity'
                            : 'View More Activity'}
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Exchange Section */}
            {/* {!isBetaMode && (
              <div className="pb-5">
                <div className="bg-white border border-[#f0f0f4] rounded-[2px] p-5 space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-[#242436] text-lg font-bold tracking-[-0.1px]">
                      Exchange ARS/USD for Crypto
                    </h2>
                    <p className="text-[#36364c] text-sm font-normal">
                      Fund your Ethereum wallet to fully experience the World's
                      Fair. There are two ways to add funds to your wallet:
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={handleDigitalClick}
                        className="flex-1 bg-[#eaf4fb] border border-[#1b6fae] rounded-[2px] p-3 flex flex-col items-center gap-2 hover:bg-[#d5e7f4] transition-colors cursor-pointer"
                      >
                        <img
                          src={imgOnrampDigital}
                          alt="digital"
                          className="w-10 h-10"
                        />
                        <div className="text-center">
                          <div className="text-[#36364c] text-sm font-bold">
                            Digital
                          </div>
                          <div className="text-[#4b4b66] text-xs font-medium">
                            Debit/Credit Card
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={handleInPersonClick}
                        className="flex-1 bg-[#eaf4fb] border border-[#1b6fae] rounded-[2px] p-3 flex flex-col items-center gap-2 hover:bg-[#d5e7f4] transition-colors cursor-pointer"
                      >
                        <img
                          src={imgOnrampCash}
                          alt="in-person"
                          className="w-10 h-10"
                        />
                        <div className="text-center">
                          <div className="text-[#36364c] text-sm font-bold">
                            In-Person
                          </div>
                          <div className="text-[#4b4b66] text-xs font-medium">
                            Currency & Card
                          </div>
                        </div>
                      </button>
                    </div>
                    <p className="text-[#4b4b66] text-[10px] font-normal italic text-center leading-[1.3]">
                      Providers are registered as VASP in Argentina
                    </p>
                  </div>
                </div>
              </div>
            )} */}
          </div>
        </div>
      </PullToRefresh>

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
        isPara={isPara}
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
          isHistoricalPayment={true}
        />
      )}
    </>
  );
}
