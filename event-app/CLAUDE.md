# event-app

Offline-first PWA for Devcon events (Next.js App Router + Serwist service worker + Capacitor native wrappers).

## Commands

```bash
pnpm dev          # next dev --turbopack (no service worker — see below)
pnpm preview      # build + serve, the only faithful way to test offline/PWA
pnpm typecheck    # tsc --noEmit, run before considering a task complete
pnpm lint
pnpm data:test    # pure-function tests: EventStore normalise/materialise/sync decision, routing helpers
```

**Testing offline / the service worker.** Use `pnpm preview` (`next build
--webpack && next start`), optionally with `--port`. There is no dev shortcut
worth using: the SW is off under `pnpm dev` because it would cache dev chunks,
whose names change on every recompile, and `@serwist/next` is a webpack plugin
with no Turbopack support. Enabling it under `next dev --webpack` was tried and
isn't a useful stand-in — precache is thin there (`injectManifest` has no build
output to glob) and webpack dev is slow, so it misleads on exactly the
install/precache behaviour you'd want to check.

Most offline behaviour needs **no** SW at all, though: the EventStore and the
Dexie/SWR layer cover cached data, so the announcements inbox, schedule and
speakers can be tested offline under plain `pnpm dev` with DevTools offline. Only
SW-owned behaviour (image caching, precached routes, the `/offline` fallback,
push, serving `/schedule/<id>` offline from the tab shell) needs `pnpm preview`.

The end-to-end check is `node scripts/offline-sweep.mjs --port <preview port>`
from the repo root against a running `pnpm preview`: it warms the SW and the
store, goes offline, hard-loads every core route and detail deep link (phone and
desktop viewports), and fails on any offline fallback, broken image, layout
squeezed into a gutter, or document reload during client navigation. Go offline
with Playwright's `context.setOffline(true)`: a raw CDP
`Network.emulateNetworkConditions` on the page target leaves the service
worker's own fetches online, so "offline" document loads were served from the
server and proved nothing. CDP emulation also does not flip `navigator.onLine`
for documents loaded after it was switched on, so `useOnline`-driven UI (pill,
"needs a connection" lines) won't show in such a harness unless
`navigator.onLine` is overridden; real devices in airplane mode report it
correctly.

## Hard rules

