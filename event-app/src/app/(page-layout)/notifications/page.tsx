"use client";

import { useEffect, useMemo, useRef } from "react";
import { Megaphone, Star } from "lucide-react";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import {
  mergeInboxItems,
  type InboxItem,
} from "@/data/announcements/inboxItems";
import { useSessionReminders } from "@/data/reminders/useSessionReminders";
import { REMINDER_LEAD_MINUTES } from "@/data/reminders/reminders";
import { usePush } from "@/data/push/PushProvider";
import { useNowMs } from "@/hooks/useNow";
import { eventDayKey } from "@/data/eventTime";
import { formatDayHeading } from "@/components/schedule/utils";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { ReminderCard } from "@/components/announcements/ReminderCard";
import { NotificationsCard } from "@/components/announcements/NotificationsCard";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Group items by venue day key, preserving item order (newest first). */
function groupByDay(items: InboxItem[]): [string, InboxItem[]][] {
  const byDay = new Map<string, InboxItem[]>();
  for (const item of items) {
    const key = eventDayKey(item.at);
    const group = byDay.get(key) ?? [];
    group.push(item);
    byDay.set(key, group);
  }
  return [...byDay.entries()];
}

const groupHeading =
  "mb-3 font-heading text-xs font-bold uppercase leading-[18px] tracking-[0.5px] text-dc-muted";
const emptyBox =
  "flex flex-col items-center gap-2 rounded-lg border border-dashed border-dc-border px-6 py-12 text-center";

/**
 * The Notifications inbox (route /notifications): the notification switches
 * first (NotificationsCard, a control strip apart from the list), then one
 * timeline, newest first, of the team's Notion announcements and the
 * reminders for sessions you marked interested (merged by inboxItems.ts, the
 * same order as the home preview), grouped by venue day (Today / Yesterday /
 * date). Visiting marks both kinds seen, clearing the header badge. Same
 * top-level card as the Schedule and Speakers pages on desktop (a panel
 * body; the card chrome is desktop-only, mobile runs edge to edge), minus
 * their sticky strip.
 */
