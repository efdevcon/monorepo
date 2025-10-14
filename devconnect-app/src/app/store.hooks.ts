'use client';

import { useEffect, useState, useRef } from 'react';
import { useGlobalStore } from './store.provider';
import { useShallow } from 'zustand/react/shallow';
import { fetchAuth } from '@/services/apiClient';
import { toast } from 'sonner';
import { requireAuth } from '@/components/RequiresAuth';
import { AppState, Order } from './store';
import QRCode from 'qrcode';
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

// Fetch tickets and generate QR codes
export const fetchTickets = async (
  setTickets: (tickets: Order[] | null) => void,
  setTicketsLoading: (loading: boolean) => void,
  setQrCodes: (qrCodes: { [key: string]: string }) => void
) => {
  setTicketsLoading(true);

  try {
    const response = await fetchAuth<{ tickets: Order[] }>('/api/auth/tickets');

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch tickets');
    }

    const ticketsData = response.data.tickets || [];
    setTickets(ticketsData);

    // Generate QR codes for each ticket
    const newQrCodes: { [key: string]: string } = {};
    for (const order of ticketsData) {
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
          } catch (qrErr) {
            console.error('Error generating QR code:', qrErr);
          }
        }
      }
    }
    setQrCodes(newQrCodes);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    toast.error(err instanceof Error ? err.message : 'Failed to load tickets');
  } finally {
    setTicketsLoading(false);
  }
};

// Hook to fetch and manage tickets
export const useTickets = () => {
  const additionalTicketEmails = useAdditionalTicketEmails();
  const email = useGlobalStore((state) => state.userData?.email);
  const tickets = useGlobalStore((state) => state.tickets);
  const ticketsLoading = useGlobalStore((state) => state.ticketsLoading);
  const qrCodes = useGlobalStore((state) => state.qrCodes);
  const setTickets = useGlobalStore((state) => state.setTickets);
  const setTicketsLoading = useGlobalStore((state) => state.setTicketsLoading);
  const setQrCodes = useGlobalStore((state) => state.setQrCodes);
  const isLoadingRef = useRef(false);

  const refresh = async () => {
    if (isLoadingRef.current) {
      console.log('Already fetching tickets, skipping...');
      return;
    }

    isLoadingRef.current = true;
    await fetchTickets(setTickets, setTicketsLoading, setQrCodes);
    isLoadingRef.current = false;
  };

  // Auto-fetch tickets when email is available
  useEffect(() => {
    if (email) {
      refresh();
    }
  }, [email, additionalTicketEmails]);

  return {
    tickets: tickets || [],
    loading: ticketsLoading,
    qrCodes,
    refresh,
  };
};
