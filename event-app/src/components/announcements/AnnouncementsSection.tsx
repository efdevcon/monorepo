"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/routing";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useSessionReminders } from "@/data/reminders/useSessionReminders";
import { mergeInboxItems } from "@/data/announcements/inboxItems";
import { useSessions } from "@/data/hooks";
import { useNowMs } from "@/hooks/useNow";
import { AnnouncementCard } from "./AnnouncementCard";
import { ReminderCard } from "./ReminderCard";


const HOME_PREVIEW_COUNT = 3;

/**
 * Home-screen preview: the latest few inbox items (up to three), newest first,
 * the same order as the /notifications list (inboxItems.ts), with a "View
 * all" link to the inbox. Renders nothing while empty so the home page stays
 * clean before the first announcement ships.
 *
 * Two differences from the inbox (Didier, 2026-09-24):
 * - The latest announcement always has a slot, whatever else is newer: it is
 *   the team's channel to everyone and reminders must not push it off.
 * - A reminder only counts while its session is still ahead or live. It is a
 *   nudge with a ten-minute shelf life, so a finished session's reminder must
 *   not sit on the home screen for hours. The inbox keeps them all.
 */
export function AnnouncementsSection() {
  const { announcements } = useAnnouncements();
  const { reminders } = useSessionReminders();
  // Session end times, to drop reminders whose session is over. Event clock
  // (mockable), like the reminders themselves.
  const { sessions } = useSessions();
  const nowMs = useNowMs(60_000);

  const items = useMemo(() => {
    const endById = new Map(sessions.map((s) => [s.id, s.end * 1000]));
    // An unknown session (mid-resync) is not provably over, so it stays, as
    // ReminderCard treats it.
    const current = reminders.filter(
      (r) => (endById.get(r.sessionId) ?? Infinity) > nowMs
    );
    // Pin the latest announcement, fill the rest newest first, then show
    // the picked few in inbox order.
    const latest = announcements.reduce<(typeof announcements)[number] | null>(
      (best, a) =>
        !best || new Date(a.sendAt).getTime() > new Date(best.sendAt).getTime() ? a : best,
      null
    );
    const pinned = mergeInboxItems(latest ? [latest] : [], []);
    const others = mergeInboxItems(
      announcements.filter((a) => a !== latest),
      current
    ).slice(0, HOME_PREVIEW_COUNT - pinned.length);
    return [...pinned, ...others].sort((a, b) => b.at - a.at);
  }, [announcements, reminders, sessions, nowMs]);

  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-8">
        <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Notifications
        </h2>
        <Link
          href="/notifications"
          className="flex shrink-0 items-center gap-1.5 font-heading text-base font-bold text-dc-purple underline-offset-2 hover:underline"
        >
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
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
