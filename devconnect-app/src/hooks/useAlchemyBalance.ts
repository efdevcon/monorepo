import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { APP_CONFIG } from '@/config/config';
import { getSupportedTokens, getTokenAddress } from '@/config/tokens';
import { CHAIN_ID_TO_ALCHEMY_NETWORK } from '@/config/networks';

interface TokenBalance {
  contractAddress: string;
  balance: number;
  balanceRaw: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string | null;
}

interface NativeBalance {
  symbol: string;
  balance: number;
  balanceRaw: string;
}

interface AlchemyBalanceData {
  address: string;
  chainId: number;
  native: NativeBalance;
  tokens: TokenBalance[];
  timestamp: number;
}

interface UseAlchemyBalanceReturn {
  balance: AlchemyBalanceData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTokenBalance: (symbol: string) => number | null;
  getFormattedTokenBalance: (symbol: string, maxDecimals?: number) => string | null;
}

export function useAlchemyBalance(chainId?: number): UseAlchemyBalanceReturn {
  const { address } = useWallet();
  const [balance, setBalance] = useState<AlchemyBalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }

    if (!APP_CONFIG.ALCHEMY_APIKEY) {
      setError('Alchemy API key not configured');
      return;
    }

    const targetChainId = chainId || 8453; // Default to Base
    const alchemyNetwork = CHAIN_ID_TO_ALCHEMY_NETWORK[targetChainId];

    if (!alchemyNetwork) {
      setError(`Unsupported chain ID: ${targetChainId}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use Alchemy RPC endpoint (same pattern as SendSubTab.tsx)
      const rpcUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${APP_CONFIG.ALCHEMY_APIKEY}`;

      // Get supported tokens from config for this chain
      const supportedTokens = getSupportedTokens(targetChainId);
      const tokenAddresses = supportedTokens
        .map((token) => getTokenAddress(token.symbol, targetChainId))
        .filter((addr): addr is string => addr !== null && addr !== '0x0000000000000000000000000000000000000000'); // Filter out native tokens

      // Fetch token balances using alchemy_getTokenBalances
      const tokenBalancesResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address, tokenAddresses], // Query specific tokens from our config
          id: 1,
        }),
      });

      if (!tokenBalancesResponse.ok) {
        throw new Error(`HTTP ${tokenBalancesResponse.status}: Failed to fetch token balances`);
      }

      const tokenBalancesData = await tokenBalancesResponse.json();

      if (tokenBalancesData.error) {
        throw new Error(tokenBalancesData.error.message || 'Alchemy API error');
      }

      const tokenBalances = tokenBalancesData.result?.tokenBalances || [];

      // Filter out zero balances
      const nonZeroBalances = tokenBalances.filter((token: any) => {
        if (token.tokenBalance === '0x0' || token.tokenBalance === '0') {
          return false;
        }
        try {
          return BigInt(token.tokenBalance) > BigInt(0);
        } catch {
          return false;
        }
      });

      // Fetch metadata for non-zero tokens (limit to top 20)
      const enrichedBalances = await Promise.all(
        nonZeroBalances.slice(0, 20).map(async (token: any) => {
          try {
            const metadataResponse = await fetch(rpcUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'alchemy_getTokenMetadata',
                params: [token.contractAddress],
                id: 1,
              }),
            });

            const metadataData = await metadataResponse.json();
            const metadata = metadataData.result;

            if (!metadata) {
              return null;
            }

            // Convert hex balance to decimal
            const balanceWei = BigInt(token.tokenBalance);
            const decimals = metadata.decimals || 18;
            // Create divisor as 10^decimals (e.g., 1000000 for 6 decimals)
            const divisor = BigInt('1' + '0'.repeat(decimals));
            const balanceFormatted = Number(balanceWei) / Number(divisor);

            return {
              contractAddress: token.contractAddress,
              balance: balanceFormatted,
              balanceRaw: token.tokenBalance,
              symbol: metadata.symbol || 'Unknown',
              name: metadata.name || 'Unknown Token',
              decimals: metadata.decimals || 18,
              logo: metadata.logo || null,
            };
          } catch (error) {
            console.error(`Failed to fetch metadata for ${token.contractAddress}:`, error);
            return null;
          }
        })
      );

      // Filter out failed metadata fetches
      const validBalances = enrichedBalances.filter((b) => b !== null);

      // Fetch native token balance (ETH, MATIC, etc.) using eth_getBalance
      const nativeBalanceResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const nativeBalanceData = await nativeBalanceResponse.json();
      const nativeBalanceHex = nativeBalanceData.result || '0x0';
      const nativeBalanceWei = BigInt(nativeBalanceHex);
      const nativeBalanceValue = Number(nativeBalanceWei) / 1e18;

      // Determine native token symbol based on chain
      const nativeSymbolMap: Record<number, string> = {
        1: 'ETH',
        8453: 'ETH',
        10: 'ETH',
        137: 'MATIC',
        42161: 'ETH',
      };
      const nativeSymbol = nativeSymbolMap[targetChainId] || 'ETH';

      setBalance({
        address,
        chainId: targetChainId,
        native: {
          symbol: nativeSymbol,
          balance: nativeBalanceValue,
          balanceRaw: nativeBalanceHex,
        },
        tokens: validBalances,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Failed to fetch Alchemy balance:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [address, chainId]);

  // Auto-fetch on mount and when address/chainId changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Helper to get balance for a specific token symbol
  const getTokenBalance = useCallback(
    (symbol: string): number | null => {
      if (!balance) return null;

      // Check native token
      if (balance.native.symbol.toUpperCase() === symbol.toUpperCase()) {
        return balance.native.balance;
      }

      // Check ERC20 tokens
      const token = balance.tokens.find(
        (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
      );

      return token ? token.balance : null;
    },
    [balance]
  );

  // Helper to get formatted token balance
  const getFormattedTokenBalance = useCallback(
    (symbol: string, maxDecimals: number = 4): string | null => {
      const tokenBalance = getTokenBalance(symbol);
      if (tokenBalance === null) return null;

      return tokenBalance.toFixed(maxDecimals);
    },
    [getTokenBalance]
  );

  return {
    balance,
    loading,
    error,
    refresh: fetchBalance,
    getTokenBalance,
    getFormattedTokenBalance,
  };
}

