'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, ModalContent } from 'lib/components/modal';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Activity, Coins, X } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';

interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  balance: number;
  balanceUSD: number;
  imgUrlV2: string | null;
  chainId: number;
}

interface RecentActivity {
  transaction?: {
    hash: string;
    timestamp: number;
    chainId: number;
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

interface PortfolioModalProps {
  address: string;
}

import { chains, getNetworkConfig, getNetworkLogo } from '@/config/networks';

export default function PortfolioModal({ address }: PortfolioModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const lastLoadedAddress = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // Global portfolio cache with address-based keys
  const [portfolioCache, setPortfolioCache] = useLocalStorage<
    Record<string, PortfolioData>
  >('portfolio', {});

  // Get cached portfolio for current address
  const cachedPortfolioData = address?.toLowerCase()
    ? portfolioCache[address.toLowerCase()] || null
    : null;

  const handleOpenModal = () => {
    setIsOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    // Don't clear data when closing to preserve cache
  };

  // Fetch portfolio data - auto-fetches once if no cache, or manual refresh
  const fetchPortfolioData = useCallback(async () => {
    const currentAddress = address;
    if (!currentAddress) return;

    // Prevent concurrent API calls
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsFetching(true);
    setIsLoading(true);
    setError(null);

    try {
      const addressKey = currentAddress.toLowerCase();
      console.log('🌐 [PORTFOLIO_MODAL] Fetching from API');

      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: addressKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch portfolio data');
      }

      const data = await response.json();
      setPortfolioData(data);

      // Save to global portfolio cache with address as key
      setPortfolioCache((prev) => ({
        ...prev,
        [addressKey]: data,
      }));

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
  }, [address, setPortfolioCache]);

  // Manual refresh function to update existing data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPortfolioData();
    setIsRefreshing(false);
  };

  // Load cached data when modal opens, or auto-fetch once if no cache
  useEffect(() => {
    if (!isOpen || !address) return;

    if (cachedPortfolioData) {
      // Use cached data if available
      console.log('📦 [PORTFOLIO_MODAL] Loading from cache');
      setPortfolioData(cachedPortfolioData);
      lastLoadedAddress.current = address;
    } else if (
      !isFetchingRef.current &&
      lastLoadedAddress.current !== address
    ) {
      // Auto-fetch once if no cached data (first time only)
      console.log(
        '📡 [PORTFOLIO_MODAL] No cache found, auto-fetching (first time)'
      );
      fetchPortfolioData();
    }
  }, [isOpen, address, cachedPortfolioData, fetchPortfolioData]);

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

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

  const formatTimestamp = (timestamp: number) => {
    // Timestamp is already in milliseconds, no need to multiply by 1000
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full flex items-center gap-2 cursor-pointer"
        onClick={handleOpenModal}
      >
        <Wallet className="h-4 w-4" />
        Portfolio
      </Button>

      <Modal open={isOpen} close={handleCloseModal} className="p-0">
        <ModalContent className="w-[100vw] max-w-xl max-h-[80vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Portfolio Overview
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isFetching || !address}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Refresh portfolio data"
              >
                <svg
                  className={`w-4 h-4 text-gray-600 ${isRefreshing || isFetching ? 'animate-spin' : ''}`}
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
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {portfolioData && !isLoading && (
            <div className="space-y-6">
              {/* Total Portfolio Value */}
              <div className="bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">Portfolio Value</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatUSD(portfolioData.totalValue)}
                </p>
              </div>

              {/* Token Balances */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="h-5w-5" />
                  <h3 className="font-semibold">Top Token Balances</h3>
                </div>
                <div className="space-y-2">
                  {portfolioData.tokenBalances.length > 0 ? (
                    portfolioData.tokenBalances.map((token, index) => (
                      <div
                        key={`${token.tokenAddress}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {token.imgUrlV2 ? (
                              <img
                                src={token.imgUrlV2}
                                alt={token.symbol}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium">
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
                          <div>
                            <p className="font-medium">{token.symbol}</p>
                            <p className="text-sm text-gray-600">
                              {getNetworkConfig(token.chainId).name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatBalance(token.balance, token.symbol)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatUSD(token.balanceUSD)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No token balances found
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4" />
                  <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <div className="space-y-2">
                  {portfolioData.recentActivity.length > 0 ? (
                    portfolioData.recentActivity.map((activity, index) => {
                      const hash = activity.transaction?.hash;
                      const timestamp = activity.transaction?.timestamp;
                      const chainId = activity.transaction?.chainId;
                      const networkConfig = chainId
                        ? getNetworkConfig(chainId)
                        : null;
                      const readableNetwork =
                        networkConfig?.name || 'Unknown Network';
                      const networkLogo = chainId
                        ? getNetworkLogo(chainId)
                        : undefined;
                      const description =
                        activity.interpretation?.processedDescription;

                      return (
                        <div
                          key={`${hash}-${index}`}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                          onClick={() => {
                            if (hash && chainId) {
                              const networkConfig = getNetworkConfig(chainId);
                              if (networkConfig?.blockExplorers?.default?.url) {
                                window.open(
                                  `${networkConfig.blockExplorers.default.url}/tx/${hash}`,
                                  '_blank'
                                );
                              }
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {description && (
                                <p className="font-medium text-sm mb-1">
                                  {description}
                                </p>
                              )}
                              {hash && (
                                <p className="text-xs text-gray-600 font-mono">
                                  {truncateHash(hash)} ↗
                                </p>
                              )}
                              {chainId && (
                                <div className="flex items-center gap-1 mt-1">
                                  {networkLogo && (
                                    <img
                                      src={networkLogo}
                                      alt={readableNetwork}
                                      className="w-3 h-3 rounded-full"
                                    />
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {readableNetwork}
                                  </p>
                                </div>
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
                    <p className="text-gray-500 text-center py-4">
                      No recent activity found
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </>
  );
} 
