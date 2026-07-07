---
name: verify
description: How to launch and drive the devcon website to verify UI changes at runtime (dev server + headless Chromium via playwright-core).
---

# Verifying devcon website changes

## Launch

`pnpm dev` from `monorepo/devcon` starts TinaCMS + Next.js on `http://localhost:3000`.

- If it fails with "Datalayer server is busy on port 9000", a dev server is **already running** (often the user's own) — just use `http://localhost:3000` directly.
- Routes redirect (308) through the i18n middleware; follow redirects or use the trailing-slash URL (e.g. `/speaker-applications/`).

## Drive (headless browser)

No Playwright/Puppeteer in the repo, but Playwright browsers are cached on this machine. Recipe:

1. In a scratch dir: `npm i playwright-core`
2. Launch with the cached headless shell (adjust revision to whatever is in the cache dir):
   ```js
   const { chromium } = require('playwright-core')
   const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell`
   const browser = await chromium.launch({ executablePath: exe })
   ```
3. CSS module class names in dev render as `<file>-module-scss-module__<hash>__<local-name>` — the local name is a **suffix**, so select with `[class$="__track-card"]` / `[class*="track-card-inner"]`, not `[class*="track-card__"]`.

## Emulation notes

- Touch/tap mode: `newContext({ isMobile: true, hasTouch: true, viewport: {width: 390, height: 844} })` correctly makes `matchMedia('(hover: none)')` and `(pointer: coarse)` match, which is what `src/hooks/useIsTouchDevice.ts` keys off.
- Reduced motion: `page.emulateMedia({ reducedMotion: 'reduce' })`.
- Screenshot a section with `page.locator('section#id').screenshot(...)` after `scrollIntoViewIfNeeded()`.

## Gotchas

- `pnpm lint` (`next lint`) is currently broken repo-wide on Next 16 ("Invalid project directory ... /lint") — not a signal about your change.
- Type-check with `pnpm exec tsc --noEmit` (per CLAUDE.md). Do not run `pnpm build` unless asked.
