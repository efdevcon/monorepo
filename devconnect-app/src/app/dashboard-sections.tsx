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
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll';
import { withParcnetProvider } from 'lib/components/event-schedule-new/zupass/zupass';
import cn from 'classnames';
import CameraIcon from '@/components/icons/onboarding-steps/camera.svg';
import PhoneIcon from '@/components/icons/onboarding-steps/phone.svg';
import PinIcon from '@/components/icons/onboarding-steps/pin.svg';
import CalendarIcon from '@/components/icons/onboarding-steps/calendar.svg';
import DevconnectLogoWhite from '@/images/devconnect-arg-logo.svg';
import { toast } from 'sonner';
import { ChevronDownIcon, Copy } from 'lucide-react';

export const LoopingHeader = () => {
  // const t = useTranslations();
  const items = [
    { label: 'Nov 17 - 22, 2025', icon: CalendarIcon },
    { label: 'La Rural, Buenos Aires, Argentina', icon: PinIcon },
    { label: '15,000+ Attendees', icon: PhoneIcon },
    { label: '40+ Events', icon: CameraIcon },
  ];

  return (
    <div className="bg-[rgba(58,54,94,1)] text-white md:border-b w-screen mb-4 py-2">
      <InfiniteScroll nDuplications={4} speed="160s">
        <div className="flex flex-row">
          {items.map((item, j) => (
            <div
              className="shrink-0 ml-8 text-sm flex items-center gap-2 py-0.5 font-medium"
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
    <div className="flex justify-between items-center gap-4 mb-5 px-4 max-w-screen">
      <div className="flex flex-col shrink-1 justify-center overflow-hidden mt-1">
        <div className="text-xl self-start font-bold leading-none bg-clip-text text-transparent bg-[linear-gradient(90.78deg,#F6B40E_2.23%,#FF85A6_25.74%,#74ACDF_86.85%)]">
          ¡Buen dia!
        </div>
        <div className="text-base text-[rgba(53,53,72,1)] font-medium italic truncate">
          {email || 'Anon'}
        </div>
      </div>

      <div className="w-[120px] md:w-[140px] shrink-0">
        <DevconnectLogoWhite />
      </div>

      {/* <Image
        src={DevconnectLogoWhite}
        alt="Ethereum World's Fair"
        className="aspect-[244/77] w-[150px] object-contain shrink-0"
        width={244}
        height={77}
      /> */}
      {/* <div className="text-sm leading-none mt-2">
        Welcome to the Ethereum World&apos;s Fair!{' '}
      </div> */}
    </div>
  );
}

export const PracticalInfo = () => {
  const [openSection, setOpenSection] = useState<string | null>('essentials');

  const sections = [
    {
      id: 'venue',
      title: 'Venue & Facilities 🏛️',
      content: (
        <div className="text-sm">
          <p>Venue and facilities information coming soon...</p>
        </div>
      ),
    },
    {
      id: 'city',
      title: 'City Guide 🌶️',
      content: (
        <div className="text-sm">
          <p>City guide information coming soon...</p>
        </div>
      ),
    },
    {
      id: 'perks',
      title: 'Perks 🎁',
      content: (
        <div className="text-sm">
          <p>Perks information coming soon...</p>
        </div>
      ),
    },
    {
      id: 'community',
      title: 'Community 🌍',
      content: (
        <div className="text-sm">
          <p>Community information coming soon...</p>
        </div>
      ),
    },
    {
      id: 'safety',
      title: 'Safety & Conduct ⚠️',
      content: (
        <div className="text-sm">
          <p>Safety and conduct information coming soon...</p>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-start justify-start bg-white border mx-4 border-[rgba(234,234,234,1)] mt-4">
      <h2 className="font-bold p-4 pb-0">Event information</h2>

      <div className="p-4 pb-0 w-full">
        <div className="flex flex-col lg:flex-row lg:gap-24">
          {/* left col on desktop, top on mobile */}
          <div className="flex flex-col gap-1 lg:flex-1 lg:gap-0.5">
            <div className="flex justify-between items-center group">
              <span className="font-semibold text-sm">Wi-Fi:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('LA-RURAL-WIFI-BA25');
                  toast('Copied wifi name to clipboard', {
                    position: 'bottom-center',
                  });
                }}
                className="text-sm flex items-center gap-1 hover:text-[rgba(0,115,222,1)]"
              >
                <span>LA-RURAL-WIFI-BA25</span>
                <Copy className="w-3.5 h-3.5 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            <div className="flex justify-between items-center group">
              <span className="font-semibold text-sm">Wifi Password:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('E7H3R3UM-DEVCONNECT');
                  toast('Copied wifi password to clipboard', {
                    position: 'bottom-center',
                  });
                }}
                className="text-sm flex items-center gap-1 hover:text-[rgba(0,115,222,1)]"
              >
                <span>E7H3R3UM-DEVCONNECT</span>
                <Copy className="w-3.5 h-3.5 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">Venue address:</span>
              <Link
                target="_blank"
                href="https://maps.app.goo.gl/NKqKSiteNnPwbmTs9"
                className="text-sm text-[rgba(0,115,222,1)]"
              >
                <span>View on map ↗</span>
              </Link>
            </div>
          </div>

          {/* right col on desktop, below on mobile */}
          <div className="flex flex-col mt-4 lg:mt-0 text-sm lg:flex-1">
            <span className="font-semibold mb-1 lg:mb-0.5">Need help?</span>
            <span>
              Read our{' '}
              <Link
                target="_blank"
                href="https://devconnect.com/support"
                className="text-[rgba(0,115,222,1)]"
              >
                Support FAQ
              </Link>{' '}
              or visit the{' '}
              <Link
                target="_blank"
                href="https://devconnect.com/onboarding"
                className="text-[rgba(0,115,222,1)]"
              >
                Onboarding Area
              </Link>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full p-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className="border-b border-[rgba(234,234,234,1)] last:border-b-0"
          >
            <button
              onClick={() =>
                setOpenSection(openSection === section.id ? null : section.id)
              }
              className="w-full flex items-center justify-between py-2 text-left cursor-pointer"
            >
              <span className="font-semibold text-sm">{section.title}</span>
              <ChevronDownIcon className="w-4 h-4 text-[rgba(0,115,222,1)]" />
            </button>
            {openSection === section.id && (
              <div className="pb-4">{section.content}</div>
            )}
          </div>
        ))}
      </div>
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
        `flex flex-col items-start justify-start gap-1 p-4 bg-white border mx-4 border-[rgba(234,234,234,1)] overflow-auto`
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
        <Link
          href="/schedule"
          className="w-full md:w-auto self-start shrink-0 hidden md:block"
        >
          <Button size="sm" className="w-full font-medium px-8" color="white-2">
            View Full Schedule
          </Button>
        </Link>
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

      <div className="flex flex-col md:hidden items-center justify-center w-full shrink-0 mt-4 gap-4">
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
