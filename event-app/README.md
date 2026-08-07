# event-app

Offline-first PWA for Devcon 8 (successor to devcon-app). Next.js App Router + Serwist service worker, with Capacitor wrappers for native iOS/Android builds. Schedule/speaker data comes from devcon-api.

## Getting started

```bash
pnpm install    # from the repo root
pnpm dev        # http://localhost:3000
pnpm typecheck
```

Time-dependent UI can be tested with `?mockNow=` / `?mockSpeed=` query params.

## Docs

- Agent instructions and hard rules (offline/data/SW): [CLAUDE.md](./CLAUDE.md)
- Architecture background (service worker, Dexie, Capacitor, update flow): [docs/architecture.md](./docs/architecture.md)