export default function AnnouncementsPage() {
  const {
    announcements,
    isLoading,
    error,
    markAllSeen,
    readStateReady,
  } = useAnnouncements();
  const reminders = useSessionReminders();
  // The app-wide push instance (PushProvider), shared with the onboarding
  // sheet, so a subscribe made there is reflected here without a remount.
  const push = usePush();
  // Day grouping runs on the event clock (venue days, mockable) for both
  // kinds, the same clock useAnnouncements reveals them on.
  const nowMs = useNowMs(60_000);

  // Unread dots reflect the read state as it was when the page was entered:
  // marking seen below clears the badges immediately, but the dots stay for
  // the whole visit so "what's new" remains visible while reading. Each
  // snapshot must wait for BOTH its data and the async Dexie read-state
  // hydration — before hydration every item reports seen=true and the dots
  // would be lost. One snapshot per kind, each taken when its source is ready.
  const seenAtEntry = useRef<Set<string> | null>(null);
  if (seenAtEntry.current === null && !isLoading && readStateReady) {
    seenAtEntry.current = new Set(
      announcements.filter((a) => a.seen).map((a) => a.id)
    );
  }
  const remindersSeenAtEntry = useRef<Set<string> | null>(null);
  if (
    remindersSeenAtEntry.current === null &&
    !reminders.isLoading &&
    reminders.readStateReady
  ) {
    remindersSeenAtEntry.current = new Set(
      reminders.reminders.filter((r) => r.seen).map((r) => r.id)
    );
  }

  // Seen = it was on screen, after its entry snapshot is taken. One effect
  // per kind so each fires as soon as its own source is ready, and re-runs
  // as new data arrives during the visit (both markers are memoized on their
  // lists, not on the clock).
  const announcementsReady = !isLoading && readStateReady;
  const remindersReady = !reminders.isLoading && reminders.readStateReady;
  const markRemindersSeen = reminders.markAllSeen;
  useEffect(() => {
    if (announcementsReady) markAllSeen();
  }, [announcementsReady, markAllSeen]);
  useEffect(() => {
    if (remindersReady) markRemindersSeen();
  }, [remindersReady, markRemindersSeen]);

  const groups = useMemo(
    () => groupByDay(mergeInboxItems(announcements, reminders.reminders)),
    [announcements, reminders.reminders]
  );
  const today = eventDayKey(nowMs);
  const yesterday = eventDayKey(nowMs - DAY_MS);
  const dayLabel = (key: string) =>
    key === today
      ? "Today"
      : key === yesterday
        ? "Yesterday"
        : formatDayHeading(key);

  const loading = isLoading || reminders.isLoading;
  const noAnnouncements = announcements.length === 0;
  const noReminders = reminders.reminders.length === 0;
  const { interestedCount } = reminders;
  const remindersHint =
    interestedCount === 0
      ? `Mark sessions as interested in the schedule and we'll remind you ${REMINDER_LEAD_MINUTES} minutes before they start.`
      : `You're interested in ${interestedCount} ${interestedCount === 1 ? "session" : "sessions"}. Reminders show up here ${REMINDER_LEAD_MINUTES} minutes before each one starts.`;

  return (
    // Escape the 680px `.section` column to the 1312px desktop content box
    // (same pattern as Schedule / Speakers).
    <main className="expand font-heading text-dc-fg">
      <div className="lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:pb-16 xl:px-0">
        {/* Mobile title comes from AppHeader (routeChrome); the page h1 is
            desktop-only. */}
        <h1 className="hidden pb-4 pt-8 text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
          Notifications
        </h1>

        {/* The switches themselves, first thing on the page (Didier:
            enabling must not sit behind a Settings click) and apart from the
            list: a lavender control strip under the header on mobile, its
            own card above the inbox panel on desktop. One line once both
            are on. */}
        <NotificationsCard push={push} className="lg:mb-4" />

        <div className="min-w-0 lg:rounded-xl lg:border lg:border-dc-hairline lg:shadow-[0px_1px_2px_rgba(22,11,43,0.04)]">
          <div className="px-4 pb-6 pt-6 lg:rounded-xl lg:bg-dc-panel">
            {loading && noAnnouncements && noReminders && (
              <p className="text-sm text-dc-muted">Loading announcements…</p>
            )}

            {!isLoading && error && noAnnouncements && (
              <p className="mb-6 text-sm text-dc-muted">
                Couldn&apos;t load announcements. Check your connection and
                try again.
              </p>
            )}

            {!loading && !error && noAnnouncements && noReminders && (
              <div className={emptyBox}>
                <Megaphone className="h-6 w-6 text-dc-muted/50" />
                <p className="text-sm text-dc-muted">
                  Nothing yet — announcements from the team and reminders for
                  sessions you&apos;re interested in will show up here.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-8">
              {groups.map(([key, items]) => (
                <section key={key}>
                  <h2 className={groupHeading}>{dayLabel(key)}</h2>
                  <div className="flex flex-col gap-3">
                    {items.map((entry) =>
                      entry.kind === "announcement" ? (
                        <AnnouncementCard
                          key={entry.item.id}
                          announcement={entry.item}
                          seen={seenAtEntry.current?.has(entry.item.id) ?? true}
                        />
                      ) : (
                        <ReminderCard
                          key={entry.item.id}
                          reminder={entry.item}
                          seen={
                            remindersSeenAtEntry.current?.has(entry.item.id) ??
                            true
                          }
                        />
                      )
                    )}
                  </div>
                </section>
              ))}

              {/* Announcements but no reminders yet: say where reminders
                  will come from, at the end of the list. */}
              {!noAnnouncements && !reminders.isLoading && noReminders && (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-dc-border px-6 py-8 text-center">
                  <Star className="h-6 w-6 text-dc-muted/50" />
                  <p className="text-sm text-dc-muted">{remindersHint}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
