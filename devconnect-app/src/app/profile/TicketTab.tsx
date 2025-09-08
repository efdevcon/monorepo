'use client';

import { useUser } from '@/hooks/useUser';
import { useState } from 'react';
import QRCode from 'qrcode';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { para } from '@/config/para';

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
  const [tickets, setTickets] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});

  // Manual fetch function with protection against multiple calls
  const fetchTickets = async () => {
    if (loading) {
      console.log('Already fetching tickets, skipping...');
      return;
    }

    setLoading(true);
    setTicketError(null);

    try {
      let authToken: string;

      if (isParaConnected) {
        // Get Para JWT when connected via Para
        const { token: paraJwt } = await para.issueJwt();
        authToken = paraJwt;
        console.log('Para JWT:', paraJwt);
      } else if (supabase && user) {
        // Use Supabase session token for regular authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('No active session');
        }
        authToken = session.access_token;
      } else {
        throw new Error('No active session');
      }

      const response = await fetch('/api/tickets', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'X-Auth-Method': isParaConnected ? 'para' : 'supabase',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tickets');
      }

      const data = await response.json();
      const ticketsData = data.tickets || [];
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
    }
  };

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Profile</h2>
        <div className="text-gray-600">{email}</div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Your Tickets</h3>
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            {loading ? 'Loading...' : 'Load Tickets'}
          </button>
        </div>

        {loading && <div className="text-center py-4">Loading tickets...</div>}

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
                      className="bg-gray-50 p-4 rounded-lg"
                    >
                      <div className="flex gap-4">
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
                          <div className="flex-shrink-0">
                            <img
                              src={qrCodes[ticket.secret]}
                              alt="Ticket QR Code"
                              className="w-32 h-32 border-2 border-gray-300 rounded"
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
        )}
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
