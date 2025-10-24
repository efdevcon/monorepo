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
import { withParcnetProvider } from 'lib/components/event-schedule-new/zupass/zupass';
import cn from 'classnames';
import CameraIcon from '@/components/icons/onboarding-steps/camera.svg';
import PhoneIcon from '@/components/icons/onboarding-steps/phone.svg';
import PinIcon from '@/components/icons/onboarding-steps/pin.svg';
import CalendarIcon from '@/components/icons/onboarding-steps/calendar.svg';
import { ArrowUpRightIcon } from 'lucide-react';

export const LoopingHeader = () => {
  // const t = useTranslations();
  const items = [
    { label: 'Nov 17 - 22, 2025', icon: CalendarIcon },
    { label: 'La Rural, Buenos Aires, Argentina', icon: PinIcon },
    { label: '15,000+ attendees', icon: PhoneIcon },
    { label: '40+ events', icon: CameraIcon },
  ];

  return (
    <div className="bg-[rgba(58,54,94,1)] text-white md:border-b w-screen mb-4 py-2">
      <InfiniteScroll nDuplications={4} speed="160s">
        <div className="flex flex-row">
          {items.map((item, j) => (
            <div
              className="shrink-0 ml-8 text-sm flex items-center gap-2 py-0.5"
              key={j}
            >
              <item.icon className="w-[24px] h-[24px]" /> {item.label}
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
    <div className="flex flex-col items-start justify-start gap-1 mb-5 mx-4">
      <div className="flex justify-between w-full gap-2">
        <div className="text-2xl font-bold leading-none bg-clip-text text-transparent bg-[linear-gradient(90.78deg,#F6B40E_2.23%,#FF85A6_25.74%,#74ACDF_86.85%)]">
          ¡Buen dia!
        </div>
        {/* <div className="font-semibold text-xs text-neutral-600">
          {formattedDate} Buenos Aires (GMT-3)
        </div> */}
      </div>

      <div className="text-2xl leading-none text-[rgba(53,53,72,1)] font-medium italic max-w-[80vw] break-all">
        {email || 'Anon'}
      </div>

      <div className="text-sm leading-none mt-2">
        Welcome to the Ethereum World&apos;s Fair!{' '}
      </div>
    </div>
  );
}

export const PracticalInfo = () => {
  return (
    <div className="flex flex-col items-start justify-start gap-4 p-4 pb-3 bg-white border mx-4 border-[rgba(234,234,234,1)] mt-4">
      <h2 className="font-bold">Event information</h2>

      <div className="flex flex-col gap-0.5 w-full">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">Wifi Network:</span>
          <span className="text-sm">LA-RURAL-WIFI-BA25</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">Wifi Password:</span>
          <span className="text-sm">E7H3R3UM-DEVCONNECT</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <div className="font-bold">Need help?</div>
        <div className="text-xs leading-relaxed">
          Our friendly Support Staff are available throughout the event to help
          with technical issues, navigation, and general questions.
        </div>
      </div>

      {/* <Button className="w-full font-semibold" color="white-2" size="sm">
        View more info
      </Button> */}
    </div>
  );
};

export const TodaysSchedule = withParcnetProvider(() => {
  const email = useGlobalStore((state) => state.userData?.email);
  const events = useEvents();
  const [favorites] = useFavorites();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  // TODO: implement more advanced filtering here, e.g. highlighted events like ethereum day , etc.
  const filteredEvents = events.filter((event) =>
    favorites.includes(event.id.toString())
  );

  const hasEventsToShow = filteredEvents.length > 0;

  if (!hasEventsToShow) return null;

  return (
    <div
      className={cn(
        `flex flex-col items-start justify-start gap-1 p-4 pb-3 bg-white border mx-4 border-[rgba(234,234,234,1)] overflow-auto`
        // hasEventsToShow && 'max-h-[400px]' // add this later with "show more option when more than 3 events here"
      )}
    >
      <div className="flex w-full items-center justify-between gap-2 shrink-0">
        <p className="font-bold">Your Events</p>
        {/* <p className="text-xs">{moment().format('dddd, D MMMM')}</p> */}

        {/* <Link
          href="/schedule"
          className="text-xs text-[rgba(0,115,222,1)] font-semibold flex items-center gap-0.5 cursor-pointer"
        >
          View Schedule <ArrowUpRightIcon className="w-4 h-4" />
        </Link> */}
      </div>
      <p className="text-xs mb-2 shrink-0">
        These are your recommended events. Build your own schedule by adding
        events to your favorites.
      </p>

      {selectedEvent && (
        <Event
          event={selectedEvent}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          setExports={() => {}}
          className="w-full"
          isDialog
          noZupass
        />
      )}

      {hasEventsToShow && (
        <div className="flex flex-col items-stretch gap-1 w-full shrink-0">
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
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          <Image
            src={NoEventsImage}
            alt="No events"
            className="w-full max-w-[400px]"
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-center w-full shrink-0 mt-4 gap-4">
        <Link href="/schedule" className="w-full md:w-auto self-start shrink-0">
          <Button size="sm" className="w-full font-medium px-8" color="white-2">
            View Full Schedule
          </Button>
        </Link>

        {/* {email && (
          <Link
            href="/schedule"
            className="w-full md:w-auto self-start mb-2 shrink-0"
          >
            <Button
              size="sm"
              className="w-full font-medium px-8"
              color="white-2"
            >
              View my Tickets
            </Button>
          </Link>
        )} */}
      </div>
    </div>
  );
});
