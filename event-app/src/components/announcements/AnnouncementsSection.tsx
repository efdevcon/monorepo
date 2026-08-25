"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { AnnouncementCard } from "./AnnouncementCard";

const HOME_PREVIEW_COUNT = 3;

/**
 * Home-screen preview: the latest few announcements (3-up on desktop) with a
 * "View all" link to the inbox. Renders nothing while empty so the home page
 * stays clean before the first announcement ships.
 */
export function AnnouncementsSection() {
  const { announcements } = useAnnouncements();

  if (announcements.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-8">
        <h2 className="font-heading text-xl font-extrabold leading-[26px] text-dc-fg2">
          Announcements
        </h2>
        <Link
          href="/announcements"
          className="flex shrink-0 items-center gap-1.5 font-heading text-base font-bold text-dc-purple"
        >
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        {announcements.slice(0, HOME_PREVIEW_COUNT).map((a) => (
          <AnnouncementCard
            key={a.id}
            announcement={a}
            seen={a.seen}
            variant="home"
          />
        ))}
      </div>
    </section>
  );
}
