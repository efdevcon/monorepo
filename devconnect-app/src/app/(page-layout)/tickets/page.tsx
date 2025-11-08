'use client';

import { useState } from 'react';
import { fetchAuth } from '@/services/apiClient';
import { toast } from 'sonner';
import TicketImage from '@/images/devconnect-arg-ticket.png';
import Image from 'next/image';
import { ChevronDown, LockKeyhole, Mail } from 'lucide-react';
import { useTickets } from '@/app/store.hooks';
import { useGlobalStore } from '@/app/store.provider';
import type { Ticket, Order } from '@/app/store';
import { RequiresAuthHOC } from '@/components/RequiresAuthHOC';
import moment, { Moment } from 'moment';
import cn from 'classnames';
import { RefreshCw } from 'lucide-react';
import Icon from '@mdi/react';
import { mdiQrcode } from '@mdi/js';
import {
  Dialog as DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from 'lib/components/ui/dialog';
import Loader from '@/components/Loader';
import { useUserData } from '@/hooks/useServerData';

// Additional types not in store
interface Addon {
  id: string;
  itemName: string;
  secret: string;
}

interface QRCodes {
  [secret: string]: string;
}

const TicketWrapper = () => {
  return (
    // <PageLayout title="Ethereum World's Fair — Tickets" tabs={homeTabs()}>
    <TicketTab />
    // </PageLayout>
  );
};

export const QRCodeBox = () => {
  return (
    <div className="flex gap-2 p-1 items-center bg-white border border-solid border-gray-200">
      <Icon path={mdiQrcode} size={0.95} /> QR CODE
    </div>
  );
};

const SwagItems = ({
  order,
  ticket,
  qrCodes,
}: {
  order: Order;
  ticket: Ticket;
  qrCodes: QRCodes;
}) => {
  const addons = ticket.addons;
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);

  // Guard against undefined addons
  if (!addons || addons.length === 0) return null;

  return (
    <div className="mt-1 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,150px)] gap-2 justify-center sm:justify-start">
      {addons.map((addon) => (
        <div className="shrink-0" key={addon.id}>
          <div className="flex flex-col gap-4 p-3 items-center bg-white rounded-sm border border-solid border-gray-200">
            <div className="text-sm font-medium">{addon.itemName}</div>
            <div>
              <img
                src={qrCodes[addon.secret]}
                alt="Ticket QR Code"
                className="w-full aspect-square p-1 border border-solid border-gray-300 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedAddon(addon)}
              />
            </div>
          </div>
        </div>
      ))}

      {selectedAddon !== null && (
        <QRCodeModal
          qrCode={qrCodes[selectedAddon.secret]}
          isOpen={selectedAddon !== null}
          onClose={() => setSelectedAddon(null)}
          ticket={{
            attendeeName: selectedAddon.itemName,
            itemName: ticket.attendeeName || '',
            secret: selectedAddon.secret,
          }}
        />
      )}
    </div>
  );
};

