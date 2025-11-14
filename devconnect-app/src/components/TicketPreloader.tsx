'use client';

import { useTickets } from '@/app/store.hooks';
import { useUserData } from '@/hooks/useServerData';
import { useEffect } from 'react';

/**
 * Silent background component that preloads tickets when user is authenticated.
 * This ensures tickets are available in the Zustand store for components like WalletTab
 * that check hasTicket status without having to visit the tickets page first.
 */
export default function TicketPreloader() {
  const { email } = useUserData();
  
  // Call useTickets hook - this will automatically fetch tickets when email is available
  // and store them in Zustand's persisted localStorage
  const { tickets, loading } = useTickets();

  // Debug logging (optional - can be removed in production)
  useEffect(() => {
    if (email && !loading && tickets) {
      const ticketCount = tickets.reduce(
        (sum, order) => sum + (order.tickets?.length || 0),
        0
      );
      console.log(
        `✅ [TicketPreloader] Preloaded ${ticketCount} ticket(s) for ${email}`
      );
    }
  }, [email, loading, tickets]);

  // This component renders nothing - it just triggers the data fetch
  return null;
}

