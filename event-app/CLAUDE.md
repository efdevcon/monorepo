# event-app

Offline-first PWA for Devcon events (Next.js App Router + Serwist service worker + Capacitor native wrappers).

## Commands

```bash
pnpm dev          # next dev --turbopack
pnpm typecheck    # tsc --noEmit, run before considering a task complete
pnpm lint
```

## Hard rules

- **Offline-first data**: all persisted state goes through the Dexie/IndexedDB-backed SWR layer, never ad-hoc fetch + useState for API data. `/api/*` stays `NetworkOnly` in the service worker; API caching is owned by the SWR/Dexie layer, not the SW.
- **Service worker**: precache stays limited to the app-shell routes. Never enable `skipWaiting`; updates are opt-in via the update toast (`ServiceWorkerUpdater.tsx`).
- **Current time**: never call `Date.now()` / `new Date()` directly in components. Use the shared `useNow`/`useNowMs` hooks (`src/hooks/useNow.ts`) so time can be mocked with `?mockNow=` / `?mockSpeed=` query params.
- **Code style**: double quotes, semicolons (unlike the devcon package).

## Announcements & highlights

Authored in one Notion DB ("Devcon 8 App · Announcements & Highlights", Type column splits them), synced into the Supabase `devcon8_announcements` table, served by `/api/announcements` (CDN-cached, tag-purged by `/api/announcements/refresh` — editors' "Publish" link). Pipeline code: `src/app/api/announcements/service.ts`. Client: `src/data/announcements/useAnnouncements.ts` (Dexie-backed). Highlight images are mirrored into Supabase Storage because Notion attachment URLs expire (~1h). Schema changes go through migrations in `../devcon-api/src/supabase/migrations/` — see devcon-api/CLAUDE.md for how to apply them safely (never `supabase db push`).

## Why these rules exist

Background and history (Serwist setup, precache sizing lessons from Bogota/SEA, Dexie rationale, Capacitor notes, update flow): `docs/architecture.md`.
