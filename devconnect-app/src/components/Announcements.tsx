'use client';
import React from 'react';
import Link from 'next/link';
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll';
import cn from 'classnames';
import moment from 'moment';
import { useDraggableLink } from 'lib/hooks/useDraggableLink';

type NotificationCardProps = {
  title: string;
  message: string;
  sendAt: string;
  seen?: boolean;
  to?: string;
  className?: string;
};

const NotificationCard = ({
  title,
  message,
  sendAt,
  seen = false,
  to,
  className,
}: NotificationCardProps) => {
  const getTimeAgo = (sendAt: string) => {
    const now = moment.utc();
    const sentDate = moment.utc(sendAt);
    const diffInSeconds = Math.floor(sentDate.diff(now, 'seconds'));

    if (diffInSeconds > 0) {
      if (diffInSeconds < 60) return `In ${diffInSeconds} seconds`;
      if (diffInSeconds < 3600)
        return `In ${Math.floor(diffInSeconds / 60)} minutes`;
      if (diffInSeconds < 86400)
        return `In ${Math.floor(diffInSeconds / 3600)} hours`;
      if (diffInSeconds < 2592000)
        return `In ${Math.floor(diffInSeconds / 86400)} days`;
      return `In ${Math.floor(diffInSeconds / 2592000)} months`;
    }

    const pastDiffInSeconds = Math.abs(diffInSeconds);
    if (pastDiffInSeconds < 60) return `${pastDiffInSeconds} seconds ago`;
    if (pastDiffInSeconds < 3600)
      return `${Math.floor(pastDiffInSeconds / 60)}m ago`;
    if (pastDiffInSeconds < 86400)
      return `${Math.floor(pastDiffInSeconds / 3600)}h ago`;
    if (pastDiffInSeconds < 2592000)
      return `${Math.floor(pastDiffInSeconds / 86400)}d ago`;
    if (pastDiffInSeconds < 31536000)
      return `${Math.floor(pastDiffInSeconds / 2592000)} months ago`;

    return `${Math.floor(pastDiffInSeconds / 31536000)} years ago`;
  };

  const draggableLink = useDraggableLink();

  const CardContent = () => (
    <div
      className={cn(
        'shrink-0 flex flex-col justify-between gap-0 border border-solid border-gray-200 p-4 w-[280px] bg-white relative group transition-all duration-300',
        // !seen && 'ring-2  ring-opacity-20',
        className
      )}
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="text-sm font-semibold pr-11 truncate">{title}</p>
        <p className="text-xs pr-4 line-clamp-2">{message}</p>
      </div>
      <div className="flex gap-1 shrink-0 justify-between mt-2">
        <p className="text-xs text-[#7D52F4] shrink-0 font-semibold">
          {getTimeAgo(sendAt)}
        </p>
        {!seen && (
          <div className="text-[#7D52F4] h-[12px] flex items-center justify-center text-base">
            ●
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link href={to} className="block shrink-0" {...draggableLink}>
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
};

export const AnnouncementsWrapper = () => {
  // Sample notification data - replace with real data from your API
  const notifications = [
    {
      id: '1',
      title: "Welcome to the World's Fair!",
      message:
        'Your account has been created successfully. Start exploring the fair and mark your favorite events.',
      sendAt: '2025-11-15T10:00:00Z',
      seen: false,
      to: '/quests',
    },
    {
      id: '2',
      title: 'Ethereum Day Starting Soon',
      message:
        "The opening ceremonies begin in 30 minutes. Don't miss this historic moment!",
      sendAt: '2025-11-17T08:30:00Z',
      seen: false,
      to: '/schedule/ethday',
    },
    {
      id: '3',
      title: 'New App Showcase Available',
      message:
        'Check out the latest applications built on Ethereum. Discover innovative projects and interact with creators.',
      sendAt: '2025-11-16T14:00:00Z',
      seen: true,
      to: '/quests',
    },
    {
      id: '4',
      title: 'Workshop Reminder',
      message:
        'Your selected workshop "Building on Ethereum" starts in 1 hour. Location: Pavilion 3, Room A.',
      sendAt: '2025-11-18T09:00:00Z',
      seen: true,
      to: '/schedule',
    },
    {
      id: '5',
      title: 'Networking Event Tonight',
      message:
        'Join us for the official networking event at 7 PM. Great opportunity to meet fellow developers!',
      sendAt: '2025-11-17T18:00:00Z',
      seen: false,
      to: '/schedule',
    },
  ];

  return (
    <div className="flex flex-col mb-4 mt-4">
      <div className="flex justify-between gap-2 font-bold border-top ml-4">
        Announcements
      </div>
      <div className="text-[11px] mb-2 ml-4 leading-none">
        With ❤️ from the Devconnect Team
      </div>
      <div className="flex w-screen md:w-auto overflow-hidden md:overflow-visible">
        <SwipeToScroll>
          <div className="flex no-wrap gap-2 ml-4 pr-4">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                title={notification.title}
                message={notification.message}
                sendAt={notification.sendAt}
                seen={notification.seen}
                to={notification.to}
              />
            ))}
          </div>
        </SwipeToScroll>
      </div>
    </div>
  );
};

export default AnnouncementsWrapper;
