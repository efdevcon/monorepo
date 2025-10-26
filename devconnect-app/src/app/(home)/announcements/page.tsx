'use client';
import { useAnnouncements } from '@/app/store.hooks';
import { NotificationCard } from '@/components/Announcements';
import { Fragment, useEffect, useMemo } from 'react';
import moment from 'moment';
import { Separator } from 'lib/components/ui/separator';

export default function AnnouncementsPageContent() {
  const announcements = useAnnouncements();

  useEffect(() => {
    // Upon visiting this route, mark all announcements as seen in localStorage

    const seenIds = announcements.map((a) => a.id);
    localStorage.setItem('seenAnnouncements', JSON.stringify(seenIds));
  }, [announcements]);

  // Group announcements by date
  const groupedAnnouncements = useMemo(() => {
    // Sort by most recent first
    const sorted = [...announcements].sort((a, b) =>
      moment.utc(b.sendAt).diff(moment.utc(a.sendAt))
    );

    const groups: Record<string, typeof announcements> = {};

    sorted.forEach((announcement) => {
      const date = moment.utc(announcement.sendAt);
      const today = moment.utc().startOf('day');
      const yesterday = moment.utc().subtract(1, 'day').startOf('day');

      let label: string;
      if (date.isSame(today, 'day')) {
        label = 'Today';
      } else if (date.isSame(yesterday, 'day')) {
        label = 'Yesterday';
      } else {
        label = date.format('ddd DD MMM');
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(announcement);
    });

    return groups;
  }, [announcements]);

  useEffect(() => {
    const tabsContainer = document.getElementById('page-tabs');

    if (tabsContainer) {
      tabsContainer.scrollTo({
        left: tabsContainer.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <div className="mt-2 w-full pb-8 px-4 gradient-background grow">
      <div className="flex justify-center md:justify-start gap-1 mb-4 w-full text-center text-xs text-gray-600">
        With ❤️ from the Devconnect Team
      </div>

      <div className="flex flex-col gap-6">
        {Object.entries(groupedAnnouncements).map(([dateLabel, items]) => (
          <div key={dateLabel} className="flex flex-col gap-3">
            <h2 className="text-base font-bold">{dateLabel}</h2>
            <div className="flex flex-col gap-2">
              {items.map((announcement, index) => (
                <Fragment key={announcement.id}>
                  <NotificationCard
                    withoutContainer
                    key={announcement.id}
                    title={announcement.title}
                    message={announcement.message}
                    sendAt={announcement.sendAt}
                    seen={announcement.seen}
                    cta={announcement.cta}
                    ctaLink={announcement.ctaLink}
                    className="w-full max-w-full"
                  />
                  {index < items.length - 1 && (
                    <Separator className="w-full my-2" />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
