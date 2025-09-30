import { useEffect } from 'react';
import useGlobalStore, { AppState } from './store';
import { useShallow } from 'zustand/react/shallow';
import { fetchAuth } from '@/services/apiClient';

export const useFavorites = () => {
  const favorites = useGlobalStore(
    useShallow((state) => state.userData?.favorite_events)
  );

  return favorites;
};

export const useAdditionalTicketEmails = () => {
  const additionalTicketEmails = useGlobalStore(
    useShallow((state) => state.userData?.additional_ticket_emails)
  );

  return additionalTicketEmails || [];
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
  const { setUserData } = useGlobalStore();

  useEffect(() => {
    if (isConnected) {
      ensureUserData(setUserData);
    } else {
      setUserData(null);
    }
  }, [isConnected]);
};
