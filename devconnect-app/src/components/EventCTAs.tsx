import Link from 'next/link';
import Icon from '@mdi/react';
import { mdiQrcode } from '@mdi/js';

interface EventCTAsOptions {
  coworkingEventId: string;
  allTicketEventIds: string[];
  size?: number;
}

export const renderTicketsCTA =
  ({ coworkingEventId, allTicketEventIds, size = 1.1 }: EventCTAsOptions) =>
  (event: any) => {
    if (!allTicketEventIds.includes(event.id.toString())) return null;

    return (
      <Link
        href={
          event.id.toString() === coworkingEventId
            ? '/tickets'
            : '/tickets#event-tickets'
        }
        className="shrink-0 cursor-pointer scale-100 hover:scale-105 transition-all duration-300"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Icon
          path={mdiQrcode}
          size={size}
          className="text-[#4b4b66] opacity-90"
        />
      </Link>
    );
  };

export const renderTicketsCTADialog =
  ({ coworkingEventId, allTicketEventIds, size = 0.95 }: EventCTAsOptions) =>
  (event: any) => {
    if (!allTicketEventIds.includes(event.id.toString())) return null;

    return (
      <Link
        href={
          event.id.toString() === coworkingEventId
            ? '/tickets'
            : '/tickets#event-tickets'
        }
        className="shrink-0 cursor-pointer scale-100 hover:scale-105 transition-all duration-300"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Icon path={mdiQrcode} size={size} />
      </Link>
    );
  };
