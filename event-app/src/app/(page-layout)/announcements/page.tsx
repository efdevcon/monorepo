"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, Star } from "lucide-react";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useSessionReminders } from "@/data/reminders/useSessionReminders";
import { REMINDER_LEAD_MINUTES } from "@/data/reminders/reminders";
import { usePushSubscription } from "@/data/push/usePushSubscription";
import { useNowMs, useRealWorldNowMs } from "@/hooks/useNow";
import { eventDayKey } from "@/data/eventTime";
import { formatDayHeading } from "@/components/schedule/utils";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { ReminderCard } from "@/components/announcements/ReminderCard";
import {
  AnnouncementTabs,
  type InboxTab,
} from "@/components/announcements/AnnouncementTabs";
import {
  NotificationSettingsLink,
  NotificationSettingsModal,
} from "@/components/announcements/NotificationSettings";

const dayKey = (ms: number) => new Date(ms).toDateString();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Group items by a day label, preserving item order. */
function groupByDay<T>(
  items: T[],
  labelOf: (item: T) => string
): [string, T[]][] {
  const byDay = new Map<string, T[]>();
  for (const item of items) {
    const label = labelOf(item);
    const group = byDay.get(label) ?? [];
    group.push(item);
    byDay.set(label, group);
  }
  return [...byDay.entries()];
}

const groupHeading =
  "mb-3 font-heading text-xs font-bold uppercase leading-[18px] tracking-[0.5px] text-dc-muted";
const emptyBox =
  "flex flex-col items-center gap-2 rounded-lg border border-dashed border-dc-border px-6 py-12 text-center";

/**
 * The announcements inbox, in two tabs: Event (the team's Notion
 * announcements) and Personal (reminders for the sessions you marked
 * interested), each grouped by day (Today / Yesterday / date). Viewing a tab
 * marks its items as seen, clearing that tab's badge and its share of the
 * header badge. Same top-level card as the Schedule and Speakers pages: a
 * header strip (tabs + the Notifications settings link) over a panel body;
 * the card chrome is desktop-only, mobile runs edge to edge.
 */
