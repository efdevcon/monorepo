'use client';
import PageLayout from '@/components/PageLayout';
// import { CalendarRangeIcon } from 'lucide-react';
// import ProgrammeTab from './ScheduleTab';
// import { useWalletManager } from '@/hooks/useWalletManager';
import { homeTabs } from '../page-content';
import cn from 'classnames';
import css from './schedule.module.scss';
import { useFavorites } from '@/app/store.hooks';
import { useGlobalStore } from '@/app/store';
import { default as ScheduleLayout } from 'lib/components/event-schedule-new/layout-app';
import { useShallow } from 'zustand/react/shallow';
import { requireAuth } from '@/components/RequiresAuth';

// const tabs = (atprotoEvents: any[]) => [
//   {
//     label: 'Event Schedule',
//     labelIcon: CalendarRangeIcon,
//     component: () => <ProgrammeTab atprotoEvents={atprotoEvents} />,
//   },

//   // {
//   //   label: 'Favorites',
//   //   component: () => <FavoritesTab />,
//   // },
// ];

export default function ProgrammePageContent({
  atprotoEvents,
}: {
  atprotoEvents: any;
}) {
  // useWalletManager();
  const [favoriteEvents, toggleFavoriteEvent] = useFavorites();

  return (
    <PageLayout title="World's Fair" tabs={homeTabs()}>
      <div className={cn('text-left touch-only:px-0 p-4', css['schedule-tab'])}>
        <ScheduleLayout
          isCommunityCalendar={false}
          events={atprotoEvents}
          favoriteEvents={favoriteEvents}
          toggleFavoriteEvent={toggleFavoriteEvent}
        />
      </div>
    </PageLayout>
  );
}
