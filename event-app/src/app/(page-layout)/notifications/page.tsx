"use client";

import cn from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Settings, Star } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { InboxSkeleton } from "@/components/Skeletons";
import { FAILED_BODY, StateMessage, TryAgainButton } from "@/components/StateMessage";
import { usePreviewState } from "@/hooks/usePreviewState";
import { useOnline } from "@/hooks/useOnline";
import { NeedsConnection } from "@/components/NeedsConnection";
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
  allNotificationsOn,
  canOpenNotificationSettings,
  notificationSettingsLabel,
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
/** Inbox-slot messages sit mid-viewport: header (+ tab bar on phones) and,
 *  on desktop, the page h1 above the panel. */
const INBOX_CENTER = "min-h-[calc(100dvh-240px)] py-8 lg:min-h-[calc(100dvh-420px)]";

/**
 * Mobile entry to the notification settings: a labelled pill ("Enable
 * notifications" until both switches are on, then "Settings") in the app
 * header's action slot, the schedule's HeaderPill (not a bare bell —
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
        label={notificationSettingsLabel(push)}
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label="Notification settings"
        className="shrink-0"
      />
    </HeaderActionsPortal>
  );
}

/**
 * The Notifications inbox (route /notifications): one timeline, newest
 * first, of the team's Notion announcements and the reminders for sessions
 * you marked interested (merged by inboxItems.ts, the same order as the home
 * preview), grouped by venue day (Today / Yesterday / date). Visiting marks both kinds seen,
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
    refresh,
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

  const preview = usePreviewState();
  const online = useOnline();
  const loading = isLoading || reminders.isLoading;
  const noAnnouncements = announcements.length === 0;
  const noReminders = reminders.reminders.length === 0;
  const showLoading =
    preview === "loading" || (!preview && loading && noAnnouncements && noReminders);
  const showError = preview === "failed" || (!preview && !isLoading && !!error && noAnnouncements);
  const showEmpty =
    preview === "empty" || (!preview && !loading && !error && noAnnouncements && noReminders);
  const { interestedCount } = reminders;
  const remindersHint =
    interestedCount === 0
      ? `Mark sessions as interested in the schedule and we'll remind you ${REMINDER_LEAD_MINUTES} minutes before they start.`
      : `You're interested in ${interestedCount} ${interestedCount === 1 ? "session" : "sessions"}. Reminders show up here ${REMINDER_LEAD_MINUTES} minutes before each one starts.`;
  // Signed in and able to toggle push on this device: the hint offers the
  // settings modal (a tap, never an auto-prompt). While push is on but its
  // flags haven't loaded yet (a moment, from the Dexie cache), no button: the
  // label depends on them and would flash "Turn on notifications".
  const canOpenSettings =
    push.signedIn &&
    (push.state === "off" || (push.state === "on" && !!push.prefs));

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
            {showLoading && <InboxSkeleton />}

            {showError && (
              <StateMessage
                icon={BellOff}
                title="Couldn't load notifications"
                tone="critical"
                body={online ? FAILED_BODY : "You're offline and there are no notifications saved on this device yet."}
                className={INBOX_CENTER}
              >
                {/* A retry can only fail offline, so no dead button. */}
                {online ? (
                  <TryAgainButton onRetry={refresh} />
                ) : (
                  <NeedsConnection what="Loading notifications" className="self-center" />
                )}
              </StateMessage>
            )}

            {showEmpty && (
              <StateMessage
                icon={Bell}
                title="Nothing here yet"
                body="Announcements from the team and reminders for sessions you're interested in will show up here."
                className={INBOX_CENTER}
              >
                {/* Until both switches are on: the direct action, same
                    label as the home card and onboarding sheet. Then:
                    settings, secondary. */}
                {canOpenSettings &&
                  (!allNotificationsOn(push) ? (
                    <PrimaryButton
                      type="button"
                      onClick={openSettings}
                      aria-haspopup="dialog"
                      className="w-full"
                    >
                      Turn on notifications
                    </PrimaryButton>
                  ) : (
                    <SecondaryButton
                      type="button"
                      onClick={openSettings}
                      aria-haspopup="dialog"
                      className="w-full"
                    >
                      Notification settings
                    </SecondaryButton>
                  ))}
              </StateMessage>
            )}

            {/* A forced preview state stands alone, like the real one. */}
            <div className={cn("flex flex-col gap-8", preview && "hidden")}>
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
                <StateMessage
                  icon={Star}
                  title="No session reminders yet"
                  body={remindersHint}
                  size="compact"
                  className="rounded-lg border border-dc-hairline bg-white py-6"
                >
                  {/* Same rule as the empty state above. */}
                  {canOpenSettings &&
                    (!allNotificationsOn(push) ? (
                      <PrimaryButton
                        type="button"
                        onClick={openSettings}
                        aria-haspopup="dialog"
                        className="w-full py-3 text-[14px]"
                      >
                        Turn on notifications
                      </PrimaryButton>
                    ) : (
                      <SecondaryButton
                        type="button"
                        onClick={openSettings}
                        aria-haspopup="dialog"
                        className="w-full py-3 text-[14px]"
                      >
                        Notification settings
                      </SecondaryButton>
                    ))}
                </StateMessage>
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
