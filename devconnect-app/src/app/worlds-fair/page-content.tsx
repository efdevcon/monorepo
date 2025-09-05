'use client';
import PageLayout from '@/components/PageLayout';
import ProgrammeTab from './ScheduleTab';
import WorldsFairTab from './WorldsFairTab';
import { MapPinIcon, CalendarRangeIcon } from 'lucide-react';

const tabs = (atprotoEvents: any[]) => [
  {
    label: 'Event Schedule',
    labelIcon: CalendarRangeIcon,
    component: () => <ProgrammeTab atprotoEvents={atprotoEvents} />,
  },
  {
    label: 'Venue Map',
    labelIcon: MapPinIcon,
    component: () => <WorldsFairTab />,
  },
  // {
  //   label: 'Favorites',
  //   component: () => <FavoritesTab />,
  // },
];

export default function ProgrammePageContent({
  atprotoEvents,
}: {
  atprotoEvents: any;
}) {
  return (
    <PageLayout title="Ethereum World's Fair" tabs={tabs(atprotoEvents)}>
      {/* <TabbedSection
        navLabel={navLabel}
        disableSwipe={currentTabIndex < 2}
        onTabChange={setCurrentTabIndex}
      >
        {(tabIndex, tabItem) => {
          const TabComponent =
            tabComponents[tabIndex] || (() => <div>Not found</div>);
          return <TabComponent atprotoEvents={atprotoEvents} />;
        }}
      </TabbedSection> */}
    </PageLayout>
  );
}
