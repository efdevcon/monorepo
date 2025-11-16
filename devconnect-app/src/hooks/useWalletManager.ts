'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParaWalletConnection } from './useParaWallet';
import { useEOAWalletConnection } from './useEOAWallet';
import { useUser } from './useUser';
import { ensureUserData, useEnsureUserData } from '@/app/store.hooks';
import { useAutoParaJwtExchange } from './useAutoParaJwtExchange';
import { useInitParaJwt } from './useInitParaJwt';
import { normalize } from 'viem/ens';
import { mainnet, base } from 'viem/chains';
import { createPublicClient, http, toCoinType, parseAbi, type Address } from 'viem';
import { useLocalStorage } from 'usehooks-ts';
import { APP_CONFIG } from '@/config/config';

const PRIMARY_WALLET_TYPE_KEY = 'devconnect_primary_wallet_type';

export type WalletType = 'para' | 'eoa' | null;

interface WalletIdentity {
  name: string | null;
  avatar: string | null;
  worldfairName: string | null; // Separate field for worldfair.eth even if primary name is different
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

export interface PeanutClaimingState {
  link: string;
  amount: number;
  claimed_date: string | null;
  ticket_secret_proof: string | null;
  peanut_claimed: boolean | null; // Actual blockchain state from Peanut protocol
  tx_hash: string | null; // Transaction hash from Peanut API
  db_claimed_by_address: string | null; // Database state
  db_claimed_by_user_email: string | null;
  error?: string;
}

export interface PortfolioData {
  totalValue: number;
  tokenBalances: TokenBalance[];
  recentActivity: RecentActivity[];
  peanutClaimingState?: PeanutClaimingState | null;
  worldfairDomain?: string | null; // The worldfair.eth domain name if owned (e.g., "didierkrux.worldfair.eth")
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
  const {
    user: supabaseUser,
    loading: supabaseLoading,
    hasInitialized: supabaseInitialized,
    ...userMethods
  } = useUser();
  const [, setUserIsConnected] = useLocalStorage<boolean | null>('userIsConnected', false);

  // Track disconnecting state at manager level for better UI control
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Track multiple wallets state to ensure reactivity
  const [hasMultipleWallets, setHasMultipleWallets] = useState(false);

  // Track when Para JWT becomes ready (to trigger portfolio auto-fetch)
  const [paraJwtReadyTrigger, setParaJwtReadyTrigger] = useState(0);

  // Listen for Para JWT ready event
  useEffect(() => {
    const handleParaJwtReady = () => {
      console.log('🔑 [WALLET_MANAGER] Para JWT ready event received, triggering portfolio fetch check');
      setParaJwtReadyTrigger(prev => prev + 1);
    };

    window.addEventListener('paraJwtReady', handleParaJwtReady);
    return () => window.removeEventListener('paraJwtReady', handleParaJwtReady);
  }, []);

