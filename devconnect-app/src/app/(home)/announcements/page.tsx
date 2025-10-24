'use client';
import { useAnnouncements } from '@/app/store.hooks';
import { NotificationCard } from '@/components/Announcements';
import { useEffect, useMemo } from 'react';
import moment from 'moment';
import { Separator } from 'lib/components/ui/separator';

// Dummy announcements for testing
const DUMMY_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Ethereum Day starts in 1 hour 🔔',
    message:
      "With talks from Vitalik, Tomasz, HWW, and local legends like Mariano Conti — it's sure to be packed. Get there early to claim your seat 💛",
    sendAt: moment.utc().toISOString(),
    seen: false,
    cta: 'View event location',
    ctaLink: '/schedule/ethday',
  },
  {
    id: '2',
    title: 'Devconnect ARG is officially open 🚀',
    message:
      "We can't wait to see you — get your tickets ready, make your way to La Rural and experience the first Ethereum World's Fair 🔷🌎🎡📱",
    sendAt: moment.utc().subtract(18, 'minutes').toISOString(),
    seen: false,
    cta: 'View Tickets',
    ctaLink: '/tickets',
  },
  {
    id: '3',
    title: "1 day to go 🥳 — don't forget your Perks!",
    message:
      "Devconnect ARG is almost here! If you haven't checked out the Devconnect Perks Portal yet, what have you been doing with your life!? 🇦🇷🎉🍫😜",
    sendAt: moment.utc().subtract(1, 'day').toISOString(),
    seen: false,
    cta: 'Visit Perks Portal',
    ctaLink: '/perks',
  },
  {
    id: '4',
    title: 'Schedule is live! 📅',
    message:
      "Browse the full event schedule and mark your favorite talks. Don't miss out on the best sessions!",
    sendAt: moment.utc().subtract(2, 'days').toISOString(),
    seen: true,
    cta: 'View Schedule',
    ctaLink: '/schedule',
  },
  {
    id: '5',
    title: 'Venue map available 🗺️',
    message:
      'Navigate the fair with our interactive map. Find all the stages, food stands, and important locations.',
    sendAt: moment.utc().subtract(3, 'days').toISOString(),
    seen: true,
    cta: 'View Map',
    ctaLink: '/map',
  },
];

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
                <>
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
                </>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
