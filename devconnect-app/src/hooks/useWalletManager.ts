'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParaWalletConnection } from './useParaWallet';
import { useEOAWalletConnection } from './useEOAWallet';
import { useUser } from './useUser';
import { useEnsureUserData } from '@/app/store.hooks';
import { useAutoParaJwtExchange } from './useAutoParaJwtExchange';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';
import { createPublicClient, http } from 'viem';

const PRIMARY_WALLET_TYPE_KEY = 'devconnect_primary_wallet_type';

export type WalletType = 'para' | 'eoa' | null;

interface WalletIdentity {
  name: string | null;
  avatar: string | null;
}

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

export interface PortfolioData {
  totalValue: number;
  tokenBalances: TokenBalance[];
  recentActivity: RecentActivity[];
}

/**
 * Wallet Manager
 * Thin coordination layer between Para and EOA wallets
 * No synchronization - just simple switching logic
 */
let hookInstanceCounter = 0;

export function useWalletManager() {
  const [hookId] = useState(() => ++hookInstanceCounter);
  const para = useParaWalletConnection();
  const eoa = useEOAWalletConnection();
  const { user: supabaseUser, loading: supabaseLoading, hasInitialized: supabaseInitialized, ...userMethods } = useUser();
  
  // Track disconnecting state at manager level for better UI control
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Load primary wallet type from localStorage
  const [primaryType, setPrimaryTypeState] = useState<WalletType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PRIMARY_WALLET_TYPE_KEY);
      return (saved as WalletType) || null;
    }
    return null;
  });

  // Listen for storage changes to sync across hook instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PRIMARY_WALLET_TYPE_KEY) {
        const newValue = e.newValue as WalletType;
        console.log(`🔄 [WALLET_MANAGER #${hookId}] Storage change detected:`, {
          oldValue: e.oldValue,
          newValue,
        });
        setPrimaryTypeState(newValue);
      }
    };

    // Also listen for custom events (for same-window updates)
    const handleCustomEvent = (e: CustomEvent) => {
      const newValue = e.detail as WalletType;
      console.log(`🔄 [WALLET_MANAGER #${hookId}] Custom event received:`, {
        newValue,
        currentValue: primaryType,
      });
      setPrimaryTypeState(newValue);
    };

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('primaryWalletTypeChange', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('primaryWalletTypeChange', handleCustomEvent as EventListener);
    };
  }, [hookId, primaryType]);

  // Auto-detect primary wallet if not set
  useEffect(() => {
    if (!primaryType) {
      if (para.isConnected) {
        setPrimaryType('para');
      } else if (eoa.isConnected) {
        setPrimaryType('eoa');
      }
    }
  }, [para.isConnected, eoa.isConnected, primaryType]);

  /**
   * Set primary wallet type
   */
  const setPrimaryType = (type: WalletType) => {
    setPrimaryTypeState(type);
    if (typeof window !== 'undefined') {
      if (type) {
        localStorage.setItem(PRIMARY_WALLET_TYPE_KEY, type);
        console.log('✅ [WALLET_MANAGER] Set primary wallet type:', type);

        // Dispatch custom event to notify other hook instances
        window.dispatchEvent(new CustomEvent('primaryWalletTypeChange', { detail: type }));
      } else {
        localStorage.removeItem(PRIMARY_WALLET_TYPE_KEY);
        console.log('✅ [WALLET_MANAGER] Cleared primary wallet type');

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('primaryWalletTypeChange', { detail: null }));
      }
    }
    
    // Update individual wallet primary states
    if (type === 'para') {
      para.setPrimary();
    } else if (type === 'eoa') {
      eoa.setPrimary();
    }
  };

  // Determine active wallet
  const isParaActive = primaryType === 'para' && para.isConnected;
  const isEOAActive = primaryType === 'eoa' && eoa.isConnected;

  // Unified connection state
  const isConnected = isParaActive || isEOAActive;
  const address = isParaActive ? para.address : isEOAActive ? eoa.address : null;
  const isPara = isParaActive;
  const chainId = isParaActive ? para.chainId : isEOAActive ? eoa.chainId : null;

  // Unified authentication state
  const paraEmail = para.email;
  const supabaseEmail = supabaseUser?.email || null;
  const email = supabaseEmail || paraEmail; // Prioritize Supabase email, fallback to Para

  // Automatically exchange Para JWT for Supabase session when Para is connected
  // This eliminates the need to manually click "Get Supabase JWT" button
  useAutoParaJwtExchange({
    paraConnected: para.isConnected,
    paraAddress: para.address,
    supabaseHasUser: !!supabaseUser,
    supabaseInitialized,
  });

  // Sync authentication state to global store (for RequiresAuthHOC and other components)
  // Only use Supabase authentication for this check
  // Para users will automatically get a Supabase session via auto JWT exchange above
  const hasValidSupabaseAuth = supabaseInitialized && !!supabaseUser;

  // Log comprehensive user authentication state
  useEffect(() => {
    const canIssueParaJwt = typeof para !== 'undefined' &&
      typeof (window as any).para?.issueJwt === 'function' &&
      para.isConnected;

    console.log('👤 [USER_AUTH_STATE] Complete authentication info:', {
      // Para state
      para: {
        isConnected: para.isConnected,
        address: para.address,
        email: para.email,
        walletId: para.walletId,
        canIssueJwt: canIssueParaJwt,
        note: canIssueParaJwt
          ? '✅ Para can issue JWT - backend supports Para JWT directly!'
          : '❌ Para cannot issue JWT yet - biometric verification needed',
      },
      // Supabase state
      supabase: {
        initialized: supabaseInitialized,
        loading: supabaseLoading,
        hasUser: !!supabaseUser,
        userId: supabaseUser?.id,
        email: supabaseUser?.email,
        userMetadata: supabaseUser?.user_metadata,
      },
      // Unified state
      unified: {
        email,
        isAuthenticated: !!email,
        hasValidSupabaseAuth,
        willTriggerUserDataFetch: hasValidSupabaseAuth,
      },
      // Connection state
      connection: {
        isConnected,
        address,
        isPara,
        primaryType,
      },
      // Auth options
      authOptions: {
        option1_supabase: supabaseInitialized && !!supabaseUser 
          ? '✅ Can use Supabase auth' 
          : '❌ No Supabase session',
        option2_paraAutoExchange: para.isConnected && !supabaseUser
          ? '🔄 Auto JWT exchange will trigger automatically' 
          : para.isConnected && !!supabaseUser
            ? '✅ Para JWT already exchanged'
            : '❌ Para not connected',
      },
      // Current behavior
      currentBehavior: {
        description: '🚀 Automatic JWT exchange enabled! Para users will be authenticated automatically.',
        requiresAuthHOCWillWork: hasValidSupabaseAuth,
        whatYouNeedToDo: hasValidSupabaseAuth 
          ? '✅ You are authenticated!' 
          : para.isConnected 
            ? '🔄 Automatic JWT exchange in progress... Please complete biometric verification when prompted.' 
            : '❌ Please connect a wallet',
      }
    });
  }, [
    para.isConnected,
    para.address,
    para.email,
    supabaseInitialized,
    supabaseLoading,
    supabaseUser?.id,
    supabaseUser?.email,
    email,
    hasValidSupabaseAuth,
    isConnected,
    address,
    isPara,
  ]);

  useEnsureUserData(hasValidSupabaseAuth);

  // Debug: Log address computation
  console.log(`🔍 [WALLET_MANAGER #${hookId}] Address computed:`, {
    address: address ? address.slice(0, 10) + '...' : null,
    fullAddress: address,
    isPara,
    isParaActive,
    isEOAActive,
    paraAddress: para.address?.slice(0, 10) + '...',
    eoaAddress: eoa.address?.slice(0, 10) + '...',
  });

  // ============================================
  // Identity Resolution (ENS) - Store per address
  // ============================================
  const [identityMap, setIdentityMap] = useState<Record<string, WalletIdentity | null>>({});
  const [identityLoading, setIdentityLoading] = useState(false);
  const identityFetchingRef = useRef<Set<string>>(new Set());

  // Get identity for current address (memoized to prevent unnecessary re-renders)
  const identity = useMemo(() => {
    const result = address ? identityMap[address.toLowerCase()] || null : null;
    console.log(`🔍 [WALLET_MANAGER #${hookId}] Identity lookup:`, {
      address: address ? address.slice(0, 10) + '...' : null,
      hasIdentity: !!result,
      identityName: result?.name,
      identityMapKeys: Object.keys(identityMap).map(k => k.slice(0, 10) + '...'),
    });
    return result;
  }, [address, identityMap, hookId]);

  useEffect(() => {
    if (!address) {
      return;
    }

    const addressKey = address.toLowerCase();

    // If we already have identity for this address, skip
    if (identityMap[addressKey] !== undefined) {
      return;
    }

    // If we're already fetching this address, skip
    if (identityFetchingRef.current.has(addressKey)) {
      return;
    }

    let isCancelled = false;

    const resolveIdentity = async () => {
      identityFetchingRef.current.add(addressKey);
      setIdentityLoading(true);

      try {
        // Check cache first (1 hour TTL)
        const cacheKey = `wallet_identity_${addressKey}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            if (Date.now() - parsedCache.timestamp < 3600000) {
              if (!isCancelled) {
                setIdentityMap(prev => ({ ...prev, [addressKey]: parsedCache.identity }));
                setIdentityLoading(false);
                identityFetchingRef.current.delete(addressKey);
              }
              return;
            }
          } catch {
            // Invalid cache, continue
          }
        }

        // Resolve ENS on mainnet
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        });

        const ensName = await publicClient.getEnsName({
          address: addressKey as `0x${string}`,
        });

        let ensAvatar: string | null = null;
        if (ensName) {
          try {
            ensAvatar = await publicClient.getEnsAvatar({
              name: normalize(ensName),
            });
          } catch (err) {
            console.warn('Failed to resolve ENS avatar:', err);
          }
        }

        const resolvedIdentity: WalletIdentity = {
          name: ensName,
          avatar: ensAvatar,
        };

        if (!isCancelled) {
          setIdentityMap(prev => ({ ...prev, [addressKey]: resolvedIdentity }));

          // Cache result
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              identity: resolvedIdentity,
              timestamp: Date.now(),
            })
          );
          setIdentityLoading(false);
          identityFetchingRef.current.delete(addressKey);
        }
      } catch (err) {
        console.error('Error resolving identity:', err);
        if (!isCancelled) {
          setIdentityMap(prev => ({ ...prev, [addressKey]: null }));
          setIdentityLoading(false);
          identityFetchingRef.current.delete(addressKey);
        }
      }
    };

    resolveIdentity();

    return () => {
      isCancelled = true;
    };
  }, [address, identityMap]);

  // ============================================
  // Portfolio Data - Store per address
  // ============================================
  const [portfolioMap, setPortfolioMap] = useState<Record<string, PortfolioData | null>>({});
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const portfolioFetchingRef = useRef<Set<string>>(new Set());

  // Get portfolio for current address (memoized to prevent unnecessary re-renders)
  const portfolio = useMemo(() => {
    const result = address ? portfolioMap[address.toLowerCase()] || null : null;
    console.log(`🔍 [WALLET_MANAGER #${hookId}] Portfolio lookup:`, {
      address: address ? address.slice(0, 10) + '...' : null,
      hasPortfolio: !!result,
      totalValue: result?.totalValue,
      portfolioMapKeys: Object.keys(portfolioMap).map(k => k.slice(0, 10) + '...'),
    });
    return result;
  }, [address, portfolioMap, hookId]);

  const fetchPortfolio = useCallback(
    async (forceRefresh = false) => {
      if (!address) {
        return;
      }

      const addressKey = address.toLowerCase();

      // If we're already fetching this address, skip
      if (portfolioFetchingRef.current.has(addressKey)) {
        console.log(`⏭️ [WALLET_MANAGER] Portfolio fetch already in progress for ${addressKey.slice(0, 10)}...`);
        return;
      }

      // Skip if already in memory (unless forcing refresh)
      if (!forceRefresh && portfolioMap[addressKey] !== undefined) {
        console.log(`✅ [WALLET_MANAGER] Portfolio already in memory for ${addressKey.slice(0, 10)}...`);
        return;
      }

      // Check localStorage cache first (5 minutes TTL)
      if (!forceRefresh) {
        const cacheKey = `portfolio_${addressKey}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            if (Date.now() - parsedCache.timestamp < 300000) {
              console.log(`📦 [WALLET_MANAGER] Using cached portfolio for ${addressKey.slice(0, 10)}...`);
              setPortfolioMap(prev => ({ ...prev, [addressKey]: parsedCache.data }));
              return; // Don't fetch from API
            } else {
              console.log(`⏰ [WALLET_MANAGER] Cache expired for ${addressKey.slice(0, 10)}...`);
            }
          } catch (err) {
            console.warn('Invalid portfolio cache:', err);
          }
        }
      }

      // Only fetch from API if: no cache OR cache expired OR force refresh
      portfolioFetchingRef.current.add(addressKey);
      setPortfolioLoading(true);
      setPortfolioError(null);

      try {
        console.log(`🌐 [WALLET_MANAGER] Fetching portfolio from API for ${addressKey.slice(0, 10)}...`, { forceRefresh });

        const response = await fetch('/api/portfolio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: addressKey }), // Use lowercase address
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch portfolio');
        }

        const data = await response.json();
        setPortfolioMap(prev => ({ ...prev, [addressKey]: data }));

        // Cache the result
        const cacheKey = `portfolio_${addressKey}`;
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );

        console.log(`✅ [WALLET_MANAGER] Portfolio fetched and cached for ${addressKey.slice(0, 10)}...`);
      } catch (err) {
        console.error('Error fetching portfolio:', err);
        setPortfolioError(
          err instanceof Error ? err.message : 'Failed to fetch portfolio'
        );
        setPortfolioMap(prev => ({ ...prev, [addressKey]: null }));
      } finally {
        setPortfolioLoading(false);
        portfolioFetchingRef.current.delete(addressKey);
      }
    },
    [address, portfolioMap]
  );

  // Auto-fetch portfolio when address changes
  // Only fetch if we don't already have data (prevents redundant fetches on wallet switch)
  useEffect(() => {
    if (address) {
      const addressKey = address.toLowerCase();
      // Only fetch if not already in memory or cache
      if (portfolioMap[addressKey] === undefined) {
        fetchPortfolio();
      } else {
        console.log(`⏭️ [WALLET_MANAGER] Skipping auto-fetch, portfolio already available for ${addressKey.slice(0, 10)}...`);
      }
    }
  }, [address, fetchPortfolio, portfolioMap]);

  // Debug logging for address changes
  useEffect(() => {
    console.log('🔍 [WALLET_MANAGER] State update:', {
      primaryType,
      isParaActive,
      isEOAActive,
      paraConnected: para.isConnected,
      eoaConnected: eoa.isConnected,
      paraAddress: para.address,
      eoaAddress: eoa.address,
      finalAddress: address,
    });
  }, [primaryType, isParaActive, isEOAActive, para.isConnected, eoa.isConnected, para.address, eoa.address, address]);

  /**
   * Disconnect current active wallet
   * Special behavior: When disconnecting Para, also disconnect all EOA wallets
   */
  const disconnect = async () => {
    console.log('🔌 [WALLET_MANAGER] Disconnecting active wallet:', primaryType);
    
    // Determine if we should show disconnecting state (for visual feedback)
    // Show when: Para is disconnecting OR EOA is disconnecting without Para (full logout scenarios)
    const shouldShowDisconnectingState = isParaActive || (isEOAActive && !para.isConnected);

    console.log('🔌 [WALLET_MANAGER] Should show disconnecting state:', {
      shouldShowDisconnectingState,
      isParaActive,
      isEOAActive,
      paraIsConnected: para.isConnected,
      calculation: `${isParaActive} || (${isEOAActive} && !${para.isConnected})`
    });

    // Set disconnecting state at manager level for UI control
    if (shouldShowDisconnectingState) {
      setIsDisconnecting(true);
    }

    try {
      if (isParaActive) {
        // When disconnecting Para, disconnect everything
        console.log('🔌 [WALLET_MANAGER] Para is active, disconnecting all wallets');
        await Promise.allSettled([
          para.disconnect(),
          eoa.isConnected ? eoa.disconnect() : Promise.resolve(),
        ]);
        // Clear primary type - full logout
        setPrimaryType(null);
      } else if (isEOAActive) {
        // When disconnecting EOA, only disconnect EOA
        await eoa.disconnect();

        // If Para is still connected, switch to Para (acts like a wallet switch)
        // Otherwise, clear primary type (full logout)
        if (para.isConnected) {
          console.log('🔄 [WALLET_MANAGER] Para still connected, switching to Para');
          setPrimaryType('para');
        } else {
          console.log('🔌 [WALLET_MANAGER] No other wallets, clearing primary');
          setPrimaryType(null);
        }
      }

      // Add minimum delay to show disconnecting state for better UX
      if (shouldShowDisconnectingState) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      console.log('✅ [WALLET_MANAGER] Disconnect completed');
    } catch (error) {
      console.error('❌ [WALLET_MANAGER] Disconnect failed:', error);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  };

  /**
   * Disconnect all wallets (Para + EOA)
   */
  const disconnectAll = async () => {
    console.log('🔌 [WALLET_MANAGER] Disconnecting all wallets');
    
    const results = await Promise.allSettled([
      para.isConnected ? para.disconnect() : Promise.resolve(),
      eoa.isConnected ? eoa.disconnect() : Promise.resolve(),
    ]);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const walletType = index === 0 ? 'Para' : 'EOA';
        console.error(`❌ [WALLET_MANAGER] ${walletType} disconnect failed:`, result.reason);
      }
    });

    setPrimaryType(null);
    console.log('✅ [WALLET_MANAGER] Disconnect all completed');
  };

  /**
   * Switch between Para and EOA
   */
  const switchWallet = (type: 'para' | 'eoa') => {
    if (type === 'para' && !para.isConnected) {
      console.warn('⚠️ [WALLET_MANAGER] Cannot switch to Para - not connected');
      return;
    }
    if (type === 'eoa' && !eoa.isConnected) {
      console.warn('⚠️ [WALLET_MANAGER] Cannot switch to EOA - not connected');
      return;
    }
    
    setPrimaryType(type);
    console.log('✅ [WALLET_MANAGER] Switched to:', type);
  };

  /**
   * Switch EOA network (only works for EOA wallets)
   */
  const switchNetwork = async (chainId: number) => {
    if (!isEOAActive) {
      console.warn('⚠️ [WALLET_MANAGER] Cannot switch network - not on EOA wallet');
      return;
    }
    
    await eoa.switchNetwork(chainId);
  };

  /**
   * Get display name for current wallet
   */
  const getWalletDisplayName = () => {
    if (isParaActive) return 'Embedded Wallet (Para)';
    if (isEOAActive) return eoa.connectorName || 'External Wallet';
    return 'Not connected';
  };

  return {
    // Current active wallet state
    isConnected,
    address,
    isPara,
    chainId,
    primaryType,
    isDisconnecting, // Manager-level disconnecting state (controlled for UI)
    
    // Wallet information
    walletDisplayName: getWalletDisplayName(),
    
    // Identity (ENS)
    identity,
    identityLoading,

    // Portfolio data
    portfolio,
    portfolioLoading,
    portfolioError,
    refreshPortfolio: () => fetchPortfolio(true),

    // Authentication state (unified)
    email, // Unified email (Supabase or Para)
    paraEmail, // Para-specific email
    supabaseEmail, // Supabase-specific email
    supabaseUser, // Full Supabase user object
    supabaseLoading,
    supabaseInitialized,
    isAuthenticated: !!email, // Helper flag for authenticated state

    // Individual wallet states
    para,
    eoa,
    
    // Actions
    disconnect,
    disconnectAll,
    switchWallet,
    switchNetwork,
    setPrimaryType,
    
    // Supabase auth actions
    ...userMethods, // sendOtp, verifyOtp, signOut, supabase

    // Status flags
    hasMultipleWallets: para.isConnected && eoa.isConnected,
  };
}