  // Update hasMultipleWallets when addresses change
  useEffect(() => {
    const newValue = !!(para.address && eoa.address);
    // console.log('💎 [WALLET_MANAGER] hasMultipleWallets updating:', {
    //   paraAddress: para.address,
    //   eoaAddress: eoa.address,
    //   oldValue: hasMultipleWallets,
    //   newValue,
    // });
    setHasMultipleWallets(newValue);
  }, [para.address, eoa.address, hasMultipleWallets]);

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
        // console.log(`🔄 [WALLET_MANAGER #${hookId}] Storage change detected:`, {
        //   oldValue: e.oldValue,
        //   newValue,
        // });
        setPrimaryTypeState(newValue);
      }
    };

    // Also listen for custom events (for same-window updates)
    const handleCustomEvent = (e: CustomEvent) => {
      const newValue = e.detail as WalletType;
      // console.log(`🔄 [WALLET_MANAGER #${hookId}] Custom event received:`, {
      //   newValue,
      //   currentValue: primaryType,
      // });
      setPrimaryTypeState(newValue);
    };

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener(
      'primaryWalletTypeChange',
      handleCustomEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageChange as EventListener
      );
      window.removeEventListener(
        'primaryWalletTypeChange',
        handleCustomEvent as EventListener
      );
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
        window.dispatchEvent(
          new CustomEvent('primaryWalletTypeChange', { detail: type })
        );
      } else {
        localStorage.removeItem(PRIMARY_WALLET_TYPE_KEY);
        console.log('✅ [WALLET_MANAGER] Cleared primary wallet type');

        // Dispatch custom event
        window.dispatchEvent(
          new CustomEvent('primaryWalletTypeChange', { detail: null })
        );
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
  const address = isParaActive
    ? para.address
    : isEOAActive
      ? eoa.address
      : null;
  const isPara = isParaActive;
  const chainId = isParaActive
    ? para.chainId
    : isEOAActive
      ? eoa.chainId
      : null;

  // Store primary address in localStorage for error reporting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (address) {
        localStorage.setItem('devconnect_primary_address', address);
      } else {
        localStorage.removeItem('devconnect_primary_address');
      }
    }
  }, [address]);

  // Unified authentication state
  const paraEmail = para.email;
  const supabaseEmail = supabaseUser?.email || null;
  const email = supabaseEmail || paraEmail; // Prioritize Supabase email, fallback to Para

  // Hack for demo - this is not good, once we figure out proper server/client rendering, we should remove this
  if (email && typeof window !== 'undefined') {
    localStorage.setItem('loginIsSkipped', 'true');
  }

  // ✨ NEW: Initialize Para JWT capability (always enabled)
  // This ensures Para's issueJwt function is ready for direct authentication
  // No token exchange, just initialization of Para's JWT capability
  useInitParaJwt({
    paraConnected: para.isConnected,
    paraAddress: para.address,
  });

  // 🔄 LEGACY: Auto-exchange Para JWT → Supabase session (DISABLED BY DEFAULT)
  // ✨ NEW DEFAULT: Para JWTs work directly with backend (no exchange needed!)
  //
  // Auto-exchange is DISABLED by default (new architecture)
  // To ENABLE legacy auto-exchange: Set NEXT_PUBLIC_ENABLE_AUTO_JWT_EXCHANGE=true
  //
  // This hook is kept for backward compatibility but not used by default
  useAutoParaJwtExchange({
    paraConnected: para.isConnected,
    paraAddress: para.address,
    supabaseHasUser: !!supabaseUser,
    supabaseInitialized,
  });

  // Sync authentication state to global store (for RequiresAuthHOC and other components)
  // Note: Para users may or may not have a Supabase session (depends on auto-exchange)
  // But they can still authenticate via direct Para JWT to backend!
  const hasValidSupabaseAuth = supabaseInitialized && !!supabaseUser;

  // Log comprehensive user authentication state
  useEffect(() => {
    const canIssueParaJwt =
      typeof para !== 'undefined' &&
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
          ? '✅ Para ready - JWT sent directly to backend (NEW FLOW!)'
          : '❌ Para cannot issue JWT yet - biometric verification needed',
      },
      // Supabase state
      supabase: {
        initialized: supabaseInitialized,
        loading: supabaseLoading,
        hasUser: !!supabaseUser,
        userId: supabaseUser?.id,
        email: supabaseUser?.email,
        note: !!supabaseUser
          ? '✅ Has Supabase session (EOA or legacy Para exchange)'
          : para.isConnected
            ? '🔄 No Supabase session yet (auto-exchange in progress as fallback)'
            : '❌ No Supabase session',
      },
      // Unified state
      unified: {
        email,
        isAuthenticated: !!email,
        primaryAuthMethod: canIssueParaJwt ? 'para-direct' : !!supabaseUser ? 'supabase' : 'none',
      },
      // Connection state
      connection: {
        isConnected,
        address,
        isPara,
        primaryType,
      },
      // ✨ NEW Authentication Flow
      authFlow: {
        primary: canIssueParaJwt
          ? '✅ Para JWT → Direct backend verification (SIMPLIFIED!)'
          : !!supabaseUser
            ? '✅ Supabase JWT → Backend verification (EOA users)'
            : '❌ No active authentication',
        legacy: para.isConnected && !supabaseUser
          ? '🔄 Auto JWT exchange running (creates Supabase session as fallback)'
          : '⏸️ Legacy exchange not needed',
        whatToKnow: canIssueParaJwt
          ? '🎉 You are using the NEW simplified flow! Para JWT works directly with backend.'
          : para.isConnected
            ? '⏳ Complete biometric verification to enable direct Para JWT flow'
            : !!supabaseUser
              ? '✅ EOA user authenticated via Supabase'
              : '❌ Please connect a wallet',
      },
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

  // Debug: Log address computation and multi-wallet state
  // console.log(`🔍 [WALLET_MANAGER #${hookId}] Address computed:`, {
  //   address: address ? address.slice(0, 10) + '...' : null,
  //   fullAddress: address,
  //   isPara,
  //   isParaActive,
  //   isEOAActive,
  //   paraAddress: para.address?.slice(0, 10) + '...',
  //   eoaAddress: eoa.address?.slice(0, 10) + '...',
  //   paraFullAddress: para.address,
  //   eoaFullAddress: eoa.address,
  //   hasMultipleWallets: !!(para.address && eoa.address),
  //   primaryType,
  // });

  // ============================================
  // Identity Resolution (ENS) - Store per address
  // ============================================
  const [identityMap, setIdentityMap] = useLocalStorage<
    Record<string, WalletIdentity | null>
    >('wallet_identity_map', {});
  const [, setEnsName] = useLocalStorage('ens_name', '');
  const [, setEnsAvatar] = useLocalStorage('ens_avatar', '');
  const [identityLoading, setIdentityLoading] = useState(false);
  const identityFetchingRef = useRef<Set<string>>(new Set());

  // Get identity for current address (memoized to prevent unnecessary re-renders)
  const identity = useMemo(() => {
    const result = address ? identityMap[address.toLowerCase()] || null : null;
    // console.log(`🔍 [WALLET_MANAGER #${hookId}] Identity lookup:`, {
    //   address: address ? address.slice(0, 10) + '...' : null,
    //   hasIdentity: !!result,
    //   identityName: result?.name,
    //   identityMapKeys: Object.keys(identityMap).map(
    //     (k) => k.slice(0, 10) + '...'
    //   ),
    // });
    return result;
  }, [address, identityMap, hookId]);

  // Resolve identity for a specific address
  const resolveIdentityForAddress = useCallback(
    async (targetAddress: string, force: boolean = false) => {
      const addressKey = targetAddress.toLowerCase();

      // If we already have identity for this address, skip (unless forced)
      if (!force && identityMap[addressKey] !== undefined) {
        return;
      }

      // If we're already fetching this address, skip
      if (identityFetchingRef.current.has(addressKey)) {
        return;
      }

      identityFetchingRef.current.add(addressKey);
      setIdentityLoading(true);

      try {
        console.log(
          `🔍 [WALLET_MANAGER] [identity] Resolving identity for ${addressKey}`
        );

        const rpcUrl = APP_CONFIG.ALCHEMY_APIKEY
          ? `https://eth-mainnet.g.alchemy.com/v2/${APP_CONFIG.ALCHEMY_APIKEY}`
          : 'https://cloudflare-eth.com'; // Public fallback

        // console.log(`[identity] Using RPC: ${rpcUrl.split('/').slice(0, -1).join('/')}/***`);

        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(rpcUrl),
        });

        // Create Base client for L2 reverse lookups
        const baseRpcUrl = APP_CONFIG.ALCHEMY_APIKEY
          ? `https://base-mainnet.g.alchemy.com/v2/${APP_CONFIG.ALCHEMY_APIKEY}`
          : 'https://mainnet.base.org';
        
        const baseClient = createPublicClient({
          chain: base,
          transport: http(baseRpcUrl),
        });

        // Try ENS on mainnet first (prioritized)
        let ensName: string | null = null;
        try {
          console.log(`[identity] Trying ENS lookup for ${addressKey}`);
          ensName = await publicClient.getEnsName({
            address: addressKey as `0x${string}`,
            gatewayUrls: ['https://ccip.ens.xyz'],
          });
          console.log(`[identity] ENS result:`, ensName);
        } catch (err) {
          // ENS not found or lookup failed
          console.warn('[identity] ENS lookup failed:', err instanceof Error ? err.message : String(err));
        }

        // If no ENS, try basename on Base as fallback (with timeout)
        let basename: string | null = null;
        if (!ensName) {
          try {
            const coinType = toCoinType(base.id);
            console.log(`[identity] Trying basename lookup for ${addressKey}, coinType: ${coinType}`);

            // Add timeout to prevent hanging
            const basenamePromise = publicClient.getEnsName({
              address: addressKey as `0x${string}`,
              coinType,
              gatewayUrls: ['https://ccip.ens.xyz'],
            });

            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => {
                console.warn('[identity] Basename lookup timed out after 2s');
                resolve(null);
              }, 2000)
            );

            basename = await Promise.race([basenamePromise, timeoutPromise]);
            console.log(`[identity] Basename result:`, basename);
          } catch (err) {
            // Basename not found or contract reverted - this is normal
            console.warn('[identity] Basename lookup failed:', err instanceof Error ? err.message : String(err));
          }
        }

        // Check for worldfair.eth L2 reverse name on Base
        // Always check this regardless of ENS/basename to detect worldfair.eth ownership
        let worldfairName: string | null = null;
        let worldfairNftName: string | null = null; // Track worldfair.eth NFT ownership separately

        // ✅ ALWAYS try L2 reverse lookup first (fast, accurate)
        try {
          console.log(`[identity] Checking for L2 reverse name (worldfair.eth) via registrar lookup`);

          // Optimistic L2 reverse resolution (instant, no propagation delay)
          // This queries the L2 reverse registrar directly and verifies forward resolution
          try {
            console.log(`[identity] Trying optimistic L2 reverse resolution on Base`);

            // Step 1: Get the L2 reverse registrar address from L1
            const reverseNamespace = `${toCoinType(base.id).toString(16)}.reverse`;
            console.log(`[identity] Reverse namespace:`, reverseNamespace);

            const chainReverseResolver = await publicClient.getEnsResolver({
              name: reverseNamespace,
            });
            console.log(`[identity] Chain reverse resolver:`, chainReverseResolver);

            if (!chainReverseResolver) {
              throw new Error('No reverse resolver found for Base chain');
            }

            // Step 2: Get the L2 registrar address from the resolver
            const l2ReverseRegistrar = await publicClient.readContract({
              address: chainReverseResolver,
              abi: parseAbi(['function l2Registrar() view returns (address)']),
              functionName: 'l2Registrar',
            });
            console.log(`[identity] L2 reverse registrar:`, l2ReverseRegistrar);

            // Step 3: Query the L2 registrar directly on Base for the reverse name
            const reverseName = await baseClient.readContract({
              address: l2ReverseRegistrar as Address,
              abi: parseAbi(['function nameForAddr(address) view returns (string)']),
              functionName: 'nameForAddr',
              args: [addressKey as Address],
            });
            console.log(`[identity] Reverse name from L2 registrar:`, reverseName);

            // Step 4: Verify forward resolution (ensure the name actually points back to this address)
            if (reverseName) {
              console.log(`[identity] Found L2 reverse name: ${reverseName}, verifying forward resolution...`);

              const forwardAddr = await publicClient.getEnsAddress({
                name: reverseName,
                coinType: toCoinType(base.id),
              });
              console.log(`[identity] Forward resolution result:`, forwardAddr);

              if (forwardAddr?.toLowerCase() === addressKey.toLowerCase()) {
                worldfairName = reverseName;
                console.log(`[identity] ✅ Found and verified L2 reverse name via registrar:`, worldfairName);
              } else {
                console.warn(`[identity] ⚠️ Forward resolution mismatch: ${forwardAddr} !== ${addressKey}`);
              }
            } else {
              console.log(`[identity] ℹ️ No L2 reverse name set on Base registrar`);
            }
          } catch (err) {
            console.warn('[identity] ❌ L2 reverse registrar lookup failed:', err instanceof Error ? err.message : String(err));
          }
        } catch (err) {
          console.warn('[identity] L2 reverse name check failed:', err instanceof Error ? err.message : String(err));
        }

        // ⚠️ FALLBACK: Only check NFT API if no L2 reverse name was found
        // NFT API is slower and less accurate, so only use as last resort
        if (!worldfairName && APP_CONFIG.ALCHEMY_APIKEY) {
          try {
            console.log(`[identity] L2 registrar lookup didn't find worldfair.eth, falling back to NFT API scan`);

            const worldfairContract = '0xD6A7dCDEe200Fa37F149323C0aD6b3698Aa0E829';
            const alchemyResponse = await fetch(
              `https://base-mainnet.g.alchemy.com/nft/v3/${APP_CONFIG.ALCHEMY_APIKEY}/getNFTsForOwner?owner=${addressKey}&contractAddresses=${worldfairContract}&withMetadata=true&excludeFilters=SPAM&excludeFilters=AIRDROPS&pageSize=100`,
              {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                },
              }
            );

            if (alchemyResponse.ok) {
              const alchemyData = await alchemyResponse.json();
              console.log(`[identity] Alchemy NFT API returned ${alchemyData.ownedNfts?.length || 0} worldfair.eth NFTs`);

              // Look through owned NFTs for worldfair.eth domains
              if (alchemyData.ownedNfts && Array.isArray(alchemyData.ownedNfts)) {
                for (const nft of alchemyData.ownedNfts) {
                  const name = nft.name || nft.raw?.metadata?.name || nft.title || nft.metadata?.name || '';
                  const description = nft.description || nft.metadata?.description || '';

                  // Look for worldfair.eth in the NFT metadata
                  if (name.endsWith('.worldfair.eth')) {
                    worldfairNftName = name;
                    console.log(`[identity] ✅ Found worldfair.eth name via NFT API fallback:`, worldfairNftName);
                    break;
                  } else if (description.includes('.worldfair.eth')) {
                    const match = description.match(/([a-zA-Z0-9-]+\.worldfair\.eth)/);
                    if (match) {
                      worldfairNftName = match[1];
                      console.log(`[identity] ✅ Extracted worldfair.eth name from NFT description (fallback):`, worldfairNftName);
                      break;
                    }
                  }
                }
              }
            }

            // Use worldfair NFT name if found via fallback
            if (worldfairNftName) {
              worldfairName = worldfairNftName;
            }
          } catch (err) {
            console.warn('[identity] Worldfair.eth NFT API fallback failed:', err instanceof Error ? err.message : String(err));
          }
        }

        const name = ensName || basename || worldfairName;
        let avatar: string | null = null;

        // Try to get avatar for ENS first (prioritized)
        if (ensName) {
          try {
            console.log(`[identity] Trying ENS avatar for ${ensName}`);
            avatar = await publicClient.getEnsAvatar({
              name: normalize(ensName),
              gatewayUrls: ['https://ccip.ens.xyz'],
            });
            console.log(`[identity] ENS avatar result:`, avatar ? 'found' : 'null');
          } catch (err) {
            console.warn('[identity] ENS avatar lookup failed:', err instanceof Error ? err.message : String(err));
          }
        }

        // If no ENS avatar, try basename avatar as fallback
        if (!avatar && basename) {
          try {
            console.log(`[identity] Trying basename avatar for ${basename}`);
            avatar = await publicClient.getEnsAvatar({
              name: normalize(basename),
              gatewayUrls: ['https://ccip.ens.xyz'],
            });
            console.log(`[identity] Basename avatar result:`, avatar ? 'found' : 'null');
          } catch (err) {
            console.warn('[identity] Basename avatar lookup failed:', err instanceof Error ? err.message : String(err));
          }
        }

        // If no ENS or basename avatar, try L2 name avatar as fallback
        if (!avatar && worldfairName) {
          try {
            console.log(`[identity] Trying L2 name avatar for ${worldfairName}`);
            avatar = await publicClient.getEnsAvatar({
              name: normalize(worldfairName),
              gatewayUrls: ['https://ccip.ens.xyz'],
            });
            console.log(`[identity] L2 name avatar result:`, avatar ? 'found' : 'null');
          } catch (err) {
            console.warn('[identity] L2 name avatar lookup failed:', err instanceof Error ? err.message : String(err));
          }
        }

        const resolvedIdentity: WalletIdentity = {
          name,
          avatar,
          worldfairName: worldfairName, // worldfair.eth from L2 reverse lookup or NFT ownership (may be null)
        };

        setIdentityMap((prev) => ({
          ...prev,
          [addressKey]: resolvedIdentity,
        }));

        console.log(
          `✅ [WALLET_MANAGER] [identity] Identity resolved for ${addressKey}:`,
          {
            name,
            hasAvatar: !!avatar,
            type: ensName ? 'ENS' : basename ? 'basename' : worldfairName ? 'L2 name' : 'none',
            worldfairName: worldfairName, // worldfair.eth from either L2 reverse or NFT
          }
        );
      } catch (err) {
        console.error('[identity] Error resolving identity:', err instanceof Error ? err.message : String(err));
        setIdentityMap((prev) => ({ ...prev, [addressKey]: null }));
      } finally {
        setIdentityLoading(false);
        identityFetchingRef.current.delete(addressKey);
      }
    },
    [identityMap, setIdentityMap]
  );

  // Auto-resolve identities for all connected wallets
  useEffect(() => {
    const addressesToResolve: string[] = [];

    // Add Para address if connected
    if (para.isConnected && para.address) {
      addressesToResolve.push(para.address);
    }

    // Add EOA address if connected
    if (eoa.isConnected && eoa.address) {
      addressesToResolve.push(eoa.address);
    }

    // Resolve identity for each address
    addressesToResolve.forEach((addr) => {
      resolveIdentityForAddress(addr);
    });
  }, [
    para.isConnected,
    para.address,
    eoa.isConnected,
    eoa.address,
    resolveIdentityForAddress,
  ]);

  // Force refresh identity when active address changes (wallet switching)
  const prevAddressRef = useRef<string | null>(null);
  useEffect(() => {
    if (address && address !== prevAddressRef.current) {
      console.log(`[identity] Active address changed from ${prevAddressRef.current} to ${address}, forcing refresh`);
      resolveIdentityForAddress(address, true); // Force refresh
      prevAddressRef.current = address;
    }
  }, [address, resolveIdentityForAddress]);

  // Update global ENS name/avatar when active address or identity changes
  useEffect(() => {
    if (address && identity !== undefined) {
      const currentName = identity?.name || '';
      const currentAvatar = identity?.avatar || '';
      console.log(`[identity] Updating global ENS for active address ${address.slice(0, 10)}...`, {
        name: currentName,
        hasAvatar: !!currentAvatar,
      });
      setEnsName(currentName);
      setEnsAvatar(currentAvatar);
    } else if (!address) {
      // Clear ENS when no address
      setEnsName('');
      setEnsAvatar('');
    }
  }, [address, identity, setEnsName, setEnsAvatar]);

  // ============================================
  // Portfolio Data - Store all portfolios in single global cache
  // ============================================
  const [portfolioCache, setPortfolioCache] = useLocalStorage<
    Record<string, PortfolioData>
  >('portfolio', {});

  // Refresh trigger to force useMemo recomputation when portfolio is updated
  const [portfolioRefreshTrigger, setPortfolioRefreshTrigger] = useState(0);

  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<{
    message: string;
    address?: string;
    errorType?: string;
  } | null>(null);
  const portfolioFetchingRef = useRef(false);
  const initialFetchAttemptedRef = useRef<Set<string>>(new Set()); // Track addresses we've attempted to fetch

  // Get portfolio for current address from cache (convenience accessor)
  // To access portfolios for other addresses, use portfolioCache[address]
  const portfolio = useMemo(() => {
    const addressKey = address?.toLowerCase();
    const result = addressKey ? portfolioCache[addressKey] || null : null;
    // console.log(`🔍 [WALLET_MANAGER #${hookId}] Portfolio lookup:`, {
    //   address: address ? address.slice(0, 10) + '...' : null,
    //   hasPortfolio: !!result,
    //   totalValue: result?.totalValue,
    //   cachedAddresses: Object.keys(portfolioCache).length,
    //   refreshTrigger: portfolioRefreshTrigger,
    // });
    return result;
  }, [address, portfolioCache, portfolioRefreshTrigger, hookId]);

  // Fetch portfolio only when explicitly called (manual refresh only)
  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      console.warn('⚠️ [WALLET_MANAGER] Cannot fetch portfolio - no address');
      return;
    }

    // Prevent concurrent API calls
    if (portfolioFetchingRef.current) {
      console.log(
        `⏭️ [WALLET_MANAGER] Portfolio fetch already in progress for ${address.slice(0, 10)}...`
      );
      return;
    }

    portfolioFetchingRef.current = true;
    setPortfolioLoading(true);
    setPortfolioError(null);

    try {
      const addressKey = address.toLowerCase();
      console.log(
        `🌐 [WALLET_MANAGER] Fetching portfolio from API for ${address.slice(0, 10)}...`
      );

      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: addressKey,
          email: email || undefined, // Include email if user is authenticated (for peanut claiming state)
        }),
      });

      if (!response.ok) {
        // Extract error details from API response
        const errorData = await response.json();
        const errorInfo = {
          message: errorData.error || 'Failed to fetch portfolio',
          address: errorData.address || addressKey,
          errorType: errorData.errorType || 'UNKNOWN_ERROR',
        };
        throw errorInfo;
      }

      const data = await response.json();

      // Save to global portfolio cache with address as key
      setPortfolioCache((prev) => ({
        ...prev,
        [addressKey]: data,
      }));

      // Increment refresh trigger to force useMemo recomputation
      setPortfolioRefreshTrigger(prev => prev + 1);

      console.log(
        `✅ [WALLET_MANAGER] Portfolio fetched and cached for ${address.slice(0, 10)}...`
      );
    } catch (err: any) {
      console.error('Error fetching portfolio:', err);
      setPortfolioError({
        message: err.message || (err instanceof Error ? err.message : 'Failed to fetch portfolio'),
        address: err.address || address.toLowerCase(),
        errorType: err.errorType || 'UNKNOWN_ERROR',
      });
    } finally {
      setPortfolioLoading(false);
      portfolioFetchingRef.current = false;
    }
  }, [address, email, setPortfolioCache]);

  // Auto-fetch portfolio ONCE if not in cache (first-time load only)
  useEffect(() => {
    if (!address) return;

    const addressKey = address.toLowerCase();

    // Check if we have cached data for this address
    const hasCachedData = !!portfolioCache[addressKey];

    // Check if we've already attempted to fetch for this address
    const alreadyAttempted = initialFetchAttemptedRef.current.has(addressKey);

    // Check if we're currently fetching
    const currentlyFetching = portfolioFetchingRef.current;

    // Check if user is authenticated (has email) - preferred for peanut claiming state
    // Portfolio API works without auth, but won't include peanut claiming state
    const isAuthenticated = !!email;

    console.log(
      `🔍 [WALLET_MANAGER] Auto-fetch check for ${addressKey.slice(0, 10)}...`,
      {
        hasCachedData,
        alreadyAttempted,
        currentlyFetching,
        isAuthenticated,
        willFetch: !hasCachedData && !alreadyAttempted && !currentlyFetching && isAuthenticated,
      }
    );

    // Only fetch if: authenticated (has email) AND no cached data AND haven't attempted before AND not currently fetching
    // Wait for email to ensure we get peanut claiming state in the response
    if (isAuthenticated && !hasCachedData && !alreadyAttempted && !currentlyFetching) {
      console.log(
        `📡 [WALLET_MANAGER] Auto-fetching portfolio for ${addressKey.slice(0, 10)}... (first time)`
      );

      // Mark this address as attempted BEFORE starting the fetch
      initialFetchAttemptedRef.current.add(addressKey);

      // Trigger the fetch
      fetchPortfolio();
    }
  }, [address, email, portfolioCache, fetchPortfolio, paraJwtReadyTrigger]);

  // Debug logging for address changes
  useEffect(() => {
    const hasMultiple = !!(para.address && eoa.address);
    // console.log('🔍 [WALLET_MANAGER] State update:', {
    //   primaryType,
    //   isParaActive,
    //   isEOAActive,
    //   paraConnected: para.isConnected,
    //   eoaConnected: eoa.isConnected,
    //   paraAddress: para.address,
    //   eoaAddress: eoa.address,
    //   finalAddress: address,
    //   hasMultipleWallets: hasMultiple,
    // });

    // Extra log when both wallets are connected
    // if (para.isConnected && eoa.isConnected) {
    //   console.log('🔥 [WALLET_MANAGER] BOTH WALLETS CONNECTED!', {
    //     paraAddress: para.address,
    //     eoaAddress: eoa.address,
    //     hasMultipleWallets: hasMultiple,
    //     calculation: `!!(${para.address} && ${eoa.address}) = ${hasMultiple}`,
    //   });
    // }
  }, [
    primaryType,
    isParaActive,
    isEOAActive,
    para.isConnected,
    eoa.isConnected,
    para.address,
    eoa.address,
    address,
  ]);

  /**
   * Disconnect current active wallet
   * Special behavior: When disconnecting Para, also disconnect all EOA wallets
   */
  const disconnect = async () => {
    console.log(
      '🔌 [WALLET_MANAGER] Disconnecting active wallet:',
      primaryType
    );

    // Determine if we should show disconnecting state (for visual feedback)
    // Show when: Para is disconnecting OR EOA is disconnecting without Para (full logout scenarios)
    const shouldShowDisconnectingState =
      isParaActive || (isEOAActive && !para.isConnected);

    console.log('🔌 [WALLET_MANAGER] Should show disconnecting state:', {
      shouldShowDisconnectingState,
      isParaActive,
      isEOAActive,
      paraIsConnected: para.isConnected,
      calculation: `${isParaActive} || (${isEOAActive} && !${para.isConnected})`,
    });

    // Set disconnecting state at manager level for UI control
    if (shouldShowDisconnectingState) {
      setIsDisconnecting(true);
      setUserIsConnected(false);
    }

    try {
      if (isParaActive) {
        // When disconnecting Para, disconnect everything
        console.log(
          '🔌 [WALLET_MANAGER] Para is active, disconnecting all wallets'
        );
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
          console.log(
            '🔄 [WALLET_MANAGER] Para still connected, switching to Para'
          );
          setPrimaryType('para');
        } else {
          console.log('🔌 [WALLET_MANAGER] No other wallets, clearing primary');
          setPrimaryType(null);
        }
      }

      // Add minimum delay to show disconnecting state for better UX
      if (shouldShowDisconnectingState) {
        await new Promise((resolve) => setTimeout(resolve, 800));
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
        console.error(
          `❌ [WALLET_MANAGER] ${walletType} disconnect failed:`,
          result.reason
        );
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
      console.warn(
        '⚠️ [WALLET_MANAGER] Cannot switch network - not on EOA wallet'
      );
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

  /**
   * Trigger portfolio refresh after a delay
   * Used to refresh portfolio after transaction completion
   */
  const triggerDelayedPortfolioRefresh = useCallback((delayMs: number = 3000) => {
    console.log(`⏳ [WALLET_MANAGER] Triggering delayed portfolio refresh in ${delayMs}ms`);
    setTimeout(() => {
      console.log('🔄 [WALLET_MANAGER] Executing delayed portfolio refresh');
      setPortfolioRefreshTrigger(prev => prev + 1);

      // Also fetch fresh portfolio data from API
      if (address) {
        fetchPortfolio();
      }
    }, delayMs);
  }, [address, fetchPortfolio]);

  useEnsureUserData(email);

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
    resolveIdentityForAddress, // Expose for manual identity refresh (e.g., after ENS claim)

    // Portfolio data
    portfolio, // Current address's portfolio only
    portfolioCache, // All cached portfolios by address
    portfolioRefreshTrigger, // Trigger to force useMemo recomputation
    portfolioLoading,
    portfolioError,
    refreshPortfolio: fetchPortfolio, // Manual refresh to update existing data
    triggerDelayedPortfolioRefresh, // Delayed refresh for transaction completion

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
    hasMultipleWallets,
  };
}
