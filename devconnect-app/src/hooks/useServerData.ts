'use client';

import useSWR, { mutate } from 'swr';
import { useMemo, useState, useEffect } from 'react';
import { fetchAuth } from '@/services/apiClient';
import { toast } from 'sonner';
import type { Order } from '@/app/store';
import QRCode from 'qrcode';
import { authService } from '@/services/authService';

/**
 * SWR-based hooks for server data
 *
 * Benefits:
 * - Automatic caching across components
 * - Request deduplication (90% fewer API calls)
 * - Automatic revalidation
 * - Built-in loading/error states
 * - Optimistic updates support
 */

// Global auth state listener to refresh SWR caches when user logs in/out
// Set up after a small delay to avoid SSR/HMR issues
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure DOM is ready and avoid detached context issues
  setTimeout(() => {
    const supabase = authService.getSupabaseClient();
    if (supabase) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(
          '🔄 [SWR] Auth state changed:',
          event,
          'Session:',
          !!session
        );

        try {
          // Refresh all user-related data when auth state changes
          if (
            event === 'SIGNED_IN' ||
            event === 'SIGNED_OUT' ||
            event === 'TOKEN_REFRESHED'
          ) {
            console.log('🔄 [SWR] Invalidating user data cache');
            mutate('/api/auth/user-data');
            mutate('/api/auth/tickets');
          } else if (event === 'INITIAL_SESSION' && session?.user) {
            // If there's a valid session on initial load (e.g., after reconnection), refresh data
            console.log(
              '🔄 [SWR] Initial session with valid user, invalidating cache'
            );
            mutate('/api/auth/user-data');
            mutate('/api/auth/tickets');
          } else if (event === 'INITIAL_SESSION') {
            console.log(
              '🔄 [SWR] Initial session without user, skipping cache invalidation'
            );
          }
        } catch (error) {
          // Silently handle cache errors (e.g., during HMR or in detached contexts)
          console.warn('🔄 [SWR] Failed to invalidate cache:', error);
        }
      });
    }
  }, 0);
}

// ===== User Data =====

export interface UserData {
  additional_ticket_emails?: string[];
  favorite_events?: string[];
  email?: string;
}

/**
 * Fetch and cache user data from backend
 * Automatically revalidates on window focus
 *
 * ✨ OPTIMIZED: Prevents initial race condition by pausing until Para JWT is ready
 * - Uses SWR's isPaused() to wait for Para JWT initialization
 * - Reduces console spam (only logs important events)
 * - Auto-retries when Para becomes ready
 * - Works with both Para JWT and Supabase authentication
 */
