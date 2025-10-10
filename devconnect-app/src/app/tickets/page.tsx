'use client';

import { useEffect, useState } from 'react';
import { fetchAuth } from '@/services/apiClient';
import VoxelButton from 'lib/components/voxel-button/button';
import { toast } from 'sonner';
import {
  useAdditionalTicketEmails,
  ensureUserData,
  useTickets,
} from '@/app/store.hooks';
import { useGlobalStore } from '@/app/store.provider';
import { RequiresAuthHOC } from '@/components/RequiresAuthHOC';
import { homeTabs } from '../navigation';
import PageLayout from '@/components/PageLayout';

const TicketWrapper = () => {
  return (
    <PageLayout title="Ethereum World's Fair" tabs={homeTabs()}>
      <TicketTab />
    </PageLayout>
  );
};

const TicketTab = RequiresAuthHOC(() => {
  const additionalTicketEmails = useAdditionalTicketEmails();
  const setUserData = useGlobalStore((state) => state.setUserData);
  const email = useGlobalStore((state) => state.userData?.email);

  // Use the tickets hook from store
  const { tickets, loading, qrCodes, refresh } = useTickets();

  // Additional email state
  const [checkYourEmail, setCheckYourEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loadingAdditionalEmail, setLoadingAdditionalEmail] = useState(false);
  const hasTickets = tickets && tickets.length > 0;

  return (
    <div className="w-full py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="w-full mb-8">
        <div className="w-full space-y-2">
          {loading && !hasTickets && (
            <div className="w-full bg-gray-50 border border-gray-200 text-gray-600 px-4 py-8 rounded-lg">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mb-2"></div>
                <div>Loading tickets...</div>
              </div>
            </div>
          )}

          {!loading && tickets.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded">
              No tickets found for your account.
            </div>
          )}

          {hasTickets &&
            tickets.map((order) => (
              <>
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
                      await ensureUserData(setUserData);
                      await refresh();
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
