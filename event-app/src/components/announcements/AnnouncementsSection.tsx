"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useSessionReminders } from "@/data/reminders/useSessionReminders";
import { mergeInboxItems } from "@/data/announcements/inboxItems";
import { AnnouncementCard } from "./AnnouncementCard";
import { ReminderCard } from "./ReminderCard";

const HOME_PREVIEW_COUNT = 3;

/**
 * Home-screen preview: the latest few inbox items — team announcements and
 * session reminders interleaved by time, newest first, the same merge as the
 * /announcements list (inboxItems.ts; 3-up on desktop) — with a "View all"
 * link to the inbox. Renders nothing while empty so the home page stays
 * clean before the first announcement ships.
 */
export function AnnouncementsSection() {
  const { announcements } = useAnnouncements();
  const { reminders } = useSessionReminders();

  const items = useMemo(
    () =>
      mergeInboxItems(announcements, reminders).slice(0, HOME_PREVIEW_COUNT),
    [announcements, reminders]
  );

  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-8">
        <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Notifications
        </h2>
        <Link
          href="/announcements"
          className="flex shrink-0 items-center gap-1.5 font-heading text-base font-bold text-dc-purple underline-offset-2 hover:underline"
        >
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        {items.map((entry) =>
          entry.kind === "announcement" ? (
            <AnnouncementCard
              key={entry.item.id}
              announcement={entry.item}
              seen={entry.item.seen}
              variant="home"
            />
          ) : (
            <ReminderCard
              key={entry.item.id}
              reminder={entry.item}
              seen={entry.item.seen}
              variant="home"
            />
          )
        )}
      </div>
    </section>
  );
}