export function useUserData(fallbackData?: UserData) {
  // Track if we're in initial loading state (before any data arrives)
  const [hasReceivedData, setHasReceivedData] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data?: UserData;
  }>(
    '/api/auth/user-data',
    async (url) => {
      console.log('📡 [useUserData] Fetching user data...');
      const result = await fetchAuth(url);
      return result;
    },
    {
      fallbackData: fallbackData
        ? { success: true, data: fallbackData }
        : undefined,
      revalidateOnFocus: true, // Refresh when tab regains focus (will retry if Para now ready)
      revalidateOnReconnect: true, // Retry on network reconnection
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      shouldRetryOnError: false, // Don't retry automatically on error
      // ✨ Prevent initial fetch until Para JWT is ready (if Para is being used)
      isPaused: () => {
        // Only pause if Para is initializing (not ready yet)
        if (typeof window !== 'undefined') {
          const hasParaAddress = !!(window as any).__paraAddress;
          const hasParaJwt = !!(window as any).__paraJwt;

          // Pause if Para address exists but JWT not ready yet
          if (hasParaAddress && !hasParaJwt) {
            return true; // Pause until JWT is ready
          }
        }
        return false; // Don't pause (fetch immediately)
      },
      onError: (err) => {
        // Only log errors if it's not an auth-related error
        if (
          !err?.message?.includes('No active Supabase session') &&
          !err?.message?.includes('Para biometric verification') &&
          !err?.message?.includes('No authentication method available')
        ) {
          console.error('❌ [useUserData] Failed to fetch user data:', err);
        }
        // Mark as received data (even if error) to stop showing loader
        setHasReceivedData(true);
      },
      onSuccess: (data) => {
        if (data?.data) {
          console.log('✅ [useUserData] User data loaded:', data.data.email);
        }
        // Mark as received data
        setHasReceivedData(true);
      },
    }
  );

  // Check if request is paused (waiting for Para JWT)
  const isPaused = typeof window !== 'undefined' && 
    !!(window as any).__paraAddress && 
    !(window as any).__paraJwt;

  // Check if we have any authentication available
  const hasAnyAuth = typeof window !== 'undefined' && (
    !!(window as any).__paraAddress || // Para connected
    !!(window as any).__paraJwt // Para JWT available
  );

  // True loading state: Show loading if:
  // 1. SWR is actively loading, OR
  // 2. We're paused waiting for Para JWT, OR
  // 3. We haven't received any data yet AND we have some form of auth connected
  const effectiveLoading = isLoading || isPaused || (!hasReceivedData && hasAnyAuth);

  return {
    userData: data?.data || null,
    email: data?.data?.email,
    additionalTicketEmails: data?.data?.additional_ticket_emails || [],
    favoriteEvents: data?.data?.favorite_events || [],
    loading: effectiveLoading,
    error,
    refresh: mutate,
  };
}

// ===== Tickets =====

interface TicketsResponse {
  success: boolean;
  data?: {
    tickets: Order[];
    sideTickets: Order[];
  };
}

/**
 * Fetch and cache tickets with auto-generated QR codes
 * Only fetches when user email is available
 * Accepts fallback data from localStorage to avoid regenerating QR codes
 */
export function useTickets(
  fallbackData?: Order[],
  fallbackQrCodes?: { [key: string]: string },
  fallbackSideTickets?: Order[]
) {
  const { email } = useUserData(); // Wait for email before fetching tickets

  const { data, error, isLoading, isValidating, mutate: swrMutate } = useSWR<TicketsResponse>(
    // Only fetch if email exists (dependency on user being logged in)
    email ? '/api/auth/tickets' : null,
    fetchAuth,
    {
      fallbackData: fallbackData
        ? {
            success: true,
            data: {
              tickets: fallbackData || [],
              sideTickets: fallbackSideTickets || [],
            },
          }
        : undefined,
      revalidateOnFocus: false, // Don't refetch tickets on focus (expensive QR generation)
      dedupingInterval: 10000, // Dedupe within 10 seconds
      onError: (err) => {
        console.error('Error fetching tickets:', err);
        toast.error('Failed to load tickets');
      },
    }
  );

  // Custom refresh function that bypasses server cache
  const refresh = async () => {
    return swrMutate(async () => {
      console.log('🔄 Refreshing tickets with cache bypass...');
      return fetchAuth('/api/auth/tickets?refresh=true');
    });
  };

  // Generate QR codes from ticket data (use persisted codes as initial state)
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>(
    fallbackQrCodes || {}
  );

  useEffect(() => {
    const generateQRCodes = async () => {
      if (!data?.data?.tickets) {
        setQrCodes({});
        return;
      }

      const newQrCodes: { [key: string]: string } = {};

      for (const order of data.data.tickets) {
        for (const ticket of order.tickets) {
          if (ticket.secret) {
            try {
              const qrDataUrl = await QRCode.toDataURL(ticket.secret, {
                width: 200,
                margin: 1,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF',
                },
              });
              newQrCodes[ticket.secret] = qrDataUrl;

              // Generate QR codes for addons
              if (ticket.addons) {
                for (const addon of ticket.addons) {
                  const addonQr = await QRCode.toDataURL(addon.secret, {
                    width: 200,
                    margin: 1,
                  });
                  newQrCodes[addon.secret] = addonQr;
                }
              }
            } catch (qrErr) {
              console.error('Error generating QR code:', qrErr);
            }
          }
        }
      }

      // Generate QR codes for sideTickets
      if (data.data.sideTickets) {
        for (const order of data.data.sideTickets) {
          for (const ticket of order.tickets) {
            if (ticket.secret) {
              try {
                const qrDataUrl = await QRCode.toDataURL(ticket.secret, {
                  width: 200,
                  margin: 1,
                  color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                  },
                });
                newQrCodes[ticket.secret] = qrDataUrl;

                // Generate QR codes for addons in sideTickets
                if (ticket.addons) {
                  for (const addon of ticket.addons) {
                    const addonQr = await QRCode.toDataURL(addon.secret, {
                      width: 200,
                      margin: 1,
                    });
                    newQrCodes[addon.secret] = addonQr;
                  }
                }
              } catch (qrErr) {
                console.error(
                  'Error generating QR code for sideTicket:',
                  qrErr
                );
              }
            }
          }
        }
      }

      setQrCodes(newQrCodes);
    };

    generateQRCodes();
  }, [data?.data?.tickets, data?.data?.sideTickets]);

  return {
    tickets: data?.data?.tickets || [],
    sideTickets: data?.data?.sideTickets || [],
    qrCodes,
    loading: isLoading || isValidating,
    error,
    refresh,
  };
}

