"use client";

import { ChevronRight, Megaphone } from "lucide-react";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { AnnouncementCard } from "./AnnouncementCard";

const HOME_PREVIEW_COUNT = 3;

/**
 * Home-screen preview: the latest few announcements with a "View all" link to
 * the inbox. Renders nothing while empty so the home page stays clean before
 * the first announcement ships.
 */
export function AnnouncementsSection() {
  const { announcements, unreadCount } = useAnnouncements();

  if (announcements.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Megaphone className="h-5 w-5 text-[#7D52F4]" />
          Announcements
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#7D52F4] px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </h2>
        <Link
          href="/announcements"
          className="flex items-center gap-0.5 text-sm font-medium text-[#7D52F4]"
        >
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {announcements.slice(0, HOME_PREVIEW_COUNT).map((a) => (
          <AnnouncementCard key={a.id} announcement={a} seen={a.seen} />
        ))}
      </div>
    </section>
  );
}
