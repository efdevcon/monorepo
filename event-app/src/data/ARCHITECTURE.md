# Data Layer Architecture

```
┌─────────────┐
│  Component  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│    Hooks    │────▶│   Adapter        │────▶│   Models    │
│ (useSessions│     │  (Data Source +  │     │  (Zod)      │
│  etc.)      │     │   Validation)    │     │             │
└─────────────┘     └──────────┬───────┘     └─────────────┘
                               │
                               ▼
                    ┌─────────────────────────────┐
                    │     SWR                     │
                    │  Memory Cache               │
                    │  • Fast reads (sync)        │
                    │  • Deduplication            │
                    │  • Stale-while-revalidate   │
                    └──────┬──────────────────────┘
                           │
                           ▼
                    ┌─────────────────────────────┐
                    │   Dexie                     │
                    │  IndexedDB                  │
                    │  • Offline support          │
                    │  • Survives page reloads    │
                    │  • Large dataset capacity   │
                    └─────────────────────────────┘
```
