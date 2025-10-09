'use client';

import { useEffect, useState } from 'react';
import { useGlobalStore } from './store.provider';
import { useShallow } from 'zustand/react/shallow';
import { fetchAuth } from '@/services/apiClient';
import { toast } from 'sonner';
import { requireAuth } from '@/components/RequiresAuth';
import { AppState } from './store';
// import { useWalletManager } from '@/hooks/useWalletManager';

export const useFavorites = () => {
  const userData = useGlobalStore(useShallow((state) => state.userData));
  const favorites =
    useGlobalStore((state) => {
      return state.userData?.favorite_events;
    }) || [];
  const setFavoriteEvents = useGlobalStore((state) => state.setFavoriteEvents);

  const updateFavorite = (eventId: string) => {
    if (!userData) {
      requireAuth(
        'You need to be authenticated to add events to your favorites.'
      );
      return;
    }

    const nextFavoriteEvents = favorites?.includes(eventId)
      ? favorites?.filter((existingEvent: string) => existingEvent !== eventId)
      : [...(favorites || []), eventId];

    setFavoriteEvents(nextFavoriteEvents);

    fetchAuth('/api/auth/favorites', {
      method: 'POST',
      body: JSON.stringify({ favoriteEvents: nextFavoriteEvents }),
    }).then((response) => {
      if (!response.success) {
        toast.error(
          'There was an error updating your favorites. Check your connection and try again.'
        );
      }
    });
  };

  return [favorites, updateFavorite] as [string[], (eventId: string) => void];
};

export const useAdditionalTicketEmails = () => {
  const additionalTicketEmails = useGlobalStore(
    useShallow((state) => state.userData?.additional_ticket_emails)
  );

  return additionalTicketEmails || [];
};

export const useEvents = () => {
  const events = useGlobalStore((state) => state.events);
  return events || [];
};

export const ensureUserData = async (
  setUserData: (userData: AppState['userData']) => void
) => {
  const userData = await fetchAuth('/api/auth/user-data');

  if (userData.success) {
    setUserData(userData.data);
  } else {
    console.error('Failed to fetch user data from supabase');
  }
};

// Hook to ensure user data is loaded from supabase whenever connection status changes
export const useEnsureUserData = (isConnected: boolean) => {
  const setUserData = useGlobalStore((state) => state.setUserData);

  useEffect(() => {
    if (isConnected) {
      console.log('ensuring user data');
      ensureUserData(setUserData);
    } else {
      setUserData(null);
    }
  }, [isConnected]);

  // Ensure user data is loaded whenever the window is focused (for when user returns from background, in case user updated its data on different device)
  useEffect(() => {
    const handleFocus = () => {
      if (isConnected) {
        ensureUserData(setUserData);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected, setUserData]);
};
