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
 * Returns `null` during SSR / first paint to avoid hydration mismatch — callers
 * should treat that as "loading" (e.g. fall back to `Date.now()`).
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

export function useNow(intervalMs: number = 1000): Date | null {
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
    const realStart = Date.now();
    // Explicit `?mockNow` always wins; otherwise fall back to the active
    // dataset's conference start when preview auto-mock is enabled.
    let mockStart = mockNowParam ? parseMockNow(mockNowParam) : null;
    if (mockStart == null && AUTO_MOCK_EVENT_START) {
      const t = Date.parse(getActiveDataset().startDate);
      mockStart = Number.isNaN(t) ? null : t;
    }
    const parsedSpeed = mockSpeedParam ? parseFloat(mockSpeedParam) : NaN;
    const speed = isNaN(parsedSpeed) || parsedSpeed <= 0 ? 1 : parsedSpeed;

    baseRef.current = { mockStart, realStart, speed };

    function compute(): Date {
      const { mockStart, realStart, speed } = baseRef.current;
      if (mockStart != null) {
        const elapsed = (Date.now() - realStart) * speed;
        return new Date(mockStart + elapsed);
      }
      return new Date();
    }

    setNow(compute());
    const id = setInterval(() => setNow(compute()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, mockNowParam, mockSpeedParam]);

  return now;
}

/** Convenience: current time in ms, falling back to real time before mount. */
export function useNowMs(intervalMs?: number): number {
  const now = useNow(intervalMs);
  return now ? now.getTime() : Date.now();
}
