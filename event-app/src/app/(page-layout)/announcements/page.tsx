"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, Settings, Star } from "lucide-react";
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
import { HeaderPill } from "@/components/ActionPills";
import { HeaderActionsPortal } from "@/components/DetailLayer";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { ReminderCard } from "@/components/announcements/ReminderCard";
import {
  canOpenNotificationSettings,
  NotificationSettingsLink,
  NotificationSettingsModal,
  type PushSettings,
} from "@/components/announcements/NotificationSettings";

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
 * Mobile entry to the notification settings: a labelled "Settings" pill in
 * the app header's action slot, the schedule's HeaderPill (not a bare bell —
 * the bell elsewhere means "go to the inbox"). The header's mobile bar is
 * lg:hidden, so this never shows on desktop, where NotificationSettingsLink
 * sits beside the page h1 instead.
 */
function SettingsHeaderPill({
  push,
  onOpen,
}: {
  push: PushSettings;
  onOpen: () => void;
}) {
  if (!canOpenNotificationSettings(push)) return null;
  return (
    <HeaderActionsPortal>
      <HeaderPill
        icon={<Settings />}
        label="Settings"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label="Notification settings"
        className="shrink-0"
      />
    </HeaderActionsPortal>
  );
}

/**
 * The Notifications inbox (route /announcements): one timeline, newest
 * first, of the team's Notion
 * announcements and the reminders for sessions you marked interested
 * (merged by inboxItems.ts, the same order as the home preview), grouped by
 * venue day (Today / Yesterday / date). Visiting marks both kinds seen,
 * clearing the header badge. Same top-level card as the Schedule and
 * Speakers pages on desktop (a panel body; the card chrome is desktop-only,
 * mobile runs edge to edge), minus their sticky strip: the "Settings" entry
 * to the notification settings sits beside the h1 on desktop and in the app
 * header on mobile.
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  // Day grouping runs on the event clock (venue days, mockable) for both
  // kinds. Announcements' visibility stays gated on the real-world clock
  // inside useAnnouncements; only where they are filed changes here.
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
  // Signed in and able to toggle push on this device: the hint offers the
  // settings modal (a tap, never an auto-prompt).
  const canOpenSettings =
    push.signedIn && (push.state === "off" || push.state === "on");

  return (
    // Escape the 680px `.section` column to the 1312px desktop content box
    // (same pattern as Schedule / Speakers).
    <main className="expand font-heading text-dc-fg">
      <SettingsHeaderPill push={push} onOpen={openSettings} />

      <div className="lg:mx-auto lg:w-full lg:max-w-[1312px] lg:px-8 lg:pb-16 xl:px-0">
        {/* Mobile title comes from AppHeader (routeChrome); page h1 and the
            settings link beside it are desktop-only. */}
        <div className="hidden items-center justify-between gap-4 pb-4 pt-8 lg:flex">
          <h1 className="text-[24px] font-extrabold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
            Notifications
          </h1>
          <NotificationSettingsLink push={push} onOpen={openSettings} />
        </div>

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
                  {canOpenSettings && (
                    <button
                      type="button"
                      onClick={openSettings}
                      aria-haspopup="dialog"
                      className="mt-1 cursor-pointer rounded font-heading text-[14px] font-bold leading-5 text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple"
                    >
                      Notification settings
                    </button>
                  )}
                </div>
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
