'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent } from 'lib/components/modal';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Activity, Coins, X } from 'lucide-react';

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

interface PortfolioModalProps {
  address: string;
}

// Network configuration
const NETWORKS = {
  mainnet: { name: 'Ethereum', chainId: 1, color: 'bg-gray-500', icon: '⚫' },
  base: { name: 'Base', chainId: 8453, color: 'bg-blue-500', icon: '🟦' },
  'op-mainnet': { name: 'Optimism', chainId: 10, color: 'bg-red-500', icon: '🔴' },
  arbitrum: { name: 'Arbitrum', chainId: 42161, color: 'bg-blue-600', icon: '🔷' }
} as const;

type NetworkKey = keyof typeof NETWORKS;

export default function PortfolioModal({ address }: PortfolioModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('base');
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setIsOpen(true);
    // Clear previous data when opening
    setPortfolioData(null);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    // Clear data when closing
    setPortfolioData(null);
    setError(null);
  };

  const fetchPortfolioData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch portfolio data from our backend API
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, network: selectedNetwork }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch portfolio data');
      }

      const data = await response.json();
      setPortfolioData(data);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch portfolio data'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPortfolioData();
    }
  }, [isOpen, selectedNetwork]);

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

      <Modal open={isOpen} close={handleCloseModal}>
        <ModalContent className="min-w-[80vw] max-w-2xl max-h-[80vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Portfolio Overview
              </h2>

              {/* Network Selector */}
              <div className="flex gap-2">
                {Object.entries(NETWORKS).map(([key, network]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const newNetwork = key as NetworkKey;
                      setSelectedNetwork(newNetwork);
                      // Clear data when switching networks
                      setPortfolioData(null);
                      setError(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                      selectedNetwork === key
                        ? 'bg-gray-800 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-xs">{network.icon}</span>
                    <span>{network.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
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
                  <Coins className="h-4 w-4" />
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
                          {token.imgUrlV2 ? (
                            <img
                              src={token.imgUrlV2}
                              alt={token.symbol}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {token.symbol[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{token.symbol}</p>
                            <p className="text-sm text-gray-600">
                              {token.network.name}
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
                      const network =
                        NETWORKS[selectedNetwork as NetworkKey].name;
                      const description =
                        activity.interpretation?.processedDescription;

                      return (
                        <div
                          key={`${hash}-${index}`}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                          onClick={() => {
                            if (hash) {
                              const explorerUrls = {
                                base: `https://basescan.org/tx/${hash}`,
                                mainnet: `https://etherscan.io/tx/${hash}`,
                                'op-mainnet': `https://optimistic.etherscan.io/tx/${hash}`,
                                arbitrum: `https://arbiscan.io/tx/${hash}`,
                              };
                              window.open(
                                explorerUrls[selectedNetwork],
                                '_blank'
                              );
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
                              {network && (
                                <p className="text-xs text-gray-500">
                                  {network}
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
