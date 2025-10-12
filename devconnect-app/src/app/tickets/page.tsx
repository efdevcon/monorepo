'use client';

import { useState } from 'react';
import { fetchAuth } from '@/services/apiClient';
import VoxelButton from 'lib/components/voxel-button/button';
import { toast } from 'sonner';
import TicketImage from '@/images/devconnect-arg-ticket.png';
import Image from 'next/image';
import { ChevronDown, LockKeyhole, Mail } from 'lucide-react';
import {
  useAdditionalTicketEmails,
  ensureUserData,
  useTickets,
} from '@/app/store.hooks';
import { useGlobalStore } from '@/app/store.provider';
import { RequiresAuthHOC } from '@/components/RequiresAuthHOC';
import { homeTabs } from '../navigation';
import PageLayout from '@/components/PageLayout';
import moment from 'moment';
import cn from 'classnames';

const TicketWrapper = () => {
  return (
    <PageLayout title="Ethereum World's Fair" tabs={homeTabs()}>
      <TicketTab />
    </PageLayout>
  );
};

const ConnectedEmails = () => {
  const additionalTicketEmails = useAdditionalTicketEmails();
  const setUserData = useGlobalStore((state) => state.setUserData);
  const email = useGlobalStore((state) => state.userData?.email);
  const { refresh } = useTickets();

  const [checkYourEmail, setCheckYourEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loadingAdditionalEmail, setLoadingAdditionalEmail] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* <div className="flex gap-4 items-center space-evenly my-4">
        <div className="w-auto shrink grow h-px bg-gray-300" />
        <p className="text-sm text-gray-600 shrink-0">
          Your connected email addresses
        </p>
        <div className="w-auto shrink grow h-px bg-gray-300" />
      </div> */}

      <div className="flex flex-col self-start text-xs w-full sm:w-[350px] sm:max-w-[50%] shrink-0 bg-white rounded-sm border border-[rgba(237,237,240,1)] shadow-xs order-1 sm:order-2">
        <div
          className={cn(
            'flex items-center justify-between hover:bg-gray-50 cursor-pointer p-3',
            expanded && 'border-b border-[rgba(237,237,240,1)]'
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex flex-col">
            <div className="text-sm font-medium mb-1">Connected emails</div>
            <div>{email}</div>
            {additionalTicketEmails.map((email: string) => (
              <div key={email} className="">
                {email}
              </div>
            ))}
          </div>
          <ChevronDown className="w-4 h-4" />
        </div>
        {expanded && (
          <>
            {/* <div className="flex flex-col p-3 m-2 mb-0 bg-[rgba(209,233,255,1)]">
              If you have tickets on a different email address, you can add it
              here.
            </div> */}
            <div className="flex p-3 flex-col sm:justify-center sm:items-center">
              <button
                className="basic-button blue w-full"
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
                          redirectTo:
                            'https://app.devconnect.org/wallet/tickets',
                        }),
                      }
                    );

                    if (response.success) {
                      setCheckYourEmail(email);
                      toast.success(
                        'Check your email for a verification code.'
                      );
                    } else {
                      console.error('Error adding email: ' + response.error);
                      toast.error('Something went wrong. Try again later.');
                    }

                    setLoadingAdditionalEmail(false);
                  }
                }}
              >
                <Mail className="w-4 h-4" />
                {loadingAdditionalEmail
                  ? 'Sending...'
                  : 'Got tickets on another email?'}
              </button>
              {checkYourEmail && (
                <div className="text-sm text-gray-800 mt-2 text-center mt-6 flex flex-col items-center w-full">
                  <div className="text-xs">
                    We sent a code to:{' '}
                    <span className="font-bold">{checkYourEmail}</span>
                  </div>
                  <input
                    type="text"
                    className="border border-neutral-300 w-full border-[1px] outline-none p-2 px-4 mt-2 text-center"
                    value={verificationCode}
                    placeholder="Enter verification code"
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />

                  <button
                    className="mt-4 basic-button blue w-full"
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
                    <LockKeyhole className="w-4 h-4" />
                    {verifyingCode ? 'Verifying...' : 'Verify code'}{' '}
                    {verificationCode.length !== 6 && '(6 digits required)'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* <div className="flex gap-4 items-center space-evenly mt-4">
        <div className="w-auto shrink grow h-px bg-gray-300" />
        <p className="text-sm text-gray-600 shrink-0">
          Is your ticket on a different email address?
        </p>
        <div className="w-auto shrink grow h-px bg-gray-300" />
      </div> */}
    </>
  );
};

