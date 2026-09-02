import type { Room, Session } from "@/data/models";
import { dayKeyToUtcMidnightMs, eventDayKey, eventFmt } from "@/data/eventTime";

/** Session timing is stored as unix seconds. */
const ms = (unixSeconds: number) => unixSeconds * 1000;

/**
 * Stable key ("YYYY-MM-DD") for the calendar day a session starts on, in the
 * event's venue timezone — so day grouping is identical for every viewer.
 */
export function dayKey(session: Session): string {
  return eventDayKey(ms(session.start));
}

// All formatters are pinned to the event timezone (via eventFmt) and to a
// fixed locale — DayTabs/ScheduleTimeline parse the labels with split(", ").

// "Tue, Nov 12" — day-tab label.
export const formatDayLabel = (session: Session) =>
  eventFmt("en-US", { weekday: "short", month: "short", day: "numeric" })
    .format(new Date(ms(session.start)));

// "Wed, November 13" — the desktop list's day heading (Figma "Tues, November 3").
// Takes a "YYYY-MM-DD" day key; formats its synthetic UTC midnight in UTC
// (static — not eventFmt — because the key already encodes the venue day).
const dayHeadingFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
export const formatDayHeading = (key: string) =>
  dayHeadingFmt.format(new Date(dayKeyToUtcMidnightMs(key)));

// 24-hour, zero-padded ("09:30") per the Figma design.
export const formatTime = (unixSeconds: number) =>
  eventFmt("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(ms(unixSeconds)));

export const formatTimeRange = (session: Session) =>
  `${formatTime(session.start)} – ${formatTime(session.end)}`;

export type SessionStatus = "live" | "soon" | "past" | "upcoming";

/** Status relative to `nowMs`. "soon" = starts within the next hour. */
export function getStatus(session: Session, nowMs: number): SessionStatus {
  const start = ms(session.start);
  const end = ms(session.end);
  if (nowMs >= start && nowMs < end) return "live";
  if (nowMs >= end) return "past";
  if (start - nowMs <= 60 * 60 * 1000) return "soon";
  return "upcoming";
}

export function minutesUntil(session: Session, nowMs: number): number {
  return Math.max(0, Math.round((ms(session.start) - nowMs) / 60000));
}

/** A day in the day selector. */
export interface ScheduleDay {
  key: string;
  label: string;
  /** Synthetic UTC midnight (ms) of the venue day — for sorting only. */
  sortKey: number;
}

/** Distinct days present in the sessions, sorted ascending. */
export function getDays(sessions: Session[]): ScheduleDay[] {
  const map = new Map<string, ScheduleDay>();
  for (const s of sessions) {
    const key = dayKey(s);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: formatDayLabel(s),
        sortKey: dayKeyToUtcMidnightMs(key),
      });
    }
  }
  return [...map.values()].sort((a, b) => a.sortKey - b.sortKey);
}

/** A contiguous block of sessions sharing a start time, for sticky headers. */
export interface TimeGroup {
  timeLabel: string;
  sessions: Session[];
}

/** Sort sessions by start time and group consecutive ones by start time. */
export function groupByTime(sessions: Session[]): TimeGroup[] {
  const sorted = [...sessions].sort((a, b) => a.start - b.start);
  const groups: TimeGroup[] = [];
  for (const s of sorted) {
    const timeLabel = formatTime(s.start);
    const last = groups[groups.length - 1];
    if (last && last.timeLabel === timeLabel) last.sessions.push(s);
    else groups.push({ timeLabel, sessions: [s] });
  }
  return groups;
}

// --- Timeline view -----------------------------------------------------------

/** One time column in the timeline = this many minutes. */
export const SLOT_MINUTES = 10;

const SLOT_MS = SLOT_MINUTES * 60_000;

/**
 * Pixel geometry of the timeline grid. Desktop is the Figma spec; mobile is
 * ~1.8× denser horizontally and ~1.5× shorter (Devcon SEA app parity) so a
 * phone shows ~30 min × 8 rooms instead of ~15 min × 5. An object, not a scale
 * factor: lane and header heights don't shrink in step with slot width.
 */
export interface TimelineMetrics {
  /** px per `SLOT_MINUTES` slot. */
  slotWidth: number;
  /** px width of the sticky room-name column. */
  roomCol: number;
  /** px height of each room lane. */
  laneH: number;
  /** px height of the time-axis header row. */
  headerH: number;
  /** px inset of session blocks inside their lane. */
  blockInset: number;
}

export const DESKTOP_METRICS: TimelineMetrics = {
  slotWidth: 180, // Figma: 10 min = 180px
  roomCol: 120,
  laneH: 74,
  headerH: 40,
  blockInset: 4,
};

