---
name: verify
description: How to launch and drive the event-app PWA to verify UI changes at runtime (dev server + headless screenshots via scripts/shot.mjs).
---

# Verifying event-app changes

## Launch

`pnpm dev` from `monorepo/event-app` starts Next.js (turbopack) on `http://localhost:3000` — **unless something else already owns 3000**, in which case Next silently takes 3001.

Always confirm which app owns the port before screenshotting (the devcon site also defaults to 3000):

```bash
curl -s http://localhost:3000/ | grep -o "<title>[^<]*</title>"
# event-app → "Devcon App v2"; the devcon site has a Devcon.org title
```

A dev server is often already running (the user's own) — check before starting a second one.

## Screenshots

Use the checked-in harness — do NOT write ad-hoc Playwright scripts:

```bash
node ../scripts/shot.mjs /schedule --port 3000            # 390/768/1440 into .screenshots/
node ../scripts/shot.mjs /speakers --port 3000 --widths 390 --full-page
node ../scripts/shot.mjs /schedule --port 3000 --selector '[data-testid="foo"]'
```

`--port` is required by design. Widths < 768 get mobile emulation (isMobile + hasTouch), so `(hover: none)`/`(pointer: coarse)` match like a real phone. Output lands in `.screenshots/` relative to cwd (gitignored).

## Time-dependent UI

The app auto-mocks "now" to the selected dataset's event start. To pin a specific moment use `--mock-now`:

```bash
node ../scripts/shot.mjs /schedule --port 3000 --mock-now "2024-11-13T14:00:00Z"
```

(equivalent to `?mockNow=` in the URL; `?mockSpeed=` also exists — see `src/hooks/useNow.ts`).

## Gotchas

- **Service worker is disabled in dev** — anything SW-dependent (push, offline, update toast) can only be verified on a production build or deploy.
- Type-check with `pnpm typecheck`. It has **pre-existing failures at HEAD** (dual `@types/react`) — diff your error set against the baseline before blaming your change; don't try to fix the baseline in passing.
- `pnpm lint` for lint.
- Session times: verify against venue-timezone rendering (`src/data/eventTime.ts`), not your local clock.
- Code style here: double quotes + semicolons (unlike the devcon package).