const SideEventTicket = ({
  ticket,
  qrCodes,
}: {
  ticket: any;
  qrCodes: any;
}) => {
  return (
    <div className="relative max-w-[350px]">
      <Image src={TicketImage} alt="Ticket" />
    </div>
  );
};

const Ticket = ({ ticket, qrCodes }: { ticket: any; qrCodes: any }) => {
  return (
    <div className="relative max-w-[350px]">
      <Image src={TicketImage} alt="Ticket" />
      <div className="absolute text-gray-600 top-[25%] left-[9%] mt-1 h-[32%] flex justify-center flex-col">
        <div className="flex flex-col relative items-start justify-start max-w-[80%]">
          <div className="font-bold text-[rgba(136,85,204,1)] bg-[rgba(252,252,252,0.7)] self-start text-2xl inline leading-tight">
            {ticket.attendeeName}
          </div>
        </div>

        <div className="text-sm mt-1">
          Ethereum World's Fair <br /> Attendee Ticket
        </div>
      </div>

      <img
        src={qrCodes[ticket.secret]}
        alt="Ticket QR Code"
        className="absolute bottom-[15%] right-[8.5%] h-[22%] aspect-square p-1 border border-solid border-gray-300 rounded-sm"
      />
    </div>
  );
};

const SideEventTickets = ({
  tickets,
  qrCodes,
}: {
  tickets: any;
  qrCodes: any;
}) => {
  const [dates, setDates] = useState<any>([
    moment('2025-11-17'),
    moment('2025-11-18'),
    moment('2025-11-19'),
    moment('2025-11-20'),
    moment('2025-11-21'),
    moment('2025-11-22'),
  ]);

  const [selectedDates, setSelectedDates] = useState<any>(new Set());

  return (
    <div className="flex flex-col gap-1 py-4 grow self-start w-full md:w-auto">
      <div className="flex flex-col gap-1 mb-3">
        <div className="text-lg font-semibold">Event Tickets</div>
        <div className="text-sm">
          Entrance tickets for events hosted at La Rural.
        </div>
      </div>

      {dates.map((date: any) => (
        <div
          className={cn(
            'flex items-center justify-between hover:bg-gray-50 cursor-pointer p-3 border border-solid border-gray-200 rounded-sm bg-white shadow-xs',
            selectedDates.has(date) && 'border-b border-[rgba(237,237,240,1)]'
          )}
          onClick={() => setSelectedDates(new Set([...selectedDates, date]))}
        >
          <div className="flex flex-col">
            <div className="text-sm font-medium mb-1">
              {date.format('MMMM D, YYYY')}
            </div>
            <div className="text-xs text-gray-600">
              You have no tickets for this date
            </div>
          </div>
          <ChevronDown className="w-4 h-4" />
        </div>
      ))}
    </div>
  );
};

const TicketTab = RequiresAuthHOC(() => {
  // Use the tickets hook from store
  const { tickets, loading, qrCodes } = useTickets();
  const hasTickets = tickets && tickets.length > 0;

  return (
    <div
      className={cn(
        'w-full py-4 sm:py-5 px-4 sm:px-6 mx-auto grow',
        'gradient-background'
      )}
    >
      <div className="w-full">
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

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col gap-1 order-2 sm:order-1">
              <div className="text-lg font-semibold">
                Your Devconnect Ticket
              </div>
              <div className="text-sm">
                Grants access to La Rural, the Ethereum World’s Fair, and any
                included side events for Nov 17–22, 2025.
              </div>
            </div>
            <ConnectedEmails />
          </div>

          <div className="flex flex-col md:flex-row gap-8 lg:items-center items-center">
            {hasTickets && (
              <div className="flex flex-col gap-8 mt-4">
                {tickets.map((order) => (
                  <>
                    {order.tickets.map((ticket, idx) => (
                      <Ticket
                        ticket={ticket}
                        qrCodes={qrCodes}
                        key={ticket.secret}
                      />
                    ))}
                  </>
                ))}
              </div>
            )}

            <SideEventTickets tickets={tickets} qrCodes={qrCodes} />
          </div>

          {/* {hasTickets &&
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
            ))} */}
        </div>
      </div>
    </div>
  );
});

export default TicketWrapper;