export const MOBILE_METRICS: TimelineMetrics = {
  slotWidth: 100,
  roomCol: 96,
  laneH: 56,
  headerH: 32,
  blockInset: 4,
};

/** Label shown when a session has no assigned room. */
export const NO_ROOM_LABEL = "TBA";

/** A room's name as used for grouping/sorting in the timeline. */
const roomName = (s: Session) => s.room?.name ?? NO_ROOM_LABEL;

/**
 * Distinct rooms present in the sessions, ordered like devcon's timeline:
 * "Main Stage" first, then any "Stage …", then the rest alphabetically.
 */
export function sortRooms(sessions: Session[]): string[] {
  const rooms = [...new Set(sessions.map(roomName))];
  return rooms.sort((a, b) => {
    if (a === "Main Stage") return -1;
    if (b === "Main Stage") return 1;
    const aStage = a.toLowerCase().startsWith("stage");
    const bStage = b.toLowerCase().startsWith("stage");
    if (aStage && !bStage) return -1;
    if (bStage && !aStage) return 1;
    return a.localeCompare(b);
  });
}

export interface Timeline {
  rooms: string[];
  /** Start-of-slot timestamps (ms), spanning the day's first start → last end. */
  slots: number[];
  /** Grid origin (ms) — left edge of the first slot. */
  startMs: number;
  /** Sessions grouped by room name. */
  byRoom: Record<string, Session[]>;
}

/** Round a timestamp (ms) down to the start of its `SLOT_MINUTES` slot. */
const floorToSlot = (ms: number) => ms - (ms % SLOT_MS);

/**
 * Build the room lanes and time axis for the timeline from a day's sessions.
 * Slots run from the earliest start (floored to a slot) to the latest end
 * (plus one slot of trailing padding), at `SLOT_MINUTES` resolution.
 */
export function buildTimeline(sessions: Session[]): Timeline {
  const rooms = sortRooms(sessions);
  const byRoom: Record<string, Session[]> = {};
  for (const r of rooms) byRoom[r] = [];

  let min = Infinity;
  let max = -Infinity;
  for (const s of sessions) {
    byRoom[roomName(s)].push(s);
    min = Math.min(min, ms(s.start));
    max = Math.max(max, ms(s.end));
  }
  for (const r of rooms) byRoom[r].sort((a, b) => a.start - b.start);

  const startMs = floorToSlot(min);
  const endMs = floorToSlot(max) + SLOT_MS; // one slot of trailing padding
  const slots: number[] = [];
  for (let t = startMs; t <= endMs; t += SLOT_MS) slots.push(t);

  return { rooms, slots, startMs, byRoom };
}

/** Horizontal offset (px) of a timestamp (ms) from the grid origin. */
export const offsetPx = (timeMs: number, startMs: number, slotWidth: number) =>
  ((timeMs - startMs) / SLOT_MS) * slotWidth;

/** Pixel placement of a session within its room lane (min. half a slot wide). */
export function sessionBox(
  session: Session,
  startMs: number,
  slotWidth: number
): { left: number; width: number } {
  const left = offsetPx(ms(session.start), startMs, slotWidth);
  const width = offsetPx(ms(session.end), startMs, slotWidth) - left;
  return { left, width: Math.max(width, slotWidth / 2) };
}

const DAY_MS = 86_400_000;

export const STREAM_FIELDS = [
  "youtubeStreamUrl_1",
  "youtubeStreamUrl_2",
  "youtubeStreamUrl_3",
  "youtubeStreamUrl_4",
] as const;

/**
 * 1-based conference day for a timestamp, anchored on the event's startDate
 * (venue-timezone calendar days, matching the schedule's day grouping). Null
 * when event dates are unknown or the timestamp falls outside the covered
 * range.
 */
export function eventDayIndex(
  tMs: number,
  eventStartIso?: string
): number | null {
  if (!eventStartIso) return null;
  const eventStartMs = Date.parse(eventStartIso);
  if (Number.isNaN(eventStartMs)) return null;
  const index =
    (dayKeyToUtcMidnightMs(eventDayKey(tMs)) -
      dayKeyToUtcMidnightMs(eventDayKey(eventStartMs))) /
      DAY_MS +
    1;
  return index >= 1 && index <= STREAM_FIELDS.length ? index : null;
}

/** The room's livestream embed URL for whichever conference day tMs falls on. */
export function streamUrlForDay(
  room: Room | undefined,
  tMs: number,
  eventStartIso?: string
): string | null {
  if (!room) return null;
  const day = eventDayIndex(tMs, eventStartIso);
  return day ? (room[STREAM_FIELDS[day - 1]] ?? null) : null;
}
