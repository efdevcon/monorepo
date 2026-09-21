/**
 * Session reminders ("your starred session starts soon"): the pure parts.
 * Shared by the push dispatcher (server, src/app/api/push/reminders.ts), the
 * Personal tab of the announcements inbox (client, useSessionReminders.ts)
 * and scripts/test-data.ts — so no React, no DOM and no helper that reads the
 * URL or `window` (eventFmt does; the timezone is passed in here instead).
 *
 * Units: everything in this module is epoch MILLISECONDS. The bundle's
 * `slot_start` is ms; the client's materialised `Session.start` is SECONDS and
 * is converted exactly once, in `deriveReminders`.
 */
import type { Session } from "@/data/models";

/** How long before a starred session starts the reminder goes out / appears. */
export const REMINDER_LEAD_MS = 15 * 60_000;
export const REMINDER_LEAD_MINUTES = REMINDER_LEAD_MS / 60_000;

/**
 * Read-state key in the Dexie `seenAnnouncements` table. Prefixed so it can
 * never collide with a Notion page id (dashed uuid).
 */
export const REMINDER_ID_PREFIX = "reminder:";
export const reminderId = (sessionId: string) =>
  `${REMINDER_ID_PREFIX}${sessionId}`;

/** Sessions whose reminder is due at `nowMs`: start − LEAD ≤ now < start. */
export function dueSessions<T extends { startMs: number }>(
  sessions: readonly T[],
  nowMs: number
): T[] {
  return sessions.filter(
    (s) => s.startMs - REMINDER_LEAD_MS <= nowMs && nowMs < s.startMs
  );
}

/** One Personal-tab item, derived on the device from a starred session. */
export interface ReminderItem {
  /** `reminderId(sessionId)` — the seen-state key. */
  id: string;
  sessionId: string;
  title: string;
  roomId?: string;
  roomName?: string;
  startMs: number;
  /** When the reminder became visible / was pushed: startMs − LEAD. */
  remindAtMs: number;
}

/**
 * The Personal tab's items: starred sessions whose reminder time has passed,
 * newest first (like the inbox). Sessions that already started or ended stay
 * listed — a reminder is history, like a sent announcement.
 */
export function deriveReminders(
  sessions: readonly Session[],
  starred: ReadonlySet<string>,
  nowMs: number
): ReminderItem[] {
  const out: ReminderItem[] = [];
  for (const s of sessions) {
    if (!starred.has(s.id)) continue;
    const startMs = s.start * 1000;
    const remindAtMs = startMs - REMINDER_LEAD_MS;
    if (remindAtMs > nowMs) continue;
    out.push({
      id: reminderId(s.id),
      sessionId: s.id,
      title: s.title,
      roomId: s.room?.id,
      roomName: s.room?.name,
      startMs,
      remindAtMs,
    });
  }
  return out.sort(
    (a, b) => b.startMs - a.startMs || a.title.localeCompare(b.title)
  );
}

/**
 * "HH:mm" (24-hour, zero-padded — the schedule's `formatTime` recipe) in an
 * explicit IANA zone, so it is safe on the server where the dataset can't be
 * read off the URL.
 */
export function formatWallClock(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(ms));
}

/**
 * Push body: "<title> starts in 15 minutes at 13:00, on Stage 1". The room
 * clause is dropped when the room is unknown. The minute count is the real
 * remaining time (ceil, clamped to 1..LEAD) so a star added inside the window
 * doesn't claim "15 minutes" at 12:58.
 */
export function reminderBody(
  title: string,
  startMs: number,
  timeZone: string,
  roomName?: string | null,
  nowMs: number = startMs - REMINDER_LEAD_MS
): string {
  const minutes = Math.min(
    REMINDER_LEAD_MINUTES,
    Math.max(1, Math.ceil((startMs - nowMs) / 60_000))
  );
  const where = roomName ? `, on ${roomName}` : "";
  return `${title} starts in ${minutes} minute${minutes === 1 ? "" : "s"} at ${formatWallClock(startMs, timeZone)}${where}`;
}
