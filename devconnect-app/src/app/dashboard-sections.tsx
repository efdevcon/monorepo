'use client';
import Event from 'lib/components/event-schedule-new/event/event';
import { useEvents, useFavorites } from './store.hooks';
import NoEventsImage from 'lib/components/event-schedule-new/images/404.png';
import moment from 'moment';
import Image from 'next/image';
import Button from 'lib/components/voxel-button/button';
import { useNow } from 'lib/hooks/useNow';
import { useState } from 'react';
import Link from 'next/link';
import { useGlobalStore } from './store.provider';
import styles from './dashboard-sections.module.scss';
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll';

export const LoopingHeader = () => {
  const items = [
    'Nov 17 - 22, 2025',
    'La Rural, Buenos Aires, Argentina',
    '15,000+ attendees',
    '80+ applications',
  ];

  return (
    <div className="bg-[rgba(58,54,94,1)] text-white md:border-b md:bg-white md:text-black w-screen mb-4 py-2">
      <InfiniteScroll nDuplications={4} speed="100s">
        <div className="flex flex-row">
          {items.map((item, j) => (
            <div className="shrink-0 ml-6" key={j}>
              {item}
            </div>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
};

export function WelcomeSection() {
  const email = useGlobalStore((state) => state.userData?.email);
  const now = useNow();
  const dummyEmail = email || 'Anon';
  const buenosAiresTime = moment(now).utc().subtract(3, 'hours');
  const formattedDate = buenosAiresTime.format('h:mm A');

  return (
    <div className="flex flex-col items-start justify-start gap-2 mb-4 mx-4">
      <div className="flex justify-between w-full  gap-2">
        <div className="text-2xl font-semibold leading-none bg-clip-text text-transparent bg-[linear-gradient(90.78deg,#F6B40E_2.23%,#FF85A6_25.74%,#74ACDF_86.85%)]">
          ¡Buen dia!
        </div>
        <div className="font-semibold text-xs text-neutral-600">
          {formattedDate} Buenos Aires (GMT-3)
        </div>
      </div>
      <div className="text-lg font-medium">{dummyEmail}</div>
      <div>Welcome to the Ethereum World&apos;s Fair! </div>
    </div>
  );
}

export function TodaysSchedule() {
  const email = useGlobalStore((state) => state.userData?.email);
  const events = useEvents();
  const [favorites] = useFavorites();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  // TODO: implement more advanced filtering here, e.g. highlighted events like ethereum day , etc.
  const filteredEvents = events.filter((event) =>
    favorites.includes(event.id.toString())
  );

  const hasEventsToShow = filteredEvents.length > 0;

  console.log(hasEventsToShow, 'hasEventsToShow');

  return (
    <div className="flex flex-col items-start justify-start gap-2 p-4 pt-3 bg-white border mx-4 border-[rgba(234,234,234,1)]">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="font-semibold">Today&apos;s Schedule</p>
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
          {filteredEvents.map((event) => (
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

      <Link href="/schedule" className="w-full md:w-auto self-start mt-2">
        <Button size="sm" className="w-full" color="green-1">
          View full Schedule
        </Button>
      </Link>

      {email && (
        <Link href="/schedule" className="w-full md:w-auto self-start mt-1">
          <Button size="sm" className="w-full">
            View Tickets
          </Button>
        </Link>
      )}
    </div>
  );
}
