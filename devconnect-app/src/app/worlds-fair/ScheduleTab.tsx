'use client';

import React from 'react';
import { default as ScheduleLayout } from 'lib/components/event-schedule-new/layout-app';
import cn from 'classnames';
import css from './schedule-tab.module.scss';
import { useFavorites } from '@/app/store.hooks';

interface ScheduleTabProps {
  atprotoEvents?: any[];
}

export default function ScheduleTab({ atprotoEvents = [] }: ScheduleTabProps) {
  const [favoriteEvents, toggleFavoriteEvent] = useFavorites();

  return (
    <div className={cn('text-left touch-only:px-0 p-4', css['schedule-tab'])}>
      <ScheduleLayout
        isCommunityCalendar={false}
        events={atprotoEvents}
        favoriteEvents={favoriteEvents}
        toggleFavoriteEvent={toggleFavoriteEvent}
        // events={atprotoEvents.filter((event: any) => event.isCoreEvent)}
      />
    </div>
  );
}
