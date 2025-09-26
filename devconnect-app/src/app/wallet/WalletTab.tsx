'use client';

import { useAppKit } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getNetworkLogo, getNetworkConfig } from '@/config/networks';
import { useLocalStorage } from 'usehooks-ts';
import { useNetworkSwitcher } from '@/hooks/useNetworkSwitcher';
import NetworkLogo from '@/components/NetworkLogo';
import NetworkModal from '@/components/NetworkModal';

// Image assets from local public/images directory
const imgCheckbox = '/images/imgCheckbox.png';
const imgSend = '/images/imgSend.svg';
const imgCallReceived = '/images/imgCallReceived.svg';
const imgSwapVert = '/images/imgSwapVert.svg';
const imgQrCodeScanner = '/images/imgQrCodeScanner.svg';
const imgGroup = '/images/imgGroup.svg';
const imgGroup1 = '/images/imgGroup1.svg';
const imgKeyboardArrowDown = '/images/imgKeyboardArrowDown.svg';

// Types for portfolio data
interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  balance: number;
  balanceUSD: number;
  imgUrlV2: string | null;
  network: {
    name: string;
  };
}

interface RecentActivity {
  transaction?: {
    hash: string;
    timestamp: number;
    network: string;
  };
  interpretation?: {
    processedDescription: string;
    description?: string;
  };
}

interface PortfolioData {
  totalValue: number;
  tokenBalances: TokenBalance[];
  recentActivity: RecentActivity[];
}

