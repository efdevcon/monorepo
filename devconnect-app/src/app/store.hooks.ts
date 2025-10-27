'use client';

import { useEffect, useRef, useState } from 'react';
import { useGlobalStore } from './store.provider';
import {
  useUserData as useUserDataSWR,
  useTickets as useTicketsSWR,
  useFavorites as useFavoritesSWR,
} from '@/hooks/useServerData';
import { AppState } from './store';
import { usePathname } from 'next/navigation';
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

export const useAnnouncements = (updateOnPathnameChange = false) => {
  const pathname = usePathname();
  const announcements = useGlobalStore((state) => state.announcements);
  const [seenAnnouncements, setSeenAnnouncements] = useState<string[]>([]);

  const firstRun = useRef(true);

  useEffect(() => {
    // if (!updateOnPathnameChange) return;
    // Visiting /announcements marks all announcements as seen, but we only want them to be seen *after* they are seen (aka not immediately/on the first render)
    // ...so we only check for seen announcements on the very first render when visiting a page that uses useAnnouncements
    if (firstRun.current) {
      const seen = localStorage.getItem('seenAnnouncements');
      setSeenAnnouncements(seen ? JSON.parse(seen) : []);
      firstRun.current = false;
    }
  }, []);

  useEffect(() => {
    if (updateOnPathnameChange && pathname === '/announcements') {
      return () => {
        setSeenAnnouncements(
          announcements.map((announcement) => announcement.id)
        );
      };
    }
  }, [pathname]);

  return announcements.map((announcement) => ({
    ...announcement,
    seen: seenAnnouncements.includes(announcement.id),
  }));
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
    if (tickets) {
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