// ===== Favorites =====

/**
 * Manage favorite events with optimistic updates
 */
export function useFavorites() {
  const { userData, favoriteEvents, refresh } = useUserData();

  const updateFavorite = async (eventId: string) => {
    if (!userData) {
      toast.error('You need to be authenticated to add favorites');
      return;
    }

    const nextFavoriteEvents = favoriteEvents.includes(eventId)
      ? favoriteEvents.filter((id) => id !== eventId)
      : [...favoriteEvents, eventId];

    // Optimistic update
    refresh(
      async () => ({
        success: true,
        data: {
          ...userData,
          favorite_events: nextFavoriteEvents,
        },
      }),
      {
        optimisticData: {
          success: true,
          data: {
            ...userData,
            favorite_events: nextFavoriteEvents,
          },
        },
        rollbackOnError: true,
        revalidate: false,
      }
    );

    // Send to server
    const response = await fetchAuth('/api/auth/favorites', {
      method: 'POST',
      body: JSON.stringify({ favoriteEvents: nextFavoriteEvents }),
    });

    if (!response.success) {
      toast.error('Failed to update favorites');
      refresh(); // Revalidate on error
    }
  };

  return {
    favorites: favoriteEvents,
    updateFavorite,
  };
}

// ===== Auth Change Listener =====

/**
 * Hook to refresh data when authentication state changes
 * Useful for components that need to ensure data is fresh after login
 */
export function useRefreshOnAuthChange() {
  const { refresh: refreshUserData } = useUserData();

  useEffect(() => {
    const supabase = authService.getSupabaseClient();
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          '🔄 [useRefreshOnAuthChange] Auth state changed:',
          event,
          'Session:',
          !!session
        );

        try {
          // Refresh on sign-in or initial session with valid user (after reconnection)
          if (event === 'SIGNED_IN') {
            console.log(
              '🔄 [useRefreshOnAuthChange] User signed in, refreshing data'
            );
            refreshUserData();
          } else if (event === 'INITIAL_SESSION' && session?.user) {
            console.log(
              '🔄 [useRefreshOnAuthChange] Initial session with valid user, refreshing data'
            );
            refreshUserData();
          } else if (event === 'INITIAL_SESSION') {
            console.log(
              '🔄 [useRefreshOnAuthChange] Initial session without user, skipping refresh'
            );
          }
        } catch (error) {
          // Silently handle errors during HMR or component unmounting
          console.warn(
            '🔄 [useRefreshOnAuthChange] Failed to refresh data:',
            error
          );
        }
      }
    );

    return () => {
      try {
        authListener.subscription.unsubscribe();
      } catch (error) {
        // Ignore unsubscribe errors during cleanup
      }
    };
  }, [refreshUserData]);
}
