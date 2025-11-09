'use client';
// import PageLayout from '@/components/PageLayout';
// import { homeTabs } from '../../navigation';
import cn from 'classnames';
import css from './schedule.module.scss';
import { useFavorites, useEvents } from '@/app/store.hooks';
import { default as ScheduleLayout } from 'lib/components/event-schedule-new/layout-app';
import { useTickets } from '@/hooks/useServerData';
import {
  renderTicketsCTA,
  renderTicketsCTADialog,
} from '@/components/EventCTAs';

const renderProgrammingCTA = () => {
  return <div>Programming CTA</div>;
};
const renderProgrammingCTADialog = () => {
  return <div>Programming CTA Dialog</div>;
};

export default function ProgrammePageContent() {
  const events = useEvents();
  const [favoriteEvents, toggleFavoriteEvent] = useFavorites();
  const { tickets, sideTickets } = useTickets();

  const coworkingEventId = '23';

  const ticketEventIds = tickets.map((ticket) => ticket.eventId?.toString());
  const sideTicketEventIds = sideTickets.map((ticket) =>
    ticket.eventId?.toString()
  );
  const allTicketEventIds = [...ticketEventIds, ...sideTicketEventIds].filter(
    (id): id is string => id !== undefined
  );

  return (
    <div className={cn('text-left w-full', css['schedule-tab'])}>
      <ScheduleLayout
        isCommunityCalendar={false}
        events={events}
        favoriteEvents={favoriteEvents}
        toggleFavoriteEvent={toggleFavoriteEvent}
        // renderProgrammingCTA={renderProgrammingCTA}
        renderTicketsCTA={renderTicketsCTA({
          coworkingEventId,
          allTicketEventIds,
        })}
        // renderProgrammingCTADialog={renderProgrammingCTADialog}
        renderTicketsCTADialog={renderTicketsCTADialog({
          coworkingEventId,
          allTicketEventIds,
        })}
      />
    </div>
  );
}
