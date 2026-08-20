import { getActiveDataset } from "./dataset";

/**
 * Event-timezone rendering helpers. The API serves session times as plain UTC
 * instants with no timezone, so every wall-clock string in the app must be
 * produced through these helpers pinned to the venue's timezone — otherwise
 * the schedule (times AND day grouping) shifts with the viewer's system zone.
 */

/** IANA timezone of the active event's venue. */
export function getEventTimeZone(): string {
  return getActiveDataset().timezone;
}

// Built lazily (not at module scope) so the `?dataset` param — read at call
// time by getActiveDataset() — is respected. Keyed by tz too, defensively.
const fmtCache = new Map<string, Intl.DateTimeFormat>();

/** Cached Intl.DateTimeFormat pinned to the event timezone. */
export function eventFmt(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const timeZone = getEventTimeZone();
  const key = `${timeZone}|${locale}|${JSON.stringify(options)}`;
  let fmt = fmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    fmtCache.set(key, fmt);
  }
  return fmt;
}

/**
 * "YYYY-MM-DD" calendar day of an instant in the event timezone. Zero-padded,
 * so string comparison sorts chronologically.
 */
export function eventDayKey(tMs: number): string {
  const parts = eventFmt("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(tMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * UTC midnight (ms) of a "YYYY-MM-DD" day key — a synthetic timestamp for
 * exact day arithmetic and sorting. Format it with a UTC-pinned formatter,
 * never a local or event-tz one.
 */
export function dayKeyToUtcMidnightMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// --- Explicit-timezone wall-clock converters ---------------------------------
// Used by the debug panel, which must convert against its *selected* dataset's
// timezone, not the URL-active one the helpers above read.

const wallClockFmt = (tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23", // not hour12:false, which can yield "24:00"
  });

/** Offset (ms) of `tz` from UTC at instant tMs (positive east of UTC). */
function tzOffsetMs(tz: string, tMs: number): number {
  const parts = wallClockFmt(tz).formatToParts(new Date(tMs));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - (tMs - (tMs % 1000));
}

/** UTC instant (ms) for a "YYYY-MM-DDTHH:mm" wall-clock time in `tz`. */
export function wallClockToUtcMs(tz: string, wallClock: string): number {
  const [date, time] = wallClock.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, h, min);
  // Two passes: exact in one for fixed-offset zones, second guards DST zones.
  let t = naive - tzOffsetMs(tz, naive);
  t = naive - tzOffsetMs(tz, t);
  return t;
}

/** "YYYY-MM-DDTHH:mm" wall clock in `tz` for a UTC instant (datetime-local format). */
export function utcMsToWallClock(tz: string, tMs: number): string {
  const parts = wallClockFmt(tz).formatToParts(new Date(tMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Short human label for the venue zone, e.g. "Bangkok time (GMT+7)". */
export function getEventTimeZoneLabel(): string {
  const tz = getEventTimeZone();
  const city = (tz.split("/").pop() ?? tz).replace(/_/g, " ");
  // Static label: the zones we use don't observe DST, so the current offset
  // is the event's offset (no useNow needed).
  const offset = eventFmt("en-US", { timeZoneName: "shortOffset" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return offset ? `${city} time (${offset})` : `${city} time`;
}
