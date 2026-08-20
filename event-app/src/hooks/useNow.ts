"use client";

import { useEffect, useRef, useState } from "react";
import { getActiveDataset } from "@/data/dataset";

// Opt-in, per-deployment preview mode. When enabled AND no explicit `?mockNow`
// is present, the clock starts at the active dataset's conference start
// (`startDate`) on initial load, so schedule / live / today logic reflects the
// event without any manual mocking. OFF by default so the real live-event clock
// is never affected; a preview/staging deploy sets NEXT_PUBLIC_MOCK_NOW_TO_EVENT_START=true.
const AUTO_MOCK_EVENT_START =
  process.env.NEXT_PUBLIC_MOCK_NOW_TO_EVENT_START === "true";

/**
 * Central "current time" source. Returns a `Date` that updates on a fixed
 * interval (default 1s), with optional URL-based mocking for testing
 * time-sensitive UI (schedule live/upcoming status, room-screen clock, etc).
 *
 * **Use this hook anywhere you need the current time** — never call
 * `Date.now()` / `new Date()` directly in components, or the URL mock won't
 * apply.
 *
 * ## Mocking (mirrors devcon.org)
 *
 * Append `?mockNow=<value>` to any URL to override the starting clock; from
 * then on, time advances at real-world speed. **All mock values are UTC.**
 *
 *   ?mockNow=2026-11-17T09:30:00Z   (ISO, explicit UTC)
 *   ?mockNow=2026-11-17T09:30:00    (no TZ → assumed UTC)
 *   ?mockNow=Nov+17,+2026+09:30     (natural, "+" = space)
 *   ?mockNow=nov-17-2026            (hyphen-separated, 00:00 UTC)
 *   ?mockNow=nov17                  (sticky; year defaults to 2026, UTC)
 *   ?mockNow=nov17-09:30            (sticky + time)
 *
 * Add `?mockSpeed=<N>` to accelerate (1 = real-time, 10 = 10× faster):
 *
 *   ?mockNow=nov17&mockSpeed=10
 *
 * When a mock is active, the tick interval is divided by the speed (floored at
 * 250ms) so consumers refresh per *mocked* minute, not per real minute — a 60s
 * caller at ×60 re-renders every real second. All hook instances share one
 * clock anchor per (mockNow, mockSpeed), so navigating between pages never
 * rewinds the mock clock and concurrent components agree; a full page reload
 * restarts the clock at `mockNow` (matches the debug panel's "Apply & reload").
 *
 * Returns `null` during SSR / first paint to avoid hydration mismatch — callers
 * should treat that as "loading" (e.g. fall back to `Date.now()`). Note the
 * `useNowMs` fallback is the *real* clock, so a mocked page's very first frame
 * can render against real time before the effect corrects it.
 */

// Force any input without an explicit timezone marker into UTC.
function toUtcString(input: string): string {
  if (/Z$|[+-]\d{2}:?\d{2}$|\b(UTC|GMT)\b/i.test(input)) return input;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) return input + "Z";
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return input + " UTC";
}

// Default any year-less input to the event year so testers can type "nov17".
const DEFAULT_MOCK_YEAR = 2026;
function ensureYear(input: string): string {
  if (/\b\d{4}\b/.test(input)) return input;
  return `${input} ${DEFAULT_MOCK_YEAR}`;
}

function parseMockNow(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // 1) Direct parse (year-defaulted + UTC-forced).
  let t = Date.parse(toUtcString(ensureYear(s)));
  if (!isNaN(t)) return t;

  // 2) Loose parse: split sticky month+digit pairs ("nov17" → "nov 17") and
  //    treat hyphens/underscores as spaces.
  const loose = s
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  t = Date.parse(toUtcString(ensureYear(loose)));
  if (!isNaN(t)) return t;

  return null;
}

function readParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

