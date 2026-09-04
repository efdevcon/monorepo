# Data Layer Architecture

```
┌─────────────┐
│  Component  │
└──────┬──────┘
       │ useSessions / useSpeaker(id) / useRooms / useEvent / useSyncStatus
       ▼
┌─────────────┐     ┌──────────────────────────────┐
│    Hooks    │────▶│  EventStore snapshot (memory) │  read model: Session[], Speaker[], Room[],
│ (src/data/  │     │  useSyncExternalStore         │  byId maps; speakers/rooms joined by id
│  hooks/)    │     └──────────────┬───────────────┘
└─────────────┘                    │ hydrate (boot) / replace (sync)
                                   ▼
                    ┌─────────────────────────────┐
                    │  Dexie rows (per event)     │  eventSessions, eventSpeakers, eventRooms,
                    │  IndexedDB                  │  eventMeta { version, syncedAt, checkedAt }
                    └──────────────▲──────────────┘
                                   │ normalise (one transaction)
                    ┌──────────────┴──────────────┐
                    │  Provider                   │  getVersion(dataset)  → 60 B probe
                    │  (src/data/providers/)      │  getBundle(dataset)   → one response
                    └─────────────────────────────┘
```

- Sync runs on boot, tab visible, network back, and every 60 s while visible; it only fetches the
  bundle when the version changed (or on force). See `src/data/store/event-store.ts`.
- Announcements, tickets and user state (stars, read state) use SWR over the Dexie `cache` table
  instead (`src/data/cache/`); they are small and have their own lifecycles.
- Pure parts (`normalize.ts`, `materialize.ts`, `shouldFetch`) are covered by `pnpm data:test`.
