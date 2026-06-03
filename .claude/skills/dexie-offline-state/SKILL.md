---
name: dexie-offline-state
description: >-
  How to add or change state/data persistence in the event-app (the
  offline-first Devcon PWA under event-app/). Use whenever adding a data-fetching
  hook, caching API responses, persisting user state, or deciding where state
  lives in event-app. The app is offline-first: all persisted state must go
  through the Dexie/IndexedDB-backed SWR layer so it survives no connectivity.
  Triggers: "fetch X in event-app", "cache", "offline", "persist", "store",
  "useSWR", "Dexie", "IndexedDB", "add a hook", "state management".
---

# Dexie offline-first state (event-app)

The `event-app` package is an **offline-first** PWA used in venues with poor
connectivity. Persisted state lives in **IndexedDB via Dexie**, fronted by SWR.
Full reference: `event-app/src/data/cache/README.md` — read it before changing
the cache layer.

## The rule

All app data/state that should survive going offline **must** flow through the
Dexie-backed SWR cache. Do **not** add a parallel persistence mechanism
(`localStorage`, another IndexedDB wrapper, in-memory-only stores) for such data.

## Default path: write an SWR hook

The SWR cache provider _is_ Dexie (`src/data/cache/`), so anything fetched via an
SWR hook is automatically persisted and offline-available — no per-hook work.

```ts
"use client";
import useSWR from "swr";

export function useThing(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["thing", id] : null,      // null key = don't fetch yet (auth/id missing)
    () => provider.getThing(id),
    { revalidateOnFocus: false }
  );
  return { thing: data, isLoading, error, refresh: () => mutate() };
}
```

- Key the cache **deterministically** (`["thing", id]`) — the key is the Dexie
  storage key and must be stable across reloads.
- **Gate** with a `null` key until prerequisites exist (e.g. a signed-in user).
- Put reusable hooks under `src/data/<domain>/` (see `src/data/tickets/useTickets.ts`,
  `src/data/hooks/use-sessions.ts`).

## Dedicated Dexie table (only when needed)

Add a table in `src/data/cache/cache-db.ts` (bump `this.version(n)`) for large
/relational datasets you query with indexes, or write-queues that must outlive
the 24h cache window. Keep all persistence in that DB.

## Gotchas

- `cacheDB` is `null` on the server/static export — guard with
  `typeof window !== "undefined"`.
- Anything reading the cache must render under `SWRConfigProvider`
  (`src/app/layout.tsx`), which waits for IndexedDB hydration.
- Under `STATIC_EXPORT` (Capacitor native) there are no API routes; hooks hitting
  `/api/*` must target the deployed web origin.