// One clock anchor per (mockStart, speed): every hook instance and remount
// shares it, so client-side navigation doesn't rewind the mock clock and
// concurrently-mounted components agree on the time. Module state — survives
// remounts; reset by a full reload (intended: "Apply & reload" restarts the
// clock at `mockNow`) and by editing this file under Fast Refresh.
let sharedAnchor: { key: string; realStart: number } | null = null;
function getSharedRealStart(mockStart: number, speed: number): number {
  const key = `${mockStart}|${speed}`;
  if (!sharedAnchor || sharedAnchor.key !== key) {
    sharedAnchor = { key, realStart: Date.now() };
  }
  return sharedAnchor.realStart;
}

export function useNow(
  intervalMs: number = 1000,
  options: { autoMockEventStart?: boolean } = {}
): Date | null {
  // Opt out of the per-deployment event-start auto-mock (see
  // AUTO_MOCK_EVENT_START above). Explicit `?mockNow` still applies either
  // way — this only controls whether an unmocked clock silently jumps to the
  // selected dataset's conference start.
  const autoMockEventStart = options.autoMockEventStart ?? true;
  const mockNowParam = readParam("mockNow");
  const mockSpeedParam = readParam("mockSpeed");

  const [now, setNow] = useState<Date | null>(null);
  // Refs so the interval callback always sees the latest params without
  // re-creating the interval each render.
  const baseRef = useRef<{
    mockStart: number | null;
    realStart: number;
    speed: number;
  }>({ mockStart: null, realStart: 0, speed: 1 });

  useEffect(() => {
    // Explicit `?mockNow` always wins; otherwise fall back to the active
    // dataset's conference start when preview auto-mock is enabled.
    let mockStart = mockNowParam ? parseMockNow(mockNowParam) : null;
    if (mockStart == null && AUTO_MOCK_EVENT_START && autoMockEventStart) {
      const t = Date.parse(getActiveDataset().startDate);
      mockStart = Number.isNaN(t) ? null : t;
    }
    const parsedSpeed = mockSpeedParam ? parseFloat(mockSpeedParam) : NaN;
    const speed = isNaN(parsedSpeed) || parsedSpeed <= 0 ? 1 : parsedSpeed;
    const realStart =
      mockStart != null ? getSharedRealStart(mockStart, speed) : Date.now();

    baseRef.current = { mockStart, realStart, speed };

    function compute(): Date {
      const { mockStart, realStart, speed } = baseRef.current;
      if (mockStart != null) {
        const elapsed = (Date.now() - realStart) * speed;
        return new Date(mockStart + elapsed);
      }
      return new Date();
    }

    // Tick per *mocked* interval when accelerated, so a 60s caller still sees
    // every mocked minute at ×60. Floored at 250ms to bound CPU at extreme
    // speeds; speeds < 1 never tick slower than the caller asked for.
    const effectiveInterval =
      mockStart != null && speed > 1
        ? Math.max(250, Math.min(intervalMs, intervalMs / speed))
        : intervalMs;

    setNow(compute());
    const id = setInterval(() => setNow(compute()), effectiveInterval);
    return () => clearInterval(id);
  }, [intervalMs, mockNowParam, mockSpeedParam, autoMockEventStart]);

  return now;
}

/** Convenience: current time in ms, falling back to real time before mount. */
export function useNowMs(
  intervalMs?: number,
  options?: { autoMockEventStart?: boolean }
): number {
  const now = useNow(intervalMs, options);
  return now ? now.getTime() : Date.now();
}

/**
 * Clock for content dated against the real world rather than event time —
 * announcements are published at actual timestamps, so which dataset is
 * selected must not decide whether they're visible yet (a devcon-7 dataset
 * would otherwise put the clock in Nov 2024 and hide everything as "future").
 * Still honors an explicit `?mockNow` so scheduled reveals remain testable.
 */
export function useRealWorldNowMs(intervalMs?: number): number {
  return useNowMs(intervalMs, { autoMockEventStart: false });
}