- **Catalogue data goes through the EventStore** (`src/data/store/`): sessions, speakers, rooms and the event record are one bundle from `GET /events/:id/bundle`, stored normalised in Dexie and synced only when `GET /events/:id/version` changes (60 bytes). Read it through the hooks in `src/data/hooks/` (`useSessions`, `useSpeaker`, …); never fetch catalogue data anywhere else. Adding a field means updating devcon-api's bundle allowlist, `store/types.ts`, `normalize.ts`, `materialize.ts` and the `data:test` fixture. Other persisted state (announcements, tickets, stars) goes through the Dexie-backed SWR layer, never ad-hoc fetch + useState. Interested stars additionally sync to the account when signed in (`src/data/interested/sync.ts`, `POST /api/interests/sync`, table `devcon8_interests`): Dexie rows carry `interested` (false is a tombstone), `updatedAt` and `pending`; never delete a star row, put a tombstone; conflicts are last-write-wins per item; stars stay on the device after sign-out by decision. The service worker has no rule for `/api/*` (requests reach the browser untouched; routing them through the worker made Safari's cold-started worker fail the first request after a pause) and the devcon-api origin is never cached by it.
- **The five bottom-bar tabs are persistent panes** (`src/components/TabPanes.tsx`): their route `page.tsx` files render nothing and the layout keeps each visited pane mounted, toggling `hidden` on tab switches (a page mount of the speakers list cost ~800 ms on a mid-range phone; a toggle is a few ms) and restoring each tab's scroll position. Consequences: anything that portals into the app header or measures the window on scroll must check `usePaneActive()` (`src/components/paneContext.ts`), or every mounted pane does it at once, and IntersectionObserver callbacks must ignore 0×0 rects (a hidden pane's elements); long lists render group by group in the background with `useProgressiveReveal` (`src/hooks/useProgressiveReveal.ts`) so first mount costs a screenful, and jumps call `revealAll()` first so they measure real heights (never render-on-viewport-approach: A–Z jumps then landed on placeholders and the content shifted under the finger); the schedule jumps to "live now" only on app open. Every vertical page jump is instant (`behavior: "auto"`), never smooth: WebKit rasterises everything a smooth scroll passes over and a rapid series crashed iOS (PR #112). Tab taps give a haptic tick: Android via the Vibration API (`utils/haptics.ts`), iOS via a transparent `<input type="checkbox" switch>` overlay inside each tab link (`IosHapticOverlay`; the only path left since iOS 26.5 closed programmatic ticks, an undocumented side effect that may stop working, failing silently). Re-tapping the active tab resets its pane like a native tab bar (`handleTabClick` + `useTabReselect` in `paneContext.ts`): instant scroll to top by default, the schedule jumps to "now", the map resets filters and view (`resetView` in VenueMap); with a detail page open the tap navigates to the bare tab URL, which closes it.
- **Detail pages are real paths that open in place.** `/schedule/<id>` and `/speakers/<id>` are the only detail URLs (shared, crawled, pushed). The route files (`schedule/[id]/page.tsx`, `speakers/[id]/page.tsx`) exist for the URL and its `generateMetadata` and render nothing on the client: the list tab's pane renders the page (`session.tsx` / `speaker.tsx`, mobile as a `DetailLayer` over the list, desktop in place of it; the desktop side panel is local state, not the URL). In the app a detail opens with `openDetail` / `useDetailRoute` (`src/routing/detailRoute.ts`: Next-integrated `history.pushState`, no RSC fetch), links are `DetailLink` (a plain anchor with the real href; never `next/link`, which prefetches per card). Offline, the SW answers a navigation to a detail path with the precached tab shell (`src/sw.ts`), so a never-visited id works too; `/schedule/[id]` is never precached per id. Build hrefs with `detailHref(kind, id)` (`src/routing/viewParams.ts`, also imported by the SW). `/room-screens/[id]` is the deliberate exception (TV kiosk, always online).
- **Live-only features degrade, never error**: gate Q&A, streams, chat, sign-in, push and refresh on `useOnline()` and render `<NeedsConnection what="…" />` in the feature's slot.
- **Service worker**: precache stays limited to the app-shell routes, and never `/` or `/ticket`: precache is cache-first, and those two pages (install button, sign-in) must be server-rendered fresh because the root layout's `<link rel="manifest">` is personalised from the session cookie (the install sign-in bridge; a stale copy installs a signed-out app). Both are warmed into the runtime page cache at SW install instead and served network-first (`src/sw.ts`). Never enable `skipWaiting`; updates are opt-in via the update toast (`ServiceWorkerUpdater.tsx`).
- **Sign-in state must reach the server.** The browser session lives in localStorage (auth-js), but the install bridge is decided server-side from the auth cookie. `useUser` mirrors every sign-in and token refresh into that cookie through `POST /api/auth/session` and clears it on sign-out (`src/data/auth/sessionCookie.ts`); after an OTP sign-in in an iOS browser tab it reloads the page so Safari's "Add to Home Screen" sees the personalised manifest. Don't add sign-in paths that skip this.
- **Current time**: never call `Date.now()` / `new Date()` directly in components. Use the shared `useNow`/`useNowMs` hooks (`src/hooks/useNow.ts`) so time can be mocked with `?mockNow=` / `?mockSpeed=` query params. For content dated against the real world rather than event time (announcements), use `useRealWorldNowMs` — it opts out of the per-deployment event-start auto-mock, which would otherwise let the selected dataset (e.g. devcon-7 → Nov 2024) decide whether today's announcements are visible.
- **Event timezone**: the API serves session times as plain UTC instants with no timezone; all wall-clock rendering and day grouping must go through the venue-timezone helpers in `src/data/eventTime.ts` (`eventFmt`, `eventDayKey`, …). Never format session times with a bare `Intl.DateTimeFormat` or local `Date` getters — that shifts the schedule with the viewer's system timezone. Announcements are the exception (real-world-dated, intentionally viewer-local).
- **Code style**: double quotes, semicolons (unlike the devcon package).

## Announcements & highlights

Authored in one Notion DB ("Devcon 8 App · Announcements & Highlights", Type column splits them), synced into the Supabase `devcon8_announcements` table, served by `/api/announcements` (CDN-cached, tag-purged by `/api/announcements/refresh` — editors' "Publish" link). Pipeline code: `src/app/api/announcements/service.ts`. Client: `src/data/announcements/useAnnouncements.ts` (Dexie-backed). Highlight images are mirrored into Supabase Storage because Notion attachment URLs expire (~1h). Schema changes go through migrations in `../devcon-api/src/supabase/migrations/` — see devcon-api/CLAUDE.md for how to apply them safely (never `supabase db push`).

## Web push (announcements Phase 2)

Announcements with the Notion `Push` checkbox go out as web push at their Send At time; the inbox stays the source of truth (push is best-effort). Pipeline: `src/app/api/push/service.ts` (claim/fan-out/prune design notes in its header) + routes under `src/app/api/push/`; SW handlers at the bottom of `src/sw.ts` (Declarative Web Push JSON for Safari 18.4+, classic handler elsewhere); opt-in UI on `/announcements` (`PushOptIn` + `src/data/push/usePushSubscription.ts` — never auto-prompt). The dispatcher is `netlify/functions/push-dispatch.mts` (every minute → secret-gated `/api/push/dispatch`; idempotent, crash-reclaim after 10 min). Team test-sends: `POST /api/push/test {id}` (@ethereum.org only, doesn't consume the row's status). Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (one keypair forever — rotating orphans every subscription), `PUSH_DISPATCH_SECRET`. Subscriptions live in `devcon8_push_subscriptions`. Note: the SW is off under `pnpm dev`, so subscribe/receive needs `pnpm preview` (build + serve) or a deploy.

## Images (offline)

Every image in the app must survive going offline, so adding one has three
requirements. All remote images are served from our own Supabase Storage
(`speaker-avatars`, `event-app-announcements`, `event-app-swag`), which sends
`Access-Control-Allow-Origin: *`.

1. **Put remote images on our Supabase Storage**, mirrored like avatars and
   highlight images already are — never hotlink a third-party CDN. A host that
   doesn't send CORS headers breaks rule 2, and an expiring URL (Notion
   attachments, ~1h) breaks caching entirely.
2. **Add `crossOrigin="anonymous"` to every cross-origin `<img>`.** Without it
   the request is `no-cors` and the response is opaque, which is quota-padded far
   beyond its real size; a cache full of opaque entries trips the SW's
   `purgeOnQuotaError` and wipes *every* cached image. Never mix modes for the
   same URL: `Cache.match` keys on URL alone, so an opaque entry cached by a
   `no-cors` request will be found and then refused by a later CORS-mode request.
   That's also why `use-warm-images.ts` fetches with `mode: "cors"`.
3. **Static assets in `public/` need listing too.** They're same-origin, so they
   never show up in the warm list built from API data — that's exactly why they
   were the one category that stayed broken after reconnecting. Small chrome
   (logos, empty-state art, the manifest) goes in `additionalPrecacheEntries`
   (next.config.ts) so it survives the first offline paint; anything large goes in
   `APP_IMAGES` (`src/data/appImages.ts`) and is warmed at runtime instead.
   **Never precache large art** — `login/backdrop.jpg` alone is 1.4MB and the SW
   install is paid by every device. And every precache entry MUST exist: one 404
   fails the install everywhere, which has bitten this repo before.
4. **Warm it if it can render unfetched.** The SW caches images with CacheFirst,
   so it only ever holds what the browser actually requested. Anything behind
   `loading="lazy"`, a carousel, or a route the user may not visit is *not*
   cached just because its data is. Add its URLs to `useWarmImages`
   (`src/data/hooks/use-warm-images.ts`, wired up in `CacheWarmer`). The warmer
   waits for the service worker to claim the page before fetching
   (`src/utils/serviceWorkerControl.ts`): on a cold visit the data is in hand
   after a couple of seconds while the shell precache takes ~10 s on a phone,
   and giving up at that point left the whole first session with no pre-cached
   images. Keep that wait; never gate warming on `serviceWorker.controller`
   at effect time.

5. **Never render a broken image.** Wire `onError` to `useRetryOnReconnect`
   (`src/hooks/useRetryOnReconnect.ts`) and fall back to a placeholder — initials
   for avatars, the lavender/Sparkle panel for cards. An `<img>` that fails while
   offline stays broken for the life of the page otherwise, so the hook also
   remounts it (via `key={attempt}`) when `online` fires. Retry by remounting the
   *same* URL, never a cache-busting query param: that would miss the SW's cached
   copy and pile up duplicate cache entries.

Do **not** drop `loading="lazy"` to force caching. It works, but rasterizing
hundreds of images down a tall page is the mechanism behind the iOS
content-process crash the speakers page already hit once. Warm via `fetch`, which
keeps the images out of the render tree.

Warm concurrency stays at 6 (`CONCURRENCY` in `use-warm-images.ts`), decided
2026-09-04: the full devcon-7 set warms in about 16 s, which is acceptable, and
more parallel fetches during the first minute risk slowing low-end phones and
competing with the images the user is actually looking at. Don't bump it
without re-checking on a slow device.

Warming is incremental on purpose: it reads the `static-images` cache and fetches
only the difference, so reopening the app with nothing changed costs nothing.
Keep it that way — don't add a separate "already warmed" ledger, which would
drift as soon as an entry expired or was LRU-evicted and then silently stop
re-warming. Avatar and mirrored-image filenames are content hashes, so a changed
image is a new URL and shows up as missing on its own.

The SW image rule needs `CacheableResponsePlugin({ statuses: [0, 200] })`.
Serwist only skips its status-200-only filter when a plugin implements
`cacheWillUpdate`, and `ExpirationPlugin` doesn't — without it, every opaque
response is dropped and no cross-origin image caches at all. Verify image
caching with `pnpm preview` (build + serve) or a deploy; plain `pnpm dev` has no
service worker at all, so nothing caches.

## Why these rules exist

Background and history (Serwist setup, precache sizing lessons from Bogota/SEA, Dexie rationale, Capacitor notes, update flow): `docs/architecture.md`.

## Partner ticket proofs

Lets a partner (ENS) verify "holds a Devcon ticket, of tier india|standard"
without learning who the attendee is. We sign, they verify with a pinned public
address; there's no callback. Issuer: `src/app/api/ticket-proof/` (`proof.ts`
holds the crypto and the tier mapping). Client: `src/data/tickets/useTicketProof.ts`
plus `TicketProofButton`, attached to event-ticket rows only (never swag). A
working partner-side reference lives at `/demo/ens-perks` (`src/app/demo/`), which
is POC-only and should be dropped before production. Full spec, invariants and
the PWA hand-off reasoning: `docs/ticket-proofs.md`. Tests: `pnpm proof:test`;
demo links: `pnpm proof:demo-link`.

