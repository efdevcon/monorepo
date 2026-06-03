import type { Session } from "@/data/models";

/** Session timing is stored as unix seconds. */
const ms = (unixSeconds: number) => unixSeconds * 1000;

/** Stable key for the calendar day a session starts on (local time). */
export function dayKey(session: Session): string {
  const d = new Date(ms(session.start));
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const dayLabelFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export const formatDayLabel = (session: Session) =>
  dayLabelFmt.format(new Date(ms(session.start)));

export const formatTime = (unixSeconds: number) =>
  timeFmt.format(new Date(ms(unixSeconds)));

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

// Deterministic track → color so any event's track names get a stable accent
// without hardcoding a track list (event-app is meant to be reusable).
const TRACK_COLORS = [
  { bg: "#EFEBFF", fg: "#7D52F4" },
  { bg: "#E7F5FF", fg: "#1B6FAE" },
  { bg: "#E9F9EE", fg: "#1F9254" },
  { bg: "#FFF1E6", fg: "#C2410C" },
  { bg: "#FCE8F3", fg: "#BE185D" },
  { bg: "#FEF6E0", fg: "#A16207" },
  { bg: "#E6FAF8", fg: "#0E7490" },
  { bg: "#F0EEF6", fg: "#4B4B6B" },
];

export function trackColor(track: string | undefined): {
  bg: string;
  fg: string;
} {
  if (!track) return { bg: "#F3F4F6", fg: "#6B7280" };
  let hash = 0;
  for (let i = 0; i < track.length; i++) {
    hash = (hash * 31 + track.charCodeAt(i)) >>> 0;
  }
  return TRACK_COLORS[hash % TRACK_COLORS.length];
}

/** A day in the day selector. */
export interface ScheduleDay {
  key: string;
  label: string;
  /** Start-of-day timestamp, for sorting and "is today". */
  sortKey: number;
}

/** Distinct days present in the sessions, sorted ascending. */
export function getDays(sessions: Session[]): ScheduleDay[] {
  const map = new Map<string, ScheduleDay>();
  for (const s of sessions) {
    const key = dayKey(s);
    if (!map.has(key)) {
      const d = new Date(ms(s.start));
      d.setHours(0, 0, 0, 0);
      map.set(key, { key, label: formatDayLabel(s), sortKey: d.getTime() });
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
