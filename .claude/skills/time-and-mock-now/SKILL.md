---
name: time-and-mock-now
description: >-
  How to handle "current time" in the event-app (the Devcon PWA under
  event-app/). Use whenever building or changing time-dependent UI — schedule
  live/upcoming status, countdowns, the room-screen clock, "happening now"
  badges, relative times, which day to highlight, etc. All such code must read
  the current time from the shared `useNow`/`useNowMs` hook (never `Date.now()`
  / `new Date()` directly in a component), so it can be mocked via URL query
  params (`?mockNow=`, `?mockSpeed=`) for testing date-specific flows — the same
  pattern devcon.org uses. Triggers: "now", "current time", "countdown",
  "live/upcoming", "relative time", "today", "mock time", "test the date",
  "schedule status", "clock".
---

# Time & mockable "now" (event-app)

The `event-app` package tests date-specific flows (relative time, which day is
highlighted, live/upcoming status, countdowns) by **mocking the current time via
URL query params**, mirroring devcon.org/tickets.

## The rule

Never call `Date.now()` or `new Date()` for "the current time" inside a
component. Always use the shared hook so the URL mock applies:

```ts
import { useNow, useNowMs } from "@/hooks/useNow";

const now = useNow();        // Date | null (null on first paint / SSR)
const nowMs = useNowMs();    // number (ms); falls back to real time pre-mount
```

- `useNow(intervalMs = 1000)` → `Date | null`, updates every `intervalMs`.
- `useNowMs(intervalMs?)` → convenience `number` (ms); use this when you need a
  timestamp (e.g. `getStatus(session, nowMs)`).
- Pass a coarser interval where 1s is wasteful (e.g. schedule uses
  `useNowMs(60_000)`).

Source: `event-app/src/hooks/useNow.ts`. Reference usages:
`src/components/schedule/useScheduleState.ts`,
`src/components/room-screen/RoomScreen.tsx`.

## Mocking via URL

Append to any URL — **all values are interpreted as UTC**:

```
?mockNow=2026-11-17T09:30:00Z   ISO, explicit UTC
?mockNow=2026-11-17T09:30:00    no TZ → assumed UTC
?mockNow=Nov+17,+2026+09:30     natural ("+" = space)
?mockNow=nov-17-2026            hyphen-separated, 00:00 UTC
?mockNow=nov17                  sticky; year defaults to 2026, 00:00 UTC
?mockNow=nov17-09:30            sticky + time
?mockNow=nov17&mockSpeed=10     start at nov 17, run 10× faster
```

`mockSpeed` accelerates the clock (1 = real-time). From `mockNow`, time advances
at real speed × `mockSpeed`.

## Gotchas

- `useNow()` returns `null` during SSR / first paint (avoids hydration
  mismatch). Treat as loading, or use `useNowMs()` which falls back to real time
  until mounted.
- The mock params are read client-side from `window.location.search` on mount;
  set them in the URL when loading the page you're testing.
