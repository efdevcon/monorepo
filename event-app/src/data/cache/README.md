# State management & offline persistence (Dexie)

> **Rule of thumb:** all app state/data must survive going offline. Route every
> fetch and every piece of persisted state through this layer so it lands in
> **IndexedDB via Dexie**. Do not introduce a second persistence mechanism
> (`localStorage`, a different IDB wrapper, an in-memory-only store) for data
> that should be available offline.

## Why Dexie

This is an **offline-first** event app — attendees use it in venues with poor or
no connectivity. Two requirements drive the design:

1. **Offline availability** — once data has been seen, it must render again with
   no network.
2. **Room to store a lot** — schedules, speakers, tickets, etc. `localStorage`
   caps at ~5 MB and is synchronous; **IndexedDB** holds hundreds of MB and is
   async. [Dexie](https://dexie.org) is our thin, typed wrapper over IndexedDB.

## Architecture

```
SWR hook (useSessions, useTickets, …)
   │  reads/writes
   ▼
SWR in-memory cache  ──persisted to──▶  Dexie (IndexedDB)
   ▲                                       │
   └──────── hydrated on startup ──────────┘
```

| File | Role |
|------|------|
| `cache-db.ts` | Declares the Dexie database (`SWRCacheDB`) and its tables. Browser-only (`null` on the server). |
| `indexeddb-cache.ts` | Wraps a `Map` so every `set`/`delete`/`clear` is mirrored to Dexie, and hydrates the map from Dexie on boot. Exposes `createDexieCacheProvider()` and `cleanupOldCacheEntries()`. |
| `swr-config.tsx` | `SWRConfigProvider` wires that Dexie-backed map in as SWR's `provider`. **Waits for IndexedDB to hydrate before rendering** (`cacheReady`) to avoid a race where Dexie's async load overwrites SWR state. Mounted in `src/app/layout.tsx`. |

Because the SWR cache provider _is_ Dexie, **any data fetched through an SWR
hook is automatically persisted and offline-available** — no extra work per
hook. Entries older than `MAX_CACHE_AGE` (24h) are dropped on load.

## How to add new data (the default path)

Write an SWR hook. That's it — persistence is free.

```ts
"use client";
import useSWR from "swr";

export function useThing(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["thing", id] : null,        // null key = don't fetch yet (e.g. not logged in)
    () => provider.getThing(id),       // fetcher
    { revalidateOnFocus: false }
  );
  return { thing: data, isLoading, error, refresh: () => mutate() };
}
```

- **Key the cache deterministically** (`["thing", id]`). The key is what Dexie
  stores under, so it must be stable across reloads.
- **Gate on readiness** by passing a `null` key until prerequisites exist
  (auth, an id). See `useTickets` (waits for a signed-in user) and `useSessions`.
- Derived/ephemeral values (e.g. QR codes generated from cached secrets) can
  live in component state — they regenerate from the cached source offline.

Reference implementations: `src/data/hooks/use-sessions.ts`,
`src/data/tickets/useTickets.ts`.

## When to add a dedicated Dexie table

The shared SWR cache covers most needs. Add your own table in `cache-db.ts`
(bump `this.version(n)`) when you need:

- **Large or relational datasets** you want to query/filter with Dexie indexes
  rather than hold whole in the SWR cache.
- **User-authored mutations / write queues** that must outlive the 24h cache
  window or sync when back online.

```ts
// cache-db.ts
this.version(2).stores({
  cache: "&key, timestamp",
  myTable: "&id, someIndex",
});
```

Keep it in this DB (or a sibling Dexie class here) so all persistence stays in
one documented place.

## Gotchas

- **Browser-only.** `cacheDB` is `null` during SSR/static export; always guard
  with `typeof window !== "undefined"`.
- **Don't render before hydration.** Anything reading the cache must sit under
  `SWRConfigProvider`, which blocks render until `cacheReady`.
- **Native build.** Under `STATIC_EXPORT` (Capacitor) there are no API routes —
  data hooks that hit `/api/*` must point at the deployed web origin.