export default function WalletTab() {
  const { open } = useAppKit();
  const router = useRouter();
  const { address } = useUnifiedConnection();
  const { currentChainId, getCurrentNetwork, switchToNetwork } =
    useNetworkSwitcher();

  // Portfolio state
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'activity'>('assets');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const lastLoadedAddress = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const [identity, setIdentity] = useState<{
    name: string | null;
    avatar: string | null;
  } | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // Local storage key based on address
  const storageKey = address ? `portfolio_${address}` : null;
  const [cachedPortfolioData, setCachedPortfolioData] =
    useLocalStorage<PortfolioData | null>(
      storageKey || 'portfolio_default',
      null
    );

  const handleSendClick = () => {
    open({ view: 'WalletSend' });
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
    open({ view: 'Account' });
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

  // Load identity from AppKit's local storage
  const loadIdentity = () => {
    if (!address) {
      setIdentity(null);
      return;
    }

    try {
      const identityCache = localStorage.getItem('@appkit/identity_cache');
      if (identityCache) {
        const cache = JSON.parse(identityCache);
        const addressData = cache[address];
        if (addressData?.identity) {
          setIdentity({
            name: addressData.identity.name,
            avatar: addressData.identity.avatar,
          });
        } else {
          setIdentity(null);
        }
      } else {
        setIdentity(null);
      }
    } catch (error) {
      console.error('Error loading identity from cache:', error);
      setIdentity(null);
    }
  };

  // Fetch portfolio data
  const fetchPortfolioData = useCallback(
    async (forceRefresh = false) => {
      const currentAddress = address;
      if (!currentAddress) return;

      // If we have cached data and not forcing refresh, use cached data
      if (cachedPortfolioData && !forceRefresh) {
        setPortfolioData(cachedPortfolioData);
        lastLoadedAddress.current = currentAddress;
        return;
      }

      // Prevent concurrent API calls
      if (isFetchingRef.current) {
        return;
      }

      // Prevent duplicate calls for the same address
      if (lastLoadedAddress.current === currentAddress && !forceRefresh) {
        return;
      }

      isFetchingRef.current = true;
      setIsFetching(true);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/portfolio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: currentAddress }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch portfolio data');
        }

        const data = await response.json();
        setPortfolioData(data);
        setCachedPortfolioData(data);
        lastLoadedAddress.current = currentAddress;
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch portfolio data'
        );
      } finally {
        setIsLoading(false);
        setIsFetching(false);
        isFetchingRef.current = false;
      }
    },
    [address, cachedPortfolioData]
  );

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPortfolioData(true);
    setIsRefreshing(false);
  };

  // Load portfolio data when address changes
  useEffect(() => {
    if (address) {
      fetchPortfolioData();
    } else {
      // Clear portfolio data when no address
      setPortfolioData(null);
      lastLoadedAddress.current = null;
    }
  }, [address, fetchPortfolioData]);

  // Load identity when address changes
  useEffect(() => {
    loadIdentity();
  }, [address]);

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

  // Get readable network name
  const getReadableNetworkName = (networkName: string): string => {
    const networkMap: Record<string, string> = {
      ETHEREUM_MAINNET: 'Ethereum',
      BASE_MAINNET: 'Base',
      OPTIMISM_MAINNET: 'Optimism',
      ARBITRUM_MAINNET: 'Arbitrum',
      Ethereum: 'Ethereum',
      Base: 'Base',
      'OP Mainnet': 'Optimism',
      'Arbitrum One': 'Arbitrum',
      ethereum: 'Ethereum',
      base: 'Base',
      optimism: 'Optimism',
      arbitrum: 'Arbitrum',
      'Ethereum Mainnet': 'Ethereum',
      'Base Mainnet': 'Base',
      'Optimism Mainnet': 'Optimism',
      'Arbitrum Mainnet': 'Arbitrum',
    };

    if (networkMap[networkName]) {
      return networkMap[networkName];
    }

    const lowerName = networkName.toLowerCase();
    if (lowerName.includes('ethereum') || lowerName.includes('eth')) {
      return 'Ethereum';
    }
    if (lowerName.includes('base')) {
      return 'Base';
    }
    if (lowerName.includes('optimism') || lowerName.includes('op')) {
      return 'Optimism';
    }
    if (lowerName.includes('arbitrum') || lowerName.includes('arb')) {
      return 'Arbitrum';
    }

    return networkName;
  };

  // Helper function to get network logo by name
  const getNetworkLogoByName = (networkName: string): string | undefined => {
    const readableName = getReadableNetworkName(networkName);

    // Map readable names back to chain IDs
    const nameToChainId: Record<string, number> = {
      Ethereum: 1,
      Base: 8453,
      Optimism: 10,
      Arbitrum: 42161,
    };

    const chainId = nameToChainId[readableName];
    return chainId ? getNetworkLogo(chainId) : undefined;
  };

  return (
    <div className="bg-[#f6fafe] min-h-screen w-full">
      {/* Main Content */}
      <div className="px-6 pt-6 space-y-6">
        {/* Profile Section */}
        <div className="space-y-4">
          {/* Profile Info */}
          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-[1px] relative">
              {/* Network Status - positioned on the left */}
              <div className="absolute left-0 flex items-center gap-1 px-2 py-1 rounded">
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
              </div>

              {/* Wallet Info - centered */}
              <div className="flex items-center gap-2">
                {identity?.avatar ? (
                  <img
                    src={identity.avatar}
                    alt="avatar"
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <img src={imgCheckbox} alt="checkbox" className="w-5 h-5" />
                )}
                <span className="text-[#242436] text-base font-normal">
                  {address
                    ? identity?.name ||
                      `${address.slice(0, 6)}...${address.slice(-4)}`
                    : 'Not connected'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-[#242436] text-[36px] font-bold tracking-[-0.1px]">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-9 w-32 rounded"></div>
                ) : portfolioData ? (
                  formatUSD(portfolioData.totalValue)
                ) : (
                  '$0.00'
                )}
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isFetching || !address}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Refresh portfolio data"
              >
                <svg
                  className={`w-5 h-5 text-[#36364c] ${isRefreshing || isFetching ? 'animate-spin' : ''}`}
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
            <div className="flex-1 flex flex-col items-center gap-2">
              <button
                onClick={handleSwapClick}
                className="bg-white border border-[#f0f0f4] rounded-[4px] p-4 w-full aspect-square flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src={imgSwapVert} alt="swap" className="w-8 h-8" />
              </button>
              <span className="text-[#36364c] text-sm font-medium tracking-[-0.1px]">
                Swap
              </span>
            </div>
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
                  {isLoading ? (
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
                  ) : error ? (
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
                  ) : portfolioData &&
                    portfolioData.tokenBalances.length > 0 ? (
                    // Dynamic assets from portfolio data
                    portfolioData.tokenBalances
                      .slice(
                        0,
                        showAllAssets ? portfolioData.tokenBalances.length : 3
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
                              {getNetworkLogoByName(token.network.name) && (
                                <img
                                  src={getNetworkLogoByName(token.network.name)}
                                  alt={getReadableNetworkName(
                                    token.network.name
                                  )}
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
                {portfolioData && portfolioData.tokenBalances.length > 3 && (
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
                  {isLoading ? (
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
                  ) : error ? (
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
                  ) : portfolioData &&
                    portfolioData.recentActivity.filter(
                      (activity) => activity.transaction?.hash
                    ).length > 0 ? (
                    // Dynamic activity from portfolio data
                    portfolioData.recentActivity
                      .filter((activity) => activity.transaction?.hash) // Only show activities with hash
                      .slice(
                        0,
                        showAllActivity
                          ? portfolioData.recentActivity.filter(
                              (activity) => activity.transaction?.hash
                            ).length
                          : 3
                      )
                      .map((activity, index) => {
                        const hash = activity.transaction?.hash;
                        const timestamp = activity.transaction?.timestamp;
                        const network = activity.transaction?.network;
                        const readableNetwork = getReadableNetworkName(
                          network || ''
                        );
                        const description =
                          activity.interpretation?.processedDescription;

                        return (
                          <div
                            key={`${hash}-${index}`}
                            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                            onClick={() => {
                              if (hash && network) {
                                // Open transaction in block explorer
                                const explorerUrls: Record<string, string> = {
                                  Ethereum: 'https://etherscan.io',
                                  Base: 'https://basescan.org',
                                  Optimism: 'https://optimistic.etherscan.io',
                                  Arbitrum: 'https://arbiscan.io',
                                };

                                const explorerUrl =
                                  explorerUrls[readableNetwork];
                                if (explorerUrl) {
                                  window.open(
                                    `${explorerUrl}/tx/${hash}`,
                                    '_blank'
                                  );
                                }
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
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
                                {network && (
                                  <p className="text-xs text-[#4b4b66]">
                                    {readableNetwork}
                                  </p>
                                )}
                              </div>
                              {timestamp && (
                                <p className="text-xs text-gray-500 ml-2">
                                  {formatTimestamp(timestamp)}
                                </p>
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
                {portfolioData &&
                  portfolioData.recentActivity.filter(
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
      </div>

      {/* Network Switching Modal */}
      <NetworkModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
      />
    </div>
  );
}
