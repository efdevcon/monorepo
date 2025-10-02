'use client';
import Event from 'lib/components/event-schedule-new/event/event';
import { useFavorites } from './store.hooks';
import NoEventsImage from 'lib/components/event-schedule-new/images/404.png';
import moment from 'moment';
import Image from 'next/image';

export function WelcomeSection() {
  return (
    <div className="flex flex-col items-start justify-start gap-2">
      <div className="text-2xl font-semibold bg-clip-text text-transparent bg-[linear-gradient(90.78deg,#F6B40E_2.23%,#FF85A6_25.74%,#74ACDF_86.85%)]">
        ¡Buen dia!
      </div>
      <div className="text-2xl font-bold">John Nethereum</div>
      <div>Welcome to the Ethereum World's Fair!</div>
    </div>
  );
}

export function TodaysSchedule({ atprotoEvents }: { atprotoEvents: any[] }) {
  const [favorites] = useFavorites();
  const events = atprotoEvents.filter((event) =>
    favorites.includes(event.id.toString())
  );

  const hasEventsToShow = events.length > 0;

  return (
    <div className="flex flex-col items-start justify-start gap-2 p-4 bg-white border border-[rgba(234,234,234,1)]">
      <div className="flex w-full items-start justify-between gap-2">
        <p className="font-semibold">Today's Schedule</p>
        <p className="text-xs">{moment().format('dddd, D MMMM')}</p>
      </div>
      <p className="text-xs">
        These are your recommended events for today. Build your own schedule by
        adding events to your favorites.
      </p>
      {hasEventsToShow && (
        <div className="flex flex-col items-stretch gap-2 w-full">
          {events.map((event) => (
            <Event
              compact
              key={event.id}
              event={event}
              className="w-full"
              selectedEvent={null}
              setSelectedEvent={() => {}}
              setExports={() => {}}
            />
          ))}
        </div>
      )}
      {!hasEventsToShow && (
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          <Image src={NoEventsImage} alt="No events" className="w-full" />
        </div>
      )}
    </div>
  );
}