export default function AnnouncementsPage() {
  const {
    announcements,
    unreadCount,
    isLoading,
    error,
    markAllSeen,
    readStateReady,
  } = useAnnouncements();
  const reminders = useSessionReminders();
  // One push-state instance for the settings link and its modal.
  const push = usePushSubscription();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  // Two clocks on purpose: announcements are real-world-dated (viewer-local
  // days), reminders are dated against the schedule (venue days, mockable).
  const nowMs = useRealWorldNowMs(60_000);
  const eventNowMs = useNowMs(60_000);

  // Default Event; `?tab=personal` (read once on mount, like ?preview) opens
  // the other tab directly.
  const [tab, setTab] = useState<InboxTab>("event");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "personal") {
      setTab("personal");
    }
  }, []);

  // Unread dots reflect the read state as it was when the page was entered:
  // marking seen below clears the badges immediately, but the dots stay for
  // the whole visit so "what's new" remains visible while reading. Each
  // snapshot must wait for BOTH its data and the async Dexie read-state
  // hydration — before hydration every item reports seen=true and the dots
  // would be lost. One snapshot per tab, both taken at entry.
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

  // Seen = it was on screen in the ACTIVE tab, after the entry snapshot is
  // taken. Re-runs as new data arrives while the tab is open (both markers
  // are memoized on their lists, not on the clock).
  const eventReady = !isLoading && readStateReady;
  const personalReady = !reminders.isLoading && reminders.readStateReady;
  const markRemindersSeen = reminders.markAllSeen;
  useEffect(() => {
    if (tab === "event" && eventReady) markAllSeen();
    if (tab === "personal" && personalReady) markRemindersSeen();
  }, [tab, eventReady, personalReady, markAllSeen, markRemindersSeen]);

  const eventGroups = useMemo(() => {
    const today = dayKey(nowMs);
    const yesterday = dayKey(nowMs - DAY_MS);
    return groupByDay(announcements, (a) => {
      const at = new Date(a.sendAt);
      const key = dayKey(at.getTime());
      return key === today
        ? "Today"
        : key === yesterday
          ? "Yesterday"
          : at.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
    });
  }, [announcements, nowMs]);

  const personalGroups = useMemo(() => {
    const today = eventDayKey(eventNowMs);
    const yesterday = eventDayKey(eventNowMs - DAY_MS);
    return groupByDay(reminders.reminders, (r) => {
      const key = eventDayKey(r.remindAtMs);
      return key === today
        ? "Today"
        : key === yesterday
          ? "Yesterday"
          : formatDayHeading(key);
    });
  }, [reminders.reminders, eventNowMs]);

  return (
    // Escape the 680px `.section` column to the 1312px desktop content box
    // (same pattern as Schedule / Speakers).
    <main className="expand font-heading text-dc-fg">
      <div className="lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:pb-16 xl:px-0">
        {/* Mobile title comes from AppHeader (routeChrome); page h1 is desktop-only. */}
        <h1 className="hidden pb-4 pt-8 text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2 lg:block">
          Announcements
        </h1>

        <div className="lg:flex lg:items-start">
          <div className="min-w-0 lg:flex-1 lg:rounded-xl lg:border lg:border-dc-hairline lg:shadow-[0px_1px_2px_rgba(22,11,43,0.04)]">
            {/* Header strip: the Event / Personal tabs left, the settings
                link right. Full-bleed lavender on mobile (the schedule's day
                bar), the card's white top row on desktop. Badges are the
                LIVE unread counts (they clear as a tab is viewed, like the
                header badge); the dots below keep the entry snapshot. */}
            <div className="flex items-center justify-between gap-3 bg-dc-lavender px-4 lg:rounded-t-xl lg:border-b lg:border-dc-hairline lg:bg-white lg:py-2">
              <AnnouncementTabs
                selected={tab}
                onSelect={setTab}
                counts={{ event: unreadCount, personal: reminders.unreadCount }}
              />
              <NotificationSettingsLink
                push={push}
                onOpen={() => setSettingsOpen(true)}
              />
            </div>

            <div className="px-4 pb-6 pt-6 lg:rounded-b-xl lg:bg-dc-panel">
              {tab === "event" && (
                <>
                  {isLoading && (
                    <p className="text-sm text-dc-muted">Loading announcements…</p>
                  )}

                  {!isLoading && error && announcements.length === 0 && (
                    <p className="text-sm text-dc-muted">
                      Couldn&apos;t load announcements. Check your connection and
                      try again.
                    </p>
                  )}

                  {!isLoading && !error && announcements.length === 0 && (
                    <div className={emptyBox}>
                      <Megaphone className="h-6 w-6 text-dc-muted/50" />
                      <p className="text-sm text-dc-muted">
                        Nothing yet — announcements from the team will show up
                        here.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-8">
                    {eventGroups.map(([label, items]) => (
                      <section key={label}>
                        <h2 className={groupHeading}>{label}</h2>
                        <div className="flex flex-col gap-3">
                          {items.map((a) => (
                            <AnnouncementCard
                              key={a.id}
                              announcement={a}
                              seen={seenAtEntry.current?.has(a.id) ?? true}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              )}

              {tab === "personal" && (
                <>
                  {reminders.isLoading && (
                    <p className="text-sm text-dc-muted">Loading your sessions…</p>
                  )}

                  {!reminders.isLoading && reminders.reminders.length === 0 && (
                    <div className={emptyBox}>
                      <Star className="h-6 w-6 text-dc-muted/50" />
                      <p className="text-sm text-dc-muted">
                        {reminders.interestedCount === 0
                          ? `Mark sessions as interested in the schedule and we'll remind you ${REMINDER_LEAD_MINUTES} minutes before they start.`
                          : `You're interested in ${reminders.interestedCount} ${reminders.interestedCount === 1 ? "session" : "sessions"}. Reminders show up here ${REMINDER_LEAD_MINUTES} minutes before each one starts.`}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-8">
                    {personalGroups.map(([label, items]) => (
                      <section key={label}>
                        <h2 className={groupHeading}>{label}</h2>
                        <div className="flex flex-col gap-3">
                          {items.map((r) => (
                            <ReminderCard
                              key={r.id}
                              reminder={r}
                              seen={remindersSeenAtEntry.current?.has(r.id) ?? true}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <NotificationSettingsModal
        push={push}
        open={settingsOpen}
        onClose={closeSettings}
      />
    </main>
  );
}
