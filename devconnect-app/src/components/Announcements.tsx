'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll';
import cn from 'classnames';
import moment from 'moment';
import { useDraggableLink } from 'lib/hooks/useDraggableLink';
import { ArrowUpRightIcon } from 'lucide-react';
import { useAnnouncements } from '@/app/store.hooks';

type NotificationCardProps = {
  withoutContainer?: boolean;
  title: string;
  message: string;
  sendAt: string;
  seen?: boolean;
  className?: string;
  cta?: string;
  ctaLink?: string;
};

export const NotificationCard = ({
  withoutContainer = false,
  title,
  message,
  sendAt,
  cta,
  seen,
  ctaLink,
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
        'shrink-0 flex flex-col justify-between gap-0 border border-solid border-gray-200 p-4 !min-w-[280px] bg-white relative group transition-all duration-300',
        // !seen && 'ring-2  ring-opacity-20',
        className,
        withoutContainer &&
          '!border-none !min-w-auto !p-0 !bg-transparent !relative !group !transition-all !duration-300 !pl-2'
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-1 flex-1 min-w-0 max-w-[280px]',
          withoutContainer && '!max-w-none'
        )}
      >
        <p
          className={cn(
            'text-sm font-semibold',
            withoutContainer && '!text-sm'
          )}
        >
          {title}
        </p>
        <p className={cn('text-xs pr-4', withoutContainer && '!text-sm')}>
          {message}
        </p>
      </div>
      <div className="flex gap-1 shrink-0 justify-between items-center mt-3">
        <div className="flex items-center gap-1.5">
          {!seen && (
            <div className="text-[rgba(0,115,222,1)] flex items-center justify-center text-[8px]">
              ●
            </div>
          )}
          <p className="text-[11px] text-[rgba(75,75,102,1)] shrink-0 font-semibold">
            {getTimeAgo(sendAt)}
          </p>
        </div>

        {ctaLink && (
          <Link href={ctaLink} className="block shrink-0" {...draggableLink}>
            <p className="text-xs text-[rgba(0,115,222,1)] shrink-0 font-semibold flex items-center gap-0.5">
              {cta} <ArrowUpRightIcon className="w-4 h-4" />
            </p>
          </Link>
        )}
      </div>
    </div>
  );

  // if (ctaLink) {
  //   return (
  //     // <Link href={ctaLink} className="block shrink-0" {...draggableLink}>
  //       <CardContent />
  //     // </Link>
  //   );
  // }

  return <CardContent />;
};

export const AnnouncementsWrapper = () => {
  const announcements = useAnnouncements();

  return (
    <div className="flex flex-col mb-6 mt-4">
      <div className="flex flex justify-between items-center gap-2 mb-4">
        <div className="flex flex-col">
          <div className="flex justify-between items-center gap-2 font-bold border-top ml-4">
            Announcements
          </div>
          <div className="text-[11px] ml-4 leading-none">
            With ❤️ from the Devconnect Team
          </div>
        </div>
        <Link
          href="/announcements"
          className="pr-4 text-xs text-[rgba(0,115,222,1)] font-semibold flex items-center gap-0.5 self-end cursor-pointer"
        >
          View All <ArrowUpRightIcon className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex w-screen md:w-auto overflow-hidden md:overflow-visible">
        <SwipeToScroll>
          <div className="flex no-wrap gap-2 ml-4">
            {announcements.map((announcement, index) => (
              <NotificationCard
                key={announcement.id}
                title={announcement.title}
                message={announcement.message}
                sendAt={announcement.sendAt}
                seen={announcement.seen}
                cta={announcement.cta}
                ctaLink={announcement.ctaLink}
                // className={index === notifications.length - 1 ? '!mr-4' : ''}
              />
            ))}
            <div className="w-[12px] pointer-events-none h-[1px] shrink-0" />
          </div>
        </SwipeToScroll>
      </div>
    </div>
  );
};

export default AnnouncementsWrapper;
