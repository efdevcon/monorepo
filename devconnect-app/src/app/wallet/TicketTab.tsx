'use client';

import { useUser } from '@/hooks/useUser';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { fetchAuth } from '@/services/apiClient';
import { useLocalStorage } from 'usehooks-ts';

interface Ticket {
  secret: string;
  attendeeName: string | null;
  attendeeEmail: string;
  price: string;
  itemName: string;
}

interface Order {
  orderCode: string;
  orderDate: string;
  email: string;
  tickets: Ticket[];
}

export default function TicketTab() {
  const { user, signOut, error, hasInitialized, supabase } = useUser();
  const { isParaConnected, email } = useUnifiedConnection();
  const [tickets, setTickets] = useLocalStorage<Order[]>('user-tickets', []);
  const [loading, setLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useLocalStorage<{ [key: string]: string }>(
    'user-qr-codes',
    {}
  );
  const isLoadingRef = useRef(false);

  // Auto-load tickets when component mounts
  useEffect(() => {
    const fetchTickets = async (forceRefresh = false) => {
      if (isLoadingRef.current) {
        console.log('Already fetching tickets, skipping...');
        return;
      }

      // If we have cached tickets and not forcing refresh, skip fetch
      if (!forceRefresh && tickets.length > 0) {
        console.log('Using cached tickets, skipping fetch');
        return;
      }

      isLoadingRef.current = true;
      setLoading(true);
      setTicketError(null);

      try {
        // Use fetchAuth - automatically handles auth
        const response = await fetchAuth<{ tickets: Order[] }>(
          '/api/auth/tickets'
        );

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
        setTicketError(
          err instanceof Error ? err.message : 'Failed to load tickets'
        );
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    // Only fetch if we have a user (either from Supabase or Para)
    if (user || email) {
      fetchTickets();
    }
  }, [user, email]);

  // Function to refresh tickets
  const refreshTickets = async () => {
    if (isLoadingRef.current) return;

    // Clear cache and fetch fresh data
    setTickets([]);
    setQrCodes({});

    // Trigger fetch with force refresh
    const fetchTickets = async () => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;
      setLoading(true);
      setTicketError(null);

      try {
        const response = await fetchAuth<{ tickets: Order[] }>(
          '/api/auth/tickets'
        );
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
        setTicketError(
          err instanceof Error ? err.message : 'Failed to load tickets'
        );
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    await fetchTickets();
  };

  return (
    <div className="w-full py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Profile</h2>
        <div className="text-gray-600">{email}</div>
      </div>

      <div className="w-full mb-8">
        <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold">Your Tickets</h3>
          <button
            onClick={refreshTickets}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md transition-colors text-sm self-start sm:self-auto"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {ticketError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {ticketError}
          </div>
        )}

        <div className="w-full space-y-4">
          {loading && (
            <div className="w-full bg-gray-50 border border-gray-200 text-gray-600 px-4 py-8 rounded-lg">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mb-2"></div>
                <div>Loading tickets...</div>
              </div>
            </div>
          )}

          {!loading && !ticketError && tickets.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded">
              No tickets found for your account.
            </div>
          )}

          {!loading &&
            tickets.length > 0 &&
            tickets.map((order) => (
              <div
                key={order.orderCode}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="mb-3">
                  <div className="font-semibold">Order: {order.orderCode}</div>
                  <div className="text-sm text-gray-600">
                    Date: {new Date(order.orderDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-4">
                  {order.tickets.map((ticket, idx) => (
                    <div
                      key={ticket.secret || idx}
                      className="bg-gray-50 p-3 sm:p-4 rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-lg">
                            {ticket.attendeeName || 'No name provided'}
                          </div>
                          <div className="text-gray-600 text-sm mt-1">
                            {ticket.attendeeEmail}
                          </div>
                          <div className="text-gray-600 text-sm">
                            {ticket.itemName}
                          </div>
                          <div className="text-gray-600 text-sm">
                            Price: {ticket.price}
                          </div>
                          {ticket.secret && (
                            <div className="text-xs text-gray-500 mt-2 font-mono break-all">
                              {ticket.secret}
                            </div>
                          )}
                        </div>
                        {ticket.secret && qrCodes[ticket.secret] && (
                          <div className="flex-shrink-0 self-center sm:self-auto">
                            <img
                              src={qrCodes[ticket.secret]}
                              alt="Ticket QR Code"
                              className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-gray-300 rounded mx-auto sm:mx-0"
                            />
                            <div className="text-xs text-center text-gray-500 mt-1">
                              Scan at venue
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* <div className="text-center">
        <button
          onClick={signOut}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
        >
          Sign out
        </button>
        {error && hasInitialized && (
          <div className="text-red-600 mt-2">{error}</div>
        )}
      </div> */}
    </div>
  );
}
