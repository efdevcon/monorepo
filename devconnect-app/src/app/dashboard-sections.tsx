'use client';
import Event from 'lib/components/event-schedule-new/event/event';
import { useFavorites } from './store.hooks';
import NoEventsImage from 'lib/components/event-schedule-new/images/404.png';
import moment from 'moment';
import Image from 'next/image';
import Button from 'lib/components/voxel-button/button';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { useNow } from 'lib/hooks/useNow';
import { useState } from 'react';

export function WelcomeSection() {
  // const { email } = useUnifiedConnection();
  const now = useNow();
  const dummyEmail = 'example.eth';
  const buenosAiresTime = moment(now).utc().subtract(3, 'hours');
  const formattedDate = buenosAiresTime.format('h:mm A');

  return (
    <div className="flex flex-col items-start justify-start gap-2 mb-4">
      <div className="flex justify-between w-full gap-2">
        <div className="text-2xl font-semibold bg-clip-text text-transparent bg-[linear-gradient(90.78deg,#F6B40E_2.23%,#FF85A6_25.74%,#74ACDF_86.85%)]">
          ¡Buen dia!
        </div>
        <div className="font-semibold text-sm">
          {formattedDate} Buenos Aires (GMT-3)
        </div>
      </div>
      <div className="text-xl font-bold">{dummyEmail}</div>
      <div>Welcome to the Ethereum World's Fair! </div>
    </div>
  );
}

export function TodaysSchedule({ atprotoEvents }: { atprotoEvents: any[] }) {
  const [favorites] = useFavorites();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const events = atprotoEvents.filter((event) =>
    favorites.includes(event.id.toString())
  );

  const hasEventsToShow = events.length > 0;

  return (
    <div className="flex flex-col items-start justify-start gap-2 p-4 pt-3 bg-white border border-[rgba(234,234,234,1)]">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="font-semibold">Today's Schedule</p>
        {/* <p className="text-xs">{moment().format('dddd, D MMMM')}</p> */}
      </div>
      <p className="text-xs mb-2">
        These are your recommended events for today. Build your own schedule by
        adding events to your favorites.
      </p>

      {selectedEvent && (
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          <Event
            event={selectedEvent}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            setExports={() => {}}
            className="w-full"
            isDialog
          />
        </div>
      )}

      {hasEventsToShow && (
        <div className="flex flex-col items-stretch gap-2 w-full">
          {events.map((event) => (
            <Event
              compact
              key={event.id}
              event={event}
              className="w-full"
              selectedEvent={selectedEvent}
              setSelectedEvent={setSelectedEvent}
              setExports={() => {}}
            />
          ))}
        </div>
      )}
      {!hasEventsToShow && (
        <div className="flex flex-col items-center justify-center gap-2 w-full ">
          <Image
            src={NoEventsImage}
            alt="No events"
            className="w-full max-w-[400px]"
          />
        </div>
      )}

      <Button size="sm" className="w-full md:w-auto self-start mt-2">
        View full Schedule
      </Button>
    </div>
  );
}