Tier detection is structural, not a checked-in product list: Pretix's
`admission` flag decides whether a position is provable at all (merchandise can
be sold as a standalone position, so "not an add-on" is a different question),
then the India flag emoji in the product name decides `india` vs `standard`.
Don't switch that to matching the word "India" — Devcon 8 is *in* India, so the
country name appears in swag ("Devcon India Scarf") and could appear in a renamed
main product, which would hand sponsored registrations to everyone. Unrecognised
products default to `standard` by design.

Three things not to undo: the signer address is never carried in the proof link
(pinning it out of band is what makes verification non-circular), the identifier
is a *salted* HMAC of the ticket secret (the secret is the QR payload, so a bare
hash would deanonymise claims), and the signing key is dedicated and funds-free
(never the payment relayer key).

## Attached tickets (which ticket is yours)

Sign-in stays the email OTP. `/api/tickets` returns tickets matched by the
session email plus positions the account attached (`devcon8_ticket_links`,
service-role only). Attached tickets come first and carry `attached: true`;
every ticket carries its Pretix `positionId`. The client derives one primary
ticket and which prompt to show with the pure helpers in
`src/data/tickets/primary.ts` (`pnpm data:test`): an attached ticket, else the
sole email match, else the tab asks.

- **Two proofs, one endpoint** (`POST /api/tickets/attach`): `{ positionId }`
  chooses one of the account's own email-matched admission positions (the
  email match is the proof); `{ code }` is the QR payload of a ticket not under
  this email, verified against Pretix (`getPositionBySecret`, this event, paid,
  live, not an add-on). The link records its `proof` (`email` or `qr`) and a
  SHA-256 of the secret, never the secret. `DELETE { positionId }` detaches.
