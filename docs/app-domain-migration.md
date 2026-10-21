# app.devcon.org: old app → event-app

Status 2026-10-21: swap today. `app.devcon.org` is the custom domain of the Netlify site `devcon-app` (old Devcon 7 app). It moves to the event-app site, which is renamed from `devcon-event-app` to `devcon8-app` on the way (why: below). DNS stays as is: the record is a CNAME to a netlify.app host and Netlify routes by hostname, so the swap is a dashboard move only.

Rule for the swap: every install made before it gets a "this app has moved" screen and a clean re-install, whether it was opened yesterday or two weeks ago. Three kinds of install exist.

## 1. Installs of the old Devcon 7 app (app.devcon.org)

Both apps register a service worker at scope `/`, and a browser checks for a new worker on every launch of an installed app. After the swap an old install fetches event-app's `/sw.js` as its update:

- Still running the old code (first launch after the swap, from its precache): the old app's notice turns into "the new Devcon app is live", which cannot be closed. Builds older than 2026-09-29 have no notice; they show the old app for a few seconds.
- event-app's worker, seeing the old app's precache (`workbox-precache-*`; its own is `serwist-precache-*`), activates at once, reloads the old app's pages and removes that precache (`src/sw.ts`). This is the worker's only `skipWaiting`, and it fires only once: the pages it claims run the old app, never an older build of event-app.
- The reload runs event-app, and `LegacyInstallGate` (`src/components/LegacyInstallGate.tsx`) shows "This app has moved" instead of the app, on every launch, on iOS and Android alike. iOS never renames an installed app; Chrome on Android rebuilds one only on its own schedule (a daily manifest check, then a background re-install that can take days), so both get a clean re-install. Browsers key installed apps on the manifest `id` (`/install/1`, see 3; the old app had none, so its identity is its start_url `/`), so app.devcon.org installs as a new "Devcon 8" app beside the old icon.
- Tell: an old install launches at a bare `/` with the old app's leftovers around it (`devcon-app-storage` in localStorage, or its caches `devcon-api-*`, `next-data`); every icon of event-app launches at `/?install=N`. On Android an installed app shares Chrome's storage, so the leftovers alone would also match a fresh install on a phone that once browsed the old app; the launch marker (and the device's memory of it, prefs key `install.version`) rules that out.
- Their old push subscription is dropped on first use (`ownSubscription` in `usePushSubscription.ts`).
- Off switch: `LEGACY_INSTALL_GATE_ENABLED` in the gate file.

## 2. Installs from the pre-launch host (devcon-event-app.netlify.app)

Once a site has a primary custom domain, Netlify redirects its netlify.app host to it and nothing can turn that off. A redirect kills an install silently: it keeps opening its cached copy but a worker script behind a redirect is refused, so it can never update, and its own API routes are gone. An install that updated before the swap would know (the gate's retired-host check below), one that did not would stay frozen.

So the old name keeps answering, without a redirect, with something that switches installs off:

- The event-app site is renamed `devcon8-app` (its netlify.app host, deploy previews and branch deploys move with it; app.devcon.org is unaffected).
- A new static site takes the freed name `devcon-event-app`, deployed from `event-app-retired/`: a `/sw.js` that takes over at once, deletes every cache, drops the push subscription, reloads open pages and unregisters itself; and an `index.html` "This app has moved" page. A tab is sent on to the same path on app.devcon.org by the page's script; an installed app launches at `/` and sees the page. `_redirects` answers `/manifest.webmanifest` with a redirect to app.devcon.org's, which is also what the in-app check looks for.
- A browser fetches `/sw.js` on every launch of an installed app, so every install made from that host gets the kill switch on its next launch, however old; the moved page is up about two seconds after launch (headless test, 2026-10-21). Checked the same day on throwaway sites: a renamed site's old name can be claimed again at once.
- Both workers start the page reload during activation without awaiting it: a navigation waits for the controlling worker to finish activating, so awaiting it there deadlocks for about a minute.
- Checked on an iPhone and a Pixel the same day, through a tunnel to a local production build: old icon → moved screen by itself, re-install, retired site → moved screen on the next launch.
- The moved screens' button: iPhone hands the address to Safari (`x-safari-https://`, a Home Screen app otherwise opens other sites in a sheet with no Add to Home Screen); Android opens the system share sheet to pick Chrome (an installed app opens other sites in an in-app tab with no Install, and Chrome routes intent URLs and its own scheme there as well); elsewhere a plain link.
- In-app companion (`LegacyInstallGate`): on that host, a `HEAD /manifest.webmanifest` that comes back as a redirect marks the host retired (remembered in prefs, `legacy.retiredHost`), for the minutes between the domain move and the new site, and as a fallback should the rename go wrong.

## 3. Install version, for the next migration

`src/data/install/installVersion.ts`: the manifest `id` is `/install/1` and its start_url `/?install=1` (the personalised sign-in-bridge manifest has the same id and carries `&install=1` through its redirect; the worker's offline bridge fallback keeps it). An installed icon launches with the version it was made with for its whole life, so the app can tell an old icon from a current one. To renew every install later: bump `INSTALL_VERSION` and the static manifest (id and start_url), and gate launches whose version is lower. A new id is a new app to Chrome (installs beside the old icon); iOS needs the usual Add to Home Screen. The device remembers the highest version it launched with (`install.version` in prefs), so a hard reload on an in-app URL still counts as a current install. Analytics drop the param.

## Before the swap

Old app (`devcon-app`):

- [x] `Devcon8Notice` (`src/pages/_app.tsx`), state from `NEXT_PUBLIC_MIGRATION_STATE` in `netlify.toml`: `nothing`, `preparing` (default), `migrated`. In `preparing` it probes `HEAD /manifest.webmanifest` (only event-app answers 200) and flips to the blocking re-install notice by itself.
- [ ] Push to main and let it deploy (it can sit live for days).

event-app:

- [x] Name and description (`src/CONFIG.ts`, `public/manifest.webmanifest`).
- [x] Public origin: taken from Netlify's primary domain at build time (`next.config.ts`), so app.devcon.org after a redeploy; code defaults now say app.devcon.org too.
- [x] Old-app takeover in `src/sw.ts`; `LegacyInstallGate` for old-app installs and the retired host; install version in the manifests.
- [x] Push guard: a subscription made with another VAPID key (the old app's) is unsubscribed instead of read as "on" or subscribed over.
- [x] `event-app-retired/` (static, deployed by hand).
- [x] devcon-api CORS (`src/app.ts`): `devcon8-app` host and its deploy previews.
- [x] devcon.org `src/services/meerkat-redirect.ts` and the install-email scripts point at app.devcon.org.
- [ ] Netlify env: `NEXT_PUBLIC_MATOMO_SITE_ID` empty for the deploy-preview and branch-deploy contexts (every Netlify build is a production build, so previews report into site 38 too).
- [ ] Netlify env: remove the production value of `NEXT_PUBLIC_MOCK_NOW_TO_EVENT_START` (it starts every visitor's clock at the event start).
- [ ] Later, not during the swap: Supabase OTP email templates and `emailRedirectTo` in `useUser.tsx` still ride on the devconnect sentinel URL; if the devconnect sunset prunes it, sign-in codes stop appearing. Moving to app.devcon.org (already in the redirect allow-list) means the code and both templates at the same moment.
- [ ] Optional cleanup: the old 2D venue map (`src/app/(page-layout)/map/venue-map/`) is dead code, but its background is still pre-cached on every device (`MAP_IMAGES` in `src/data/appImages.ts`).
- Checked 2026-10-21: nothing else in event-app is tied to the old host.

## Swap

1. Both apps deployed with the items above; devcon-api deployed with the CORS change.
2. Quiet hour, in this order:
   1. Netlify, site `devcon-app`: remove `app.devcon.org`.
   2. Netlify, site `devcon-event-app`: change the site name to `devcon8-app` (done while it has no custom domain).
   3. Site `devcon8-app`: add `app.devcon.org` as primary domain, wait for the certificate (minutes).
   4. Create a site named `devcon-event-app` and deploy `event-app-retired/` to it (`netlify deploy --prod --dir event-app-retired --site <its id>`).
   5. Redeploy `devcon8-app` so the build picks up app.devcon.org as its origin (open graph, push tap-through links).
3. Verify: `curl -I https://app.devcon.org/manifest.webmanifest` is 200 with a valid certificate; on `devcon-event-app.netlify.app`, `/sw.js` is 200, `/manifest.webmanifest` a 301 to app.devcon.org, `/schedule` the moved page; `devcon8-app.netlify.app` redirects to app.devcon.org.
4. Phones:
   - old Devcon 7 app installed (iPhone and Android): launch; after a moment "This app has moved"; relaunch: same. Install from app.devcon.org: a second icon "Devcon 8" (Android installs it beside the old one); delete the old.
   - installed from the netlify.app host: launch; "This app has moved" from the retired site; re-install from app.devcon.org, notifications on again.
   - fresh install from Safari and from Chrome: opens normally; sign in, notifications on, tap a notification; a cold launch's URL carries `?install=1`.
   - desktop: app.devcon.org loads.

Rollback: move the domain back to `devcon-app` (the rename and the retired site can stay). Set `LEGACY_INSTALL_GATE_ENABLED` to false if the gate catches installs it shouldn't; the takeover in `src/sw.ts` fires only on the old app's precache.

## After the swap

- [ ] devcon.org: `src/pages/sea/schedule/[code].tsx` sends Devcon 7 session links to app.devcon.org; point it at the old app's netlify.app host. Other DC7-era links into the app (featured DC7 speakers, CLS schedule filters in `content/en/pages/index.mdx`) are unused or stale; check.
- [ ] Old site: stop builds on `devcon-app`; it stays reachable on its netlify.app host as the Devcon 7 archive.
- devcon-api links AI catalogue sessions to app.devcon.org (`EVENT_APP_ORIGIN`) and the QR redirect slug `app` points there: both start working with the swap.
- [ ] Notion announcements page: its "Preview in the app" and "Publish changes" links point at the netlify.app host; they still land (the moved page sends a tab on to app.devcon.org), update when convenient.
- [ ] Room screens / AV: URLs become `app.devcon.org/room-screens/<id>`.
- [ ] Partners: pk910 faucets and the ENS claim page switch their app URL to `https://app.devcon.org/ticket` (redirects to `/my-devcon`).
- [ ] Pretix order emails: check for app links.
- [ ] Supabase redirect allow-list: add the `devcon8-app` deploy-preview pattern if the old one is listed.

## Testing fixes during the event

Keep working with deploy previews: one PR per fix, test its `deploy-preview-<n>--devcon8-app.netlify.app` URL, merge to main to ship. It has worked so far, and previews keep working after the swap (Netlify only redirects the site's own netlify.app host to the primary domain, not preview or branch hosts).

What a preview can't test well is anything tied to an installed app: install, offline, push. Each preview is a new origin, so it needs its own install, sign-in and notification opt-in. For those, optionally keep one long-lived branch deploy:

- [ ] Optional: branch `event-app-dev`, branch deploys enabled for it in Netlify, at `event-app-dev--devcon8-app.netlify.app`. The team installs it once and keeps it; a fix to try on a real installed app is merged into it first, then into main. No custom domain: a branch on a custom subdomain needs Netlify DNS, and the netlify.app host is enough for the team. Needs its origin added to devcon-api CORS (the preview regex only matches `deploy-preview-<n>`).
- Push from that install: its subscriptions sit in the same table as production ones, so team members get production broadcasts there too, and tap-through links open the dev host (`APP_ORIGIN` follows `DEPLOY_PRIME_URL`).
- Cost: the branch has to be kept in sync with main (merge main into it after each release), and every push builds.