const ConnectedEmails = () => {
  // const additionalTicketEmails = useAdditionalTicketEmails();
  // const setUserData = useGlobalStore((state) => state.setUserData);
  const email = useGlobalStore((state) => state.userData?.email);
  const { refresh } = useTickets();
  const { additionalTicketEmails, refresh: refreshUserData } = useUserData();

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
            <div className="text-sm font-medium mb-1 select-none">
              Connected emails ({(additionalTicketEmails.length || 0) + 1})
            </div>
            <div>{email}</div>
            {expanded &&
              additionalTicketEmails.map((email: string) => (
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
                <div className="text-sm text-gray-800 text-center mt-6 flex flex-col items-center w-full">
                  <div className="text-xs">
                    We sent a code to:{' '}
                    <span className="font-bold">{checkYourEmail}</span>
                  </div>
                  <input
                    type="number"
                    className="border border-neutral-300 w-full outline-none p-2 px-4 mt-2 text-center"
                    value={verificationCode}
                    placeholder="Enter verification code"
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />

                  <button
                    className="mt-4 basic-button blue w-full"
                    disabled={verificationCode.length !== 6 || verifyingCode}
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
                        // await ensureUserData(setUserData);
                        await refreshUserData();
                        setExpanded(false);
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

const EventTicketCard = ({
  order,
  ticket,
  dateKey,
  qrCodes,
}: {
  order: Order & { event: any };
  ticket: Ticket;
  dateKey: string;
  qrCodes: QRCodes;
}) => {
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);

  // Calculate the time range for this specific date
  let timeRange = '';

  if (order.event?.timeblocks && order.event.timeblocks.length > 0) {
    // Check if there's a single timeblock spanning multiple days
    if (order.event.timeblocks.length === 1) {
      const block = order.event.timeblocks[0];
      const blockStartDate = moment.utc(block.start).format('YYYY-MM-DD');
      const blockEndDate = moment.utc(block.end).format('YYYY-MM-DD');

      if (blockStartDate !== blockEndDate) {
        // Single multi-day timeblock: use the same start/end time every day
        const startTime = moment.utc(block.start).format('HH:mm');
        const endTime = moment.utc(block.end).format('HH:mm');
        timeRange = `${startTime} - ${endTime}`;
      } else {
        // Single-day timeblock
        timeRange = `${moment.utc(block.start).format('HH:mm')} - ${moment.utc(block.end).format('HH:mm')}`;
      }
    } else {
      // Multiple timeblocks: find ones for this specific date
      const timeblocksForDate = order.event.timeblocks.filter(
        (timeblock: any) => {
          const blockStartDate = moment
            .utc(timeblock.start)
            .format('YYYY-MM-DD');
          const blockEndDate = moment.utc(timeblock.end).format('YYYY-MM-DD');
          return (
            blockStartDate === dateKey ||
            blockEndDate === dateKey ||
            (blockStartDate < dateKey && blockEndDate > dateKey)
          );
        }
      );

      if (timeblocksForDate.length > 0) {
        const firstBlock = timeblocksForDate[0];
        const lastBlock = timeblocksForDate[timeblocksForDate.length - 1];

        const startTime =
          moment.utc(firstBlock.start).format('YYYY-MM-DD') === dateKey
            ? moment.utc(firstBlock.start).format('HH:mm')
            : '00:00';

        const endTime =
          moment.utc(lastBlock.end).format('YYYY-MM-DD') === dateKey
            ? moment.utc(lastBlock.end).format('HH:mm')
            : '23:59';

        timeRange = `${startTime}–${endTime}`;
      }
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-sm hover:shadow-md transition-shadow gap-1">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-900">{timeRange}</div>
          <div className="text-xs font-semibold text-gray-900 break-words leading-tight">
            {order.event?.name}
          </div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">
            {order.event?.organizer || 'ETHEREUM FOUNDATION'}
          </div>
        </div>
        <div
          className="flex flex-col items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity border-2 border-blue-600 rounded p-2"
          onClick={() => setIsQRCodeModalOpen(true)}
        >
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            QR CODE
          </div>
        </div>
      </div>

      {qrCodes[ticket.secret] && (
        <QRCodeModal
          qrCode={qrCodes[ticket.secret]}
          isOpen={isQRCodeModalOpen}
          onClose={() => setIsQRCodeModalOpen(false)}
          ticket={ticket}
        />
      )}
    </>
  );
};

const SideEventTicket = ({
  ticket,
  qrCodes,
}: {
  ticket: Ticket;
  qrCodes: QRCodes;
}) => {
  return (
    <div className="relative max-w-[350px]">
      <Image src={TicketImage} alt="Ticket" placeholder="blur" />
    </div>
  );
};

const QRCodeModal = ({
  qrCode,
  isOpen,
  onClose,
  ticket,
}: {
  qrCode: string;
  isOpen: boolean;
  onClose: () => void;
  ticket:
    | Ticket
    | Addon
    | { attendeeName: string; itemName: string; secret: string };
}) => {
  return (
    <DialogRoot open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-center">
            {'attendeeName' in ticket && ticket.attendeeName
              ? ticket.attendeeName
              : 'itemName' in ticket
                ? ticket.itemName
                : ''}{' '}
            - QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <img
              src={qrCode}
              alt="QR Code"
              className="w-64 h-64 object-contain"
            />
          </div>
          {'itemName' in ticket && ticket.itemName && (
            <p className="text-sm font-medium text-center">{ticket.itemName}</p>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  );
};

const Ticket = ({ ticket, qrCodes }: { ticket: Ticket; qrCodes: QRCodes }) => {
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);

  return (
    <>
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
          className="absolute bottom-[15%] right-[8.5%] h-[22%] aspect-square p-1 border border-solid border-gray-300 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsQRCodeModalOpen(true)}
        />
      </div>

      {qrCodes[ticket.secret] && (
        <QRCodeModal
          qrCode={qrCodes[ticket.secret]}
          isOpen={isQRCodeModalOpen}
          onClose={() => setIsQRCodeModalOpen(false)}
          ticket={ticket}
        />
      )}
    </>
  );
};

const SideEventTickets = ({
  orders,
  qrCodes,
}: {
  orders: Order[];
  qrCodes: QRCodes;
}) => {
  const [dates, setDates] = useState<Moment[]>([
    moment('2025-11-17'),
    moment('2025-11-18'),
    moment('2025-11-19'),
    moment('2025-11-20'),
    moment('2025-11-21'),
    moment('2025-11-22'),
  ]);
  const events = useGlobalStore((state) => state.events);

  const orderWithEvent =
    orders &&
    orders
      .map((order) => {
        const event = events?.find((event) => event.id === order.eventId);
        return {
          ...order,
          event: event || null,
        };
      })
      .filter((order) => order.event !== null);

  console.log(orderWithEvent, 'ORDER WITH EVENT');

  // Create a map of dates to orders based on event timeblocks
  const dateToOrders = new Map<string, typeof orderWithEvent>();

  orderWithEvent?.forEach((order) => {
    if (
      order.event?.timeblocks &&
      Array.isArray(order.event.timeblocks) &&
      order.event.timeblocks.length > 0
    ) {
      // Get the start of the first timeblock and end of the last timeblock
      const firstTimeblock = order.event.timeblocks[0];
      const lastTimeblock =
        order.event.timeblocks[order.event.timeblocks.length - 1];

      if (firstTimeblock.start && lastTimeblock.end) {
        const startDate = moment.utc(firstTimeblock.start);
        const endDate = moment.utc(lastTimeblock.end);

        // Add the order to every date between start and end (inclusive)
        const currentDate = startDate.clone().startOf('day');
        const finalDate = endDate.clone().startOf('day');

        while (currentDate.isSameOrBefore(finalDate)) {
          const dateKey = currentDate.format('YYYY-MM-DD');
          if (!dateToOrders.has(dateKey)) {
            dateToOrders.set(dateKey, []);
          }
          dateToOrders.get(dateKey)?.push(order);
          currentDate.add(1, 'day');
        }
      }
    }
  });

  const [selectedDates, setSelectedDates] = useState<Set<Moment>>(new Set());

  return (
    <div className="flex flex-col gap-1 py-4 grow self-start w-full">
      <div
        className="relative block top-[-115px] visibility-hidden"
        data-type="anchor"
        id="event-tickets"
      ></div>
      <div className="flex flex-col gap-1 mb-3">
        <div className="text-lg font-semibold">Event Tickets</div>
        <div className="text-sm">
          Entrance tickets for events hosted at La Rural.
        </div>
      </div>

      {dates.map((date) => {
        const dateKey = date.format('YYYY-MM-DD');
        const ordersForDate = dateToOrders.get(dateKey) || [];
        const hasTicketsForDate = ordersForDate.length > 0;
        const isExpanded = selectedDates.has(date);

        return (
          <div key={dateKey} className="flex flex-col">
            <div
              className={cn(
                'flex items-center justify-between hover:bg-gray-50 cursor-pointer p-3 border border-solid border-gray-200 rounded-sm bg-white shadow-xs',
                isExpanded && 'border-b-0 rounded-b-none'
              )}
              onClick={() => {
                if (ordersForDate.length === 0) {
                  return;
                }
                const newDates = new Set(selectedDates);
                if (newDates.has(date)) {
                  newDates.delete(date);
                } else {
                  newDates.add(date);
                }
                setSelectedDates(newDates);
              }}
            >
              <div className="flex flex-col">
                <div className="text-sm font-medium mb-1 select-none">
                  {date.format('MMMM D, YYYY')}
                </div>
                <div className="text-xs text-gray-600 select-none">
                  {hasTicketsForDate
                    ? `${ordersForDate.length} event${ordersForDate.length > 1 ? 's' : ''}`
                    : 'You have no tickets for this date'}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </div>

            {isExpanded && hasTicketsForDate && (
              <div className="border border-t-0 border-solid border-gray-200 rounded-b-sm bg-white shadow-xs p-3 pt-0 flex flex-col gap-2">
                {ordersForDate.map((order) =>
                  order.tickets.map((ticket) => (
                    <EventTicketCard
                      key={ticket.secret}
                      order={order}
                      ticket={ticket}
                      dateKey={dateKey}
                      qrCodes={qrCodes}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const TicketTab = RequiresAuthHOC(() => {
  // Use the tickets hook from store
  const {
    tickets: orders,
    sideTickets: sideOrders,
    loading,
    qrCodes,
    refresh,
  } = useTickets();
  const hasTickets = orders && orders.length > 0;
  const hasSideTickets = sideOrders && sideOrders.length > 0;
  const isLoading = loading && !hasTickets;
  const [loadingInternal, setLoadingInternal] = useState(false);

  return (
    <div
      className={cn(
        'w-full py-4 sm:py-5 px-4 sm:px-6 mx-auto grow',
        'gradient-background'
      )}
    >
      <div className="w-full">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col gap-1 order-2 sm:order-1">
              <div className="text-lg font-semibold flex items-center gap-2 justify-between lg:justify-start">
                Your Devconnect Ticket
                <button
                  className="text-sm basic-button white-button small-button text-gray-600 hover:text-gray-900 flex items-center gap-1 !p-1 !h-auto"
                  onClick={async () => {
                    setLoadingInternal(true);
                    await refresh();
                    setLoadingInternal(false);
                  }}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingInternal || loading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {hasTickets && (
                <div className="text-sm">
                  Grants access to La Rural, the Ethereum World’s Fair, and any
                  included side events for Nov 17–22, 2025.
                </div>
              )}

              {!hasTickets && (
                <div className="text-sm">
                  You can load your tickets into the World's Fair app by
                  connecting the email addresses you used to purchase your
                  tickets.
                </div>
              )}
            </div>

            <ConnectedEmails />
          </div>

          {isLoading && (
            <div className="my-4">
              <Loader>Refreshing Tickets...</Loader>
            </div>
          )}

          {!isLoading && !hasTickets && (
            <div className="italic flex flex-col items-center gap-2 mt-6 mb-2 font-medium">
              No tickets found on your currently connected email address(es).
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8 items-start w-full">
            {hasTickets && (
              <div className="flex flex-col gap-8 mt-8 shrink-0 self-center">
                {orders.map((order) => (
                  <div key={order.orderCode}>
                    {order.tickets.map((ticket, idx) => (
                      <Ticket
                        ticket={ticket}
                        qrCodes={qrCodes}
                        key={ticket.secret}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {hasTickets && (
              <div className="w-full grow">
                <SideEventTickets orders={sideOrders || []} qrCodes={qrCodes} />
              </div>
            )}
          </div>

          {hasTickets && (
            <div className="flex flex-col gap-1 order-2 sm:order-1 mt-8">
              <div className="text-lg font-semibold">Swag Items</div>
              <div className="text-sm">
                Got swag with your Devconnect ticket? Claim it at the Swag
                Station using the QR codes below.
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1 mt-4">
            {orders.map((order) => {
              return (
                <div key={order.orderCode}>
                  {order.tickets.map((ticket) => (
                    <SwagItems
                      order={order}
                      ticket={ticket}
                      qrCodes={qrCodes}
                      key={ticket.secret}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TicketWrapper;
