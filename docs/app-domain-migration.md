# app.devcon.org: old app → event-app

Status 2026-10-14: planned, nothing deployed yet. `app.devcon.org` is the custom domain of the Netlify site `devcon-app` (old Devcon 7 app). It moves to `devcon-event-app` (event-app). DNS stays as is: the record is a CNAME to a netlify.app host and Netlify routes by hostname, so the swap is a dashboard move only.

## How the handover works

Both apps register a service worker at scope `/`, and the old app checks for a new worker on every return to the foreground. After the swap, an old installed app fetches `/sw.js` from the new origin, so it switches to the new app by itself on its first online launch. What it cannot fix: iOS never updates the name and icon of an installed web app, so old installs keep "Devcon Passport" and the old icon until the user re-installs. The re-install nudge therefore lives mostly in the new app; the old notice is seen for about one launch.

## Before the swap: old app (`devcon-app`)

- [x] `Devcon8Notice` (`src/pages/_app.tsx`) has three states, picked by `NEXT_PUBLIC_MIGRATION_STATE` in `netlify.toml`: `nothing` (no notice), `preparing` (default), `migrated` (re-install copy). In `preparing` it also probes `HEAD /manifest.webmanifest` (same origin, no-store; only the new app answers 200) and flips to the re-install copy by itself, calling `registration.update()` so the handover starts at once. Set `migrated` and deploy right before the swap; set `nothing` or leave `migrated` on the archive host afterwards. Done locally 2026-10-14, uncommitted.
- [x] Re-install copy with "Copy link" and "Open app.devcon.org" (`target="_blank"`). On iOS a standalone app opens links in an in-app browser sheet whose share menu has no "Add to Home Screen"; the copy says to tap the Safari button in that sheet first.
- [ ] After the swap: stop builds on the `devcon-app` site; it stays reachable on its netlify.app host as the Devcon 7 archive.

## Before the swap: event-app

- [ ] Replace the placeholders: `APP_NAME` / `APP_DESCRIPTION` in `src/CONFIG.ts` and `public/manifest.webmanifest` ("Devcon App V1", "Ethereum knitting club."); check icons and apple-touch-icon.
- [ ] Worker handover: move the Serwist worker to its own path (`swUrl` + `swDest` in `next.config.ts`, e.g. `/sw-dc8.js`) and serve a kill-switch at `public/sw.js`: skipWaiting on install; on activate delete every cache, unregister, reload clients. Old installs switch without a full close and the old precache is wiped. Team installs on the netlify.app host go through the same handover.
- [ ] Push guard in `subscribe()` (`src/data/push/usePushSubscription.ts`): if an existing subscription has a different `applicationServerKey` (the old app's VAPID key), unsubscribe it first; otherwise the first "turn on" throws InvalidStateError.
- [ ] Re-install nudge: standalone display mode on iOS plus the old app's `devcon-app-storage` localStorage key means "running inside the old shell" (a fresh iOS install has its own storage). Dismissable card: re-install for the new icon. Clear the old keys afterwards.
- [ ] Redirects for old paths: `/login`, `/account/*`, `/onboarding` → `/ticket` or `/`; `/venue` → `/map`; `/event`, `/streams` → `/`. `/schedule/<code>` and `/speakers/<code>` exist in both apps but Devcon 7 codes do not resolve against devcon8.
- [ ] Netlify env, production context: `APP_ORIGIN=https://app.devcon.org` (open graph base, push tap-through links). Needs a redeploy after the swap.
- [ ] Supabase: redirect allow-list already has `https://app.devcon.org/**`. Optional but recommended now: add `https://app.devcon.org` to both OTP email templates and switch `emailRedirectTo` in `useUser.tsx` away from the devconnect sentinel.
- [ ] Matomo: site 38 is already app.devcon.org, nothing to do.

## People and links to update after the swap

- [ ] devcon.org: `src/pages/sea/schedule/[code].tsx` sends Devcon 7 session links to app.devcon.org; point it at the old app's netlify.app host. Other DC7-era links into the app (featured DC7 speakers, CLS schedule filters in `content/en/pages/index.mdx`) are unused or stale; check.
- [ ] devcon-api already links AI catalogue sessions to app.devcon.org (`EVENT_APP_ORIGIN`), broken until the swap. Same for the QR redirect slug `app`.
- [ ] Room screens / AV: URLs become `app.devcon.org/room-screens/<id>`.
- [ ] Partners: pk910 faucets and the ENS claim page switch their app URL to `https://app.devcon.org/ticket`.
- [ ] Pretix order emails: check for app links (not verified yet).
- [ ] Team: installs and push subscriptions on the netlify.app host stop working once a primary domain is set (Netlify redirects the netlify.app host to it); re-install.

## Swap day

1. Both apps deployed with the items above; the old notice can sit live for days.
2. Quiet hour. Netlify: remove `app.devcon.org` from `devcon-app`, add it to `devcon-event-app` as primary. Wait for the certificate (minutes).
3. Verify: `curl -I https://app.devcon.org/manifest.webmanifest` returns the new manifest with a valid certificate.
4. Redeploy event-app with `APP_ORIGIN` set.
5. Phone with the old app installed: launch, notice flips, app switches, nudge card shows. Then a fresh install, sign-in, push on, a notification tap.
6. devcon.org SEA redirect, freeze the old site's builds.

Rollback: move the domain back. Old installs that already ran the kill-switch load the old app from the network and re-register its worker.
