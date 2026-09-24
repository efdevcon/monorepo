import type { ReminderItem } from "@/data/reminders/reminders";
import type { Announcement } from "./types";

/**
 * One row of the merged inbox: a Notion announcement from the team, or a
 * session reminder derived on the device (useSessionReminders). `at` is the
 * instant the item went out — an announcement's Send At, a reminder's
 * start − lead — as a plain epoch, so the two sources sort together even
 * though their hooks gate visibility on different clocks.
 */
export type InboxItem =
  | { kind: "announcement"; at: number; item: Announcement & { seen: boolean } }
  | { kind: "reminder"; at: number; item: ReminderItem & { seen: boolean } };

/**
 * Both sources interleaved newest first — the order of the /notifications
 * list and of the home preview (which takes the first few). Ties keep the
 * announcement first (stable sort, announcements spread in first).
 */
export function mergeInboxItems(
  announcements: readonly (Announcement & { seen: boolean })[],
  reminders: readonly (ReminderItem & { seen: boolean })[]
): InboxItem[] {
  return [
    ...announcements.map<InboxItem>((a) => ({
      kind: "announcement",
      at: new Date(a.sendAt).getTime(),
      item: a,
    })),
    ...reminders.map<InboxItem>((r) => ({
      kind: "reminder",
      at: r.remindAtMs,
      item: r,
    })),
  ].sort((a, b) => b.at - a.at);
}
