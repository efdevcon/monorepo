'use client';
import PageLayout from '@/components/PageLayout';
import { homeTabs } from '../page-content';
import cn from 'classnames';
import css from './schedule.module.scss';
import { useFavorites, useEvents } from '@/app/store.hooks';
import { default as ScheduleLayout } from 'lib/components/event-schedule-new/layout-app';

export default function ProgrammePageContent() {
  const events = useEvents();
  const [favoriteEvents, toggleFavoriteEvent] = useFavorites();

  return (
    <PageLayout title="World's Fair" tabs={homeTabs()}>
      <div className={cn('text-left touch-only:px-0 p-4', css['schedule-tab'])}>
        <ScheduleLayout
          isCommunityCalendar={false}
          events={events}
          favoriteEvents={favoriteEvents}
          toggleFavoriteEvent={toggleFavoriteEvent}
        />
      </div>
    </PageLayout>
  );
}
