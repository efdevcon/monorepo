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
        console.log('🔄 [SWR] Auth state changed:', event, 'Session:', !!session);

        try {
          // Refresh all user-related data when auth state changes
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            console.log('🔄 [SWR] Invalidating user data cache');
            mutate('/api/auth/user-data');
            mutate('/api/auth/tickets');
          } else if (event === 'INITIAL_SESSION' && session?.user) {
            // If there's a valid session on initial load (e.g., after reconnection), refresh data
            console.log('🔄 [SWR] Initial session with valid user, invalidating cache');
            mutate('/api/auth/user-data');
            mutate('/api/auth/tickets');
          } else if (event === 'INITIAL_SESSION') {
            console.log('🔄 [SWR] Initial session without user, skipping cache invalidation');
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
 * Fetch and cache user data from Supabase
 * Automatically revalidates on window focus
 */
export function useUserData(fallbackData?: UserData) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data?: UserData;
  }>('/api/auth/user-data', fetchAuth, {
    fallbackData: fallbackData
      ? { success: true, data: fallbackData }
      : undefined,
    revalidateOnFocus: true, // Refresh when tab regains focus
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
    shouldRetryOnError: false, // Don't retry if no auth session
    onError: (err) => {
      // Only log errors if it's not an auth-related error
      if (!err?.message?.includes('No active Supabase session') &&
        !err?.message?.includes('Para biometric verification')) {
        console.error('Failed to fetch user data:', err);
      }
    },
  });

  return {
    userData: data?.data || null,
    email: data?.data?.email,
    additionalTicketEmails: data?.data?.additional_ticket_emails || [],
    favoriteEvents: data?.data?.favorite_events || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

// ===== Tickets =====

interface TicketsResponse {
  success: boolean;
  data?: {
    tickets: Order[];
  };
}

/**
 * Fetch and cache tickets with auto-generated QR codes
 * Only fetches when user email is available
 * Accepts fallback data from localStorage to avoid regenerating QR codes
 */
export function useTickets(
  fallbackData?: Order[],
  fallbackQrCodes?: { [key: string]: string }
) {
  const { email } = useUserData(); // Wait for email before fetching tickets

  const { data, error, isLoading, mutate } = useSWR<TicketsResponse>(
    // Only fetch if email exists (dependency on user being logged in)
    email ? '/api/auth/tickets' : null,
    fetchAuth,
    {
      fallbackData: fallbackData
        ? { success: true, data: { tickets: fallbackData } }
        : undefined,
      revalidateOnFocus: false, // Don't refetch tickets on focus (expensive QR generation)
      dedupingInterval: 10000, // Dedupe within 10 seconds
      onError: (err) => {
        console.error('Error fetching tickets:', err);
        toast.error('Failed to load tickets');
      },
    }
  );

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

      setQrCodes(newQrCodes);
    };

    generateQRCodes();
  }, [data?.data?.tickets]);

  return {
    tickets: data?.data?.tickets || [],
    qrCodes,
    loading: isLoading,
    error,
    refresh: mutate,
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

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [useRefreshOnAuthChange] Auth state changed:', event, 'Session:', !!session);

      try {
        // Refresh on sign-in or initial session with valid user (after reconnection)
        if (event === 'SIGNED_IN') {
          console.log('🔄 [useRefreshOnAuthChange] User signed in, refreshing data');
          refreshUserData();
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          console.log('🔄 [useRefreshOnAuthChange] Initial session with valid user, refreshing data');
          refreshUserData();
        } else if (event === 'INITIAL_SESSION') {
          console.log('🔄 [useRefreshOnAuthChange] Initial session without user, skipping refresh');
        }
      } catch (error) {
        // Silently handle errors during HMR or component unmounting
        console.warn('🔄 [useRefreshOnAuthChange] Failed to refresh data:', error);
      }
    });

    return () => {
      try {
        authListener.subscription.unsubscribe();
      } catch (error) {
        // Ignore unsubscribe errors during cleanup
      }
    };
  }, [refreshUserData]);
}
