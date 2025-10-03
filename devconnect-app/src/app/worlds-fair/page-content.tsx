'use client';
import PageLayout from '@/components/PageLayout';
import { CalendarRangeIcon } from 'lucide-react';
import ProgrammeTab from './ScheduleTab';
// import { useWalletManager } from '@/hooks/useWalletManager';

const tabs = (atprotoEvents: any[]) => [
  {
    label: 'Event Schedule',
    labelIcon: CalendarRangeIcon,
    component: () => <ProgrammeTab atprotoEvents={atprotoEvents} />,
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
  // useWalletManager();

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
