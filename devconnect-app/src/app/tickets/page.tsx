'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useWalletManager } from '@/hooks/useWalletManager';
import { fetchAuth } from '@/services/apiClient';
import { useLocalStorage } from 'usehooks-ts';
import VoxelButton from 'lib/components/voxel-button/button';
import { toast } from 'sonner';
import { useAdditionalTicketEmails, ensureUserData } from '@/app/store.hooks';
import { useGlobalStore } from '@/app/store.provider';
import { RequiresAuthHOC } from '@/components/RequiresAuthHOC';
import { homeTabs } from '../page-content';
import PageLayout from '@/components/PageLayout';

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

const TicketWrapper = () => {
  return (
    <PageLayout title="World's Fair" tabs={homeTabs()}>
      <TicketTab />
    </PageLayout>
  );
};

const TicketTab = RequiresAuthHOC(() => {
  const additionalTicketEmails = useAdditionalTicketEmails();
  const setUserData = useGlobalStore((state) => state.setUserData);
  const email = useGlobalStore((state) => state.userData?.email);
  const [tickets, setTickets] = useLocalStorage<Order[]>('user-tickets', []);
  const [loading, setLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useLocalStorage<{ [key: string]: string }>(
    'user-qr-codes',
    {}
  );
  const isLoadingRef = useRef(false);
  // Additional email state
  const [checkYourEmail, setCheckYourEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loadingAdditionalEmail, setLoadingAdditionalEmail] = useState(false);

  const fetchTickets = async (forceRefresh = true) => {
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

      console.log('ticketsData', ticketsData);

      // Generate QR codes for each ticket
      const newQrCodes: { [key: string]: string } = {};
      for (const order of ticketsData) {
        for (const ticket of order.tickets) {
          console.log('ticket', ticket);
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

  // Auto-load tickets when component mounts
  useEffect(() => {
    // Only fetch if we have a user (either from Supabase or Para)
    if (email) {
      fetchTickets();
    }
  }, [email]);

  return (
    <div className="w-full py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="w-full mb-8">
        {ticketError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {ticketError}
          </div>
        )}

        <div className="w-full space-y-2">
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
              <>
                {/* <div
                  key={order.orderCode}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="mb-3">
                    <div className="font-semibold">
                      Order: {order.orderCode}
                    </div>
                    <div className="text-sm text-gray-600">
                      Date: {new Date(order.orderDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="space-y-4"> */}
                {order.tickets.map((ticket, idx) => (
                  <div
                    key={ticket.secret || idx}
                    className="bg-gray-100 p-3 sm:p-4 border border-solid border-gray-200"
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
                          Ticket type: {ticket.itemName}
                        </div>
                        <div className="text-gray-600 text-sm">
                          Order code: {order.orderCode}
                        </div>
                        {/* <div className="text-gray-600 text-sm">
                            Price: {ticket.price}
                          </div> */}
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
                {/* </div>
                </div> */}
              </>
            ))}

          <div className="flex gap-4 items-center space-evenly my-4">
            <div className="w-auto shrink grow h-px bg-gray-300" />
            <p className="text-sm text-gray-600 shrink-0">
              Your connected email addresses
            </p>
            <div className="w-auto shrink grow h-px bg-gray-300" />
          </div>

          <div className="flex flex-col text-center text-xs font-medium">
            <div className="">{email}</div>
            {additionalTicketEmails.map((email: string) => (
              <div key={email} className="">
                {email}
              </div>
            ))}
          </div>

          <div className="flex gap-4 items-center space-evenly mt-4">
            <div className="w-auto shrink grow h-px bg-gray-300" />
            <p className="text-sm text-gray-600 shrink-0">
              Is your ticket on a different email address?
            </p>
            <div className="w-auto shrink grow h-px bg-gray-300" />
          </div>

          <div className="flex  mt-4 flex-col sm:justify-center sm:items-center">
            <VoxelButton
              size="sm"
              className=""
              onClick={async () => {
                const email = prompt('Enter your email address');

                if (email) {
                  setLoadingAdditionalEmail(true);
                  setVerificationCode('');
                  setCheckYourEmail('');

                  const response = await fetchAuth<{ email: string }>(
                    '/api/auth/tickets/attach-email',
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        email,
                        // Can't use localhost for this even if its inconvenient in dev - we are using the actual domain to match on type of OTP to send in supabase
                        redirectTo: 'https://app.devconnect.org/wallet/tickets',
                      }),
                    }
                  );

                  if (response.success) {
                    setCheckYourEmail(email);

                    toast.success('Check your email for a verification code.');
                  } else {
                    console.error('Error adding email: ' + response.error);

                    toast.error('Something went wrong. Try again later.');
                  }

                  setLoadingAdditionalEmail(false);
                }
              }}
            >
              {loadingAdditionalEmail
                ? 'Preparing...'
                : 'Add another email address'}
            </VoxelButton>
            {checkYourEmail && (
              <div className="text-sm text-gray-800 mt-2 text-center mt-6 flex flex-col items-center max-w-[95%]">
                <div>
                  Check <span className="font-bold">{checkYourEmail}</span> for
                  a verification code:
                </div>
                <input
                  type="text"
                  className="border border-neutral-300 w-full border-[1px] outline-none p-2 px-4 mt-2 text-center"
                  value={verificationCode}
                  placeholder="Enter verification code"
                  onChange={(e) => setVerificationCode(e.target.value)}
                />

                <VoxelButton
                  size="sm"
                  className="mt-2"
                  color="green-1"
                  disabled={verificationCode.length !== 6}
                  onClick={async () => {
                    setVerifyingCode(true);

                    const response = await fetchAuth<{ email: string }>(
                      '/api/auth/tickets/verify-email-ownership',
                      {
                        method: 'POST',
                        body: JSON.stringify({
                          emailToVerify: checkYourEmail,
                          verificationCode,
                        }),
                      }
                    );

                    if (response.success) {
                      toast.success('Email verified successfully!');

                      // Ensure user data reflects the updataed email
                      await ensureUserData(setUserData);

                      // Fetch tickets again (since we added a new email)
                      await fetchTickets();
                    } else {
                      if (response.error) {
                        toast.error(response.error);
                      } else {
                        toast.error('Something went wrong. Try again later.');
                      }
                    }

                    setVerifyingCode(false);
                  }}
                >
                  {verifyingCode ? 'Verifying...' : 'Verify code'}{' '}
                  {verificationCode.length !== 6 && '(6 digits required)'}
                </VoxelButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TicketWrapper;
