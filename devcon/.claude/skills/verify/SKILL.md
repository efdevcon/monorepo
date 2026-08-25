---
name: verify
description: How to launch and drive the devcon website to verify UI changes at runtime (dev server + headless screenshots via scripts/shot.mjs).
---

# Verifying devcon website changes

## Launch

`pnpm dev` from `monorepo/devcon` starts TinaCMS + Next.js on `http://localhost:3000`.

- If it fails with "Datalayer server is busy on port 9000", a dev server is **already running** (often the user's own) — just use `http://localhost:3000` directly.
- **Confirm which app owns the port** before screenshotting — event-app also defaults to 3000 (second server started lands on 3001): `curl -s http://localhost:3000/ | grep -o "<title>[^<]*</title>"` (event-app → "Devcon App v2").
- Routes redirect (308) through the i18n middleware; the harness follows redirects, but prefer trailing-slash URLs (e.g. `/speaker-applications/`).

## Screenshots

Use the checked-in harness — do NOT write ad-hoc Playwright scripts:

```bash
node ../scripts/shot.mjs / --port 3000                       # 390/768/1440 into .screenshots/
node ../scripts/shot.mjs /speaker-applications/ --port 3000 --full-page
node ../scripts/shot.mjs / --port 3000 --selector 'section#supporters'
```

`--port` is required by design. Widths < 768 get mobile emulation (isMobile + hasTouch), so `matchMedia('(hover: none)')`/`(pointer: coarse)` match — which is what `src/hooks/useIsTouchDevice.ts` keys off.

For anything the harness can't do (clicking through flows, reduced-motion emulation via `page.emulateMedia({ reducedMotion: 'reduce' })`), write a one-off script importing `playwright-core` from the repo root and reuse the executable-lookup pattern from `scripts/shot.mjs`.

## Selector notes

CSS module class names in dev render as `<file>-module-scss-module__<hash>__<local-name>` — the local name is a **suffix**, so select with `[class$="__track-card"]` / `[class*="track-card-inner"]`, not `[class*="track-card__"]`.

## Gotchas

- `pnpm lint` (`next lint`) is currently broken repo-wide on Next 16 ("Invalid project directory ... /lint") — not a signal about your change.
- Type-check with `pnpm exec tsc --noEmit` (per CLAUDE.md). Do not run `pnpm build` unless asked.
