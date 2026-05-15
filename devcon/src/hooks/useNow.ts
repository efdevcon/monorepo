import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'

/**
 * Central "current time" source for the site. Returns a Date that updates on
 * a fixed interval (default 1s), with optional URL-based mocking for testing
 * time-sensitive UI like the wave countdown.
 *
 * ## Mocking
 *
 * Append `?mockNow=<value>` to any URL to override the starting clock value.
 * From that moment forward, time advances at real-world speed.
 *
 * **All mock values are interpreted as UTC**, regardless of the viewer's
 * local timezone — so "may19" and "May 19, 2026" both resolve to midnight UTC.
 *
 * Accepts any format that JS `Date.parse()` understands, plus a few
 * shorthands for typing in URLs (hyphens/underscores → spaces, sticky
 * month+day pairs get split):
 *
 *   /tickets?mockNow=2026-05-19T12:00:00Z       (ISO, explicit UTC)
 *   /tickets?mockNow=2026-05-19T12:00:00        (no TZ → assumed UTC)
 *   /tickets?mockNow=May+19,+2026+12:00         (natural, "+" = space, UTC)
 *   /tickets?mockNow=may-19-2026                (hyphen-separated, 00:00 UTC)
 *   /tickets?mockNow=may19                      (sticky; year = current year, UTC)
 *   /tickets?mockNow=may19-12:00                (sticky + time, UTC)
 *
 * Add `?mockSpeed=<N>` to accelerate (1 = real-time, 10 = 10× faster, etc.):
 *
 *   /tickets?mockNow=may19&mockSpeed=10
 *
 * Returns null during SSR / first paint to avoid hydration mismatch; callers
 * should treat that as the loading state.
 */
// Force any input without an explicit timezone marker into UTC. ISO datetimes
// get a trailing "Z"; everything else gets " UTC" appended. ISO date-only
// strings ("YYYY-MM-DD") are already UTC per spec.
function toUtcString(input: string): string {
  if (/Z$|[+-]\d{2}:?\d{2}$|\b(UTC|GMT)\b/i.test(input)) return input
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) return input + 'Z'
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  return input + ' UTC'
}

// Default any year-less input to 2026 — the Devcon 8 event year — so testers
// can type "may19" instead of "may19-2026". A 4-digit number anywhere in the
// string is treated as an explicit year and left alone.
const DEFAULT_MOCK_YEAR = 2026
function ensureYear(input: string): string {
  if (/\b\d{4}\b/.test(input)) return input
  return `${input} ${DEFAULT_MOCK_YEAR}`
}

function parseMockNow(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null

  // 1) Try direct parse first (year-defaulted + UTC-forced).
  let t = Date.parse(toUtcString(ensureYear(s)))
  if (!isNaN(t)) return t

  // 2) Loose parse: split sticky month+digit pairs ("may19" → "may 19") and
  //    treat hyphens/underscores as spaces ("may-19" → "may 19").
  const loose = s
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  t = Date.parse(toUtcString(ensureYear(loose)))
  if (!isNaN(t)) return t

  return null
}
export function useNow(intervalMs: number = 1000): Date | null {
  const router = useRouter()
  const mockNowParam = typeof router.query.mockNow === 'string' ? router.query.mockNow : null
  const mockSpeedParam = typeof router.query.mockSpeed === 'string' ? router.query.mockSpeed : null

  const [now, setNow] = useState<Date | null>(null)
  // Refs so the interval callback always sees the latest params without
  // having to re-create the interval each render.
  const baseRef = useRef<{ mockStart: number | null; realStart: number; speed: number }>({
    mockStart: null,
    realStart: 0,
    speed: 1,
  })

  useEffect(() => {
    const realStart = Date.now()
    const mockStart = mockNowParam ? parseMockNow(mockNowParam) : null
    const parsedSpeed = mockSpeedParam ? parseFloat(mockSpeedParam) : NaN
    const speed = isNaN(parsedSpeed) || parsedSpeed <= 0 ? 1 : parsedSpeed

    baseRef.current = { mockStart, realStart, speed }

    function compute(): Date {
      const { mockStart, realStart, speed } = baseRef.current
      if (mockStart != null) {
        const elapsed = (Date.now() - realStart) * speed
        return new Date(mockStart + elapsed)
      }
      return new Date()
    }

    setNow(compute())
    const id = setInterval(() => setNow(compute()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, mockNowParam, mockSpeedParam])

  return now
}
