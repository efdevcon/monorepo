'use client';

import { useEffect } from 'react';
import { useGlobalStore } from './store.provider';
import {
  useUserData as useUserDataSWR,
  useTickets as useTicketsSWR,
  useFavorites as useFavoritesSWR,
} from '@/hooks/useServerData';
import { AppState } from './store';
// import { useWalletManager } from '@/hooks/useWalletManager';

/**
 * Manage favorite events (now using SWR)
 * Returns: [favorites, updateFavorite]
 */
export const useFavorites = () => {
  const { favorites, updateFavorite } = useFavoritesSWR();
  return [favorites, updateFavorite] as [string[], (eventId: string) => void];
};

/**
 * Get additional ticket emails (now using SWR)
 */
export const useAdditionalTicketEmails = () => {
  const { additionalTicketEmails } = useUserDataSWR();
  return additionalTicketEmails;
};

export const useEvents = () => {
  const events = useGlobalStore((state) => state.events);
  return events || [];
};

/**
 * Manually fetch and update user data (for backward compatibility)
 * Note: Most code should use useUserData() hook instead
 */
export const ensureUserData = async (
  setUserData: (userData: AppState['userData']) => void
) => {
  // Direct fetch for backward compatibility
  const { fetchAuth } = await import('@/services/apiClient');
  const userData = await fetchAuth('/api/auth/user-data');

  if (userData.success) {
    setUserData(userData.data);
  } else {
    console.error('Failed to fetch user data from supabase');
  }
};

/**
 * Hook to ensure user data is loaded (now uses SWR, no manual refetching needed)
 * SWR automatically handles revalidation on focus and reconnect
 */
export const useEnsureUserData = (email: string | undefined) => {
  // SWR handles all the caching and revalidation automatically
  // We just need to use the hook - it will fetch when email is available
  const { userData, refresh } = useUserDataSWR();

  // Optionally sync to Zustand for backward compatibility
  const setUserData = useGlobalStore((state) => state.setUserData);

  useEffect(() => {
    if (userData) {
      setUserData(userData);
    } else if (!email) {
      setUserData(null);
    }
  }, [userData, email, setUserData]);
};

/**
 * Hook to fetch and manage tickets (now using SWR)
 * SWR automatically handles caching, deduplication, and revalidation
 * Uses Zustand's persisted localStorage data as fallback for instant loading
 */
export const useTickets = () => {
  // Get persisted data from Zustand to use as fallback
  const persistedTickets = useGlobalStore((state) => state.tickets);
  const persistedQrCodes = useGlobalStore((state) => state.qrCodes);

  // Initialize SWR with persisted data so tickets and QR codes appear instantly on page load
  const { tickets, qrCodes, loading, refresh } = useTicketsSWR(
    persistedTickets || undefined,
    persistedQrCodes
  );

  // Sync fresh data back to Zustand for persistence
  const setTickets = useGlobalStore((state) => state.setTickets);
  const setQrCodes = useGlobalStore((state) => state.setQrCodes);
  const setTicketsLoading = useGlobalStore((state) => state.setTicketsLoading);

  useEffect(() => {
    // Only update Zustand if we have actual data (not just fallback)
    if (tickets && tickets.length > 0) {
      setTickets(tickets);
      setQrCodes(qrCodes);
    }
    setTicketsLoading(loading);
  }, [tickets, qrCodes, loading, setTickets, setQrCodes, setTicketsLoading]);

  return {
    tickets,
    loading,
    qrCodes,
    refresh,
  };
};
