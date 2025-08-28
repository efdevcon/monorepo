'use client';

import { useUser } from '@/hooks/useUser';
import { useEffect, useState } from 'react';

interface Ticket {
  ticketId: string;
  attendeeName: string | null;
  attendeeEmail: string;
  price: string;
}

interface Order {
  orderCode: string;
  orderDate: string;
  email: string;
  tickets: Ticket[];
}

export default function ProfileTab() {
  const { user, signOut, error, hasInitialized, supabase } = useUser();
  const [tickets, setTickets] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTickets() {
      if (!user || !supabase) return;

      setLoading(true);
      setTicketError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('No active session');
        }

        const response = await fetch('/api/tickets', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch tickets');
        }

        const data = await response.json();
        setTickets(data.tickets || []);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setTicketError(err instanceof Error ? err.message : 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [user, supabase]);

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Profile</h2>
        <div className="text-gray-600">{user?.email}</div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Your Tickets</h3>
        
        {loading && (
          <div className="text-center py-4">Loading tickets...</div>
        )}

        {ticketError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {ticketError}
          </div>
        )}

        {!loading && !ticketError && tickets.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded">
            No tickets found for your account.
          </div>
        )}

        {!loading && tickets.length > 0 && (
          <div className="space-y-4">
            {tickets.map((order) => (
              <div key={order.orderCode} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <div className="font-semibold">Order: {order.orderCode}</div>
                  <div className="text-sm text-gray-600">
                    Date: {new Date(order.orderDate).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {order.tickets.map((ticket, idx) => (
                    <div key={ticket.ticketId || idx} className="bg-gray-50 p-3 rounded">
                      <div className="text-sm">
                        <div className="font-medium">
                          {ticket.attendeeName || 'No name provided'}
                        </div>
                        <div className="text-gray-600">
                          {ticket.attendeeEmail}
                        </div>
                        <div className="text-gray-600">
                          Price: {ticket.price}
                        </div>
                        {ticket.ticketId && (
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {ticket.ticketId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={signOut}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
        >
          Sign out
        </button>
        {error && hasInitialized && (
          <div className="text-red-600 mt-2">{error}</div>
        )}
      </div>
    </div>
  );
}