- **Upload formats**, all decoded on the device (`src/data/tickets/qrFromFile.ts`,
  imported dynamically): a screenshot or photo (jsQR, `qrDecode.ts`,
  `pnpm qr:test`), a `.pkpass` wallet pass (payload is text in its `pass.json`,
  `passBarcode.ts`), or the ticket PDF (pages rendered with pdf.js, loaded on
  demand). No camera scanner, no deep links; never log the code.
- **Re-verification on every fetch**: gone, canceled or unpaid positions are
  dropped, and so is an `email`-proof link whose attendee email no longer
  matches the account (the buyer reassigned it); `removedAttachments` drives
  the one-line notice. Link reads are best effort: a Supabase error falls back
  to email-matched tickets, never a failed tab.
- **Redaction**: a `qr`-proof ticket comes back with the buyer's identity
  replaced by the account (`redactBuyerIdentity`: order email, attendee and
  add-on names, order page URL), since the QR proves possession, not who paid.
  The Pretix order page URL (`Order.url`, carries the order secret) is exposed
  only when the account email is the order email.
- **Two accounts may attach the same ticket** (the door arbitrates, not us):
  such tickets carry `sharedWith` and the card and select rows say so.
- **The tab**: several email-matched tickets and none chosen shows the select
  ("Which ticket is yours?", "This one is mine") with the upload as a fallback,
  and no QR codes until chosen; offline it falls back to showing the saved
  tickets. No ticket under the email shows the upload card. Only the primary is
  shown, with its add-ons and its perk; the buyer's other tickets stay in the
  Pretix email. Footer: "Not your ticket? Attach yours" replaces an
  email-matched ticket, "Wrong ticket? Choose another" (or "Remove it from this
  account" when no select would follow) detaches an attached one. Tickets are
  numbered for people as "Order KXQFQ · Ticket #1" (`ticketOrdinals`: 1..n per
  order over the tickets the account sees, so Pretix position gaps never show),
  the same string on the card, the select rows and the buyer links.
- **Buyer nudge** (`BuyerOrdersHint`): whenever the account is the order email
  and holds more than one ticket in total, one chip per ticket links to the
  Pretix order page so holders get their own email there. The same nudge goes
  out by email before the event from the devcon package
  (`pnpm run send-attendee-email-reminder`, dry run by default).
- **Swag** shows "Collected" from a Pretix entry check-in on the add-on or
  merchandise position (`positionCollected`); no list configuration, since
  Pretix only records a scan against a list that includes that product.
- **Q&A eligibility** (`/api/meerkat`) counts attached tickets.
- **Fixture** (`TICKET_TEST_INDIA_ORDER_CODE`, dev/preview): fake tickets live
  on their own `TEST-<code>` order, are flagged `test`, carry negative
  synthetic position ids so they can be chosen (the server skips Pretix for
  those), and the first one holds the fake shirt and collected chess set.
