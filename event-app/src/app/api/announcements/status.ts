import type { AnnouncementsStatus, UpcomingAnnouncement } from "@/data/announcements/types";
import type { TestAudience, TestPushStatus } from "./testPush";

/** One `devcon8_announcements` row as the status read selects it. */
export interface StatusRow {
  id: string;
  type: "announcement" | "highlight";
  title: string;
  send_at: string;
  visible: boolean;
  push: boolean;
  status: string;
  updated_at: string;
}

/** One `devcon8_announcement_tests` row (only ticked boxes are listed). */
export interface TestStateRow {
  announcement_id: string;
  audience: TestAudience;
  status: TestPushStatus;
  flag: boolean;
}

/** At most this many upcoming rows are listed; the inbox is short-lived content. */
export const UPCOMING_LIMIT = 20;

/**
 * The feed's sync state for the EF internal tools (`GET /api/announcements/status`),
 * from the table rows alone. Pure, shared with `data:test`.
 *
 * - `syncedAt`: the newest `updated_at`. The Notion sync writes every row on
 *   every run, so this is the last time Notion was read successfully, with
 *   no extra bookkeeping table.
 * - `version`: `<syncedAt ms>-<row count>`, like the Community Hubs bundle,
 *   so two devices can compare what they have at a glance.
 * - `upcoming`: announcements dated after `nowMs` (highlights are evergreen
 *   and never "appear"), soonest first, hidden rows included so an editor
 *   sees what is dated but not yet ticked Visible.
 */
export function summarizeAnnouncements(
  rows: readonly StatusRow[],
  nowMs: number,
  tests: readonly TestStateRow[] = []
): AnnouncementsStatus {
  let syncedAt: string | null = null;
  let syncedMs = -Infinity;
  for (const row of rows) {
    const at = Date.parse(row.updated_at);
    if (Number.isFinite(at) && at > syncedMs) {
      syncedMs = at;
      syncedAt = row.updated_at;
    }
  }

  const testsById = new Map<string, UpcomingAnnouncement["tests"]>();
  for (const t of tests) {
    if (!t.flag) continue;
    const entry = testsById.get(t.announcement_id) ?? {};
    entry[t.audience] = t.status;
    testsById.set(t.announcement_id, entry);
  }

  const upcoming = rows
    .filter((r) => r.type === "announcement" && Date.parse(r.send_at) > nowMs)
    .sort((a, b) => Date.parse(a.send_at) - Date.parse(b.send_at))
    .slice(0, UPCOMING_LIMIT)
    .map((r) => ({
      id: r.id,
      title: r.title,
      sendAt: r.send_at,
      visible: r.visible,
      push: r.push,
      status: r.status,
      tests: testsById.get(r.id) ?? {},
    }));

  return {
    syncedAt,
    version: syncedAt === null ? null : `${syncedMs}-${rows.length}`,
    count: rows.length,
    upcoming,
  };
}
