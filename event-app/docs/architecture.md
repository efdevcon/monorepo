# Service worker / pwa setup

The service worker is built with **`@serwist/next`** (`src/sw.ts`, compiled to `public/sw.js`).
Precaching is deliberately light — only the **app-shell routes** (`/schedule`, `/speakers`,
`/map`, `/announcements`, `/room-screens`, `/offline`) plus a few small chrome assets,
revisioned by git commit hash so a new deploy busts the shell. Keep in mind when testing the
production build locally as this will currently look like no changes happens between edits.
`/` and `/ticket` are the exceptions: they are warmed into the runtime page cache at install and
served network-first (3 s, then the cached copy), never precached, because the `<link rel="manifest">`
is personalised from the session cookie (the install sign-in bridge) and Safari reads that tag from the
HTML it was handed; a copy frozen at install time installed a signed-out app. The browser session
(auth-js, localStorage) is mirrored into that cookie by `useUser` via `POST /api/auth/session` on
sign-in and token refresh, and cleared on sign-out; an OTP sign-in in an iOS browser tab reloads the
page so a following "Add to Home Screen" gets the personalised manifest.

The precache is light on purpose because if you try to make the whole app function offline on first
install, you'd have to precache every single session and speaker, which delays the time-to-update and
time-to-install significantly (we had this problem in Devcon Bogota; precaching is SEQUENTIAL and
blocking, so ~500-1000 dynamic entries makes install slow and the worker doesn't activate until it's
done).

**Detail pages are real paths that open in place.** `/schedule/<id>` and `/speakers/<id>` are the
canonical URLs (shared links, crawlers, push notifications). The route files hold `generateMetadata`
(per-item social tags, `src/data/share-metadata.ts`, images from devcon.org's social-card generator)
and render nothing on the client; the list tab's persistent pane renders the page from the local store
(`schedule/[id]/session.tsx`, `speakers/[id]/speaker.tsx`): mobile as a full-screen layer over the list
(`DetailLayer`), desktop in place of the list (the desktop side panel is local state and never changes
the URL; its expand action and shared links use the path). In the app a detail opens with
`history.pushState` (`src/routing/detailRoute.ts`), which Next's App Router integrates with
`usePathname` without fetching an RSC payload; cards are `DetailLink` plain anchors, so cmd-click still
opens a tab and no per-card RSC prefetch fires. Offline, the service worker answers a navigation to a
detail path with the precached shell of its list tab (`src/sw.ts`; the app hydrates from `location`),
so any detail opens offline, hard reload included, and no `/schedule/[id]` page is ever precached per
id. Shell cache keys ignore the whole query string (`src/routing/viewParams.ts` is shared by app and
SW), so tracking params on shared links can't defeat the cache.

**Tab switches** do not mount pages. The five bottom-bar destinations (`/`, `/schedule`, `/speakers`,
`/map`, `/ticket`) are persistent panes rendered by the layout (`src/components/TabPanes.tsx`): the
route pages render nothing, a pane mounts lazily on its first visit (code-split, client-only) and then
stays mounted, hidden with `display: none` while another tab shows, keeping its own scroll position.
Header portals and window-scroll measurements inside pages are gated on `usePaneActive()`, and
IntersectionObserver callbacks ignore the 0×0 rects a hidden pane reports. Long lists (speaker letter
groups, schedule time groups) render progressively (`src/hooks/useProgressiveReveal.ts`): the first
render is a screenful of cards, the rest fill in one group per frame, and jumps (A–Z rail, "jump to
now") complete the list first so they land on real heights. The speakers × sessions join is memoised
per store snapshot rather than per mount. Every vertical page jump is instant, never smooth (WebKit
rasterises everything a smooth scroll passes over). Re-tapping the active tab resets its pane (scroll
to top; the schedule jumps to "now"); with a detail page open the tap navigates to the bare tab URL,
which closes it.

# data architecture

**`/api/*` is not handled by the service worker** (no rule; the browser fetches natively, which avoids
a Safari cold-started worker failing the first request after a pause), and the devcon-api origin is never cached by it
either: API caching is owned by the app, so the app shell (what keeps the app booting offline and
installing fast) and the data stay strictly separate. Mixing the two gets hard to reason about.

Catalogue data (sessions, speakers, rooms, the event record) lives in the **EventStore**
(`src/data/store/`):

- One request, `GET /events/:id/bundle`, returns everything for one event with sessions referencing
  speakers and rooms by id (no embeds). About 1 MB uncompressed for devcon-7, 0.3 MB on the wire.
- Rows are stored normalised in Dexie (`eventSessions`, `eventSpeakers`, `eventRooms`, `eventMeta`,
  keyed per event) and materialised in memory into the read model components use
  (`materialize.ts` joins speakers and rooms by id, derives day fields in the venue timezone).
- Sync is gated by `GET /events/:id/version` (60 bytes): on boot, when the tab becomes visible, when
  the network returns, and every 60 s while visible (the API's CDN TTL). Unchanged version means no
  bundle fetch and no IndexedDB write. The bundle carries its own version, so an edge node lagging
  behind the probe self-heals on the next poll. Failures back off (15/30/60 s) and never touch the
  snapshot.
- React reads through `useSyncExternalStore` via the hooks in `src/data/hooks/` (`useSessions`,
  `useSession(id)`, `useSpeakers`, `useRoom`, `useEvent`, `useSyncStatus`, …). Derived hooks filter
  the in-memory snapshot, so they never cost a request and stay offline-safe; the room-screen kiosk
  filters by room the same way.
- Boot: `DataProvider` (`src/data/cache/swr-config.tsx`) hydrates the store and the SWR cache in
  parallel and renders children when both are ready, so the first paint has data and no flash.

SWR + the Dexie `cache` table remain for the small, differently-shaped state: announcements,
tickets, and browser-local user state (interested stars, which also sync to the account when signed
in via `POST /api/interests/sync`; announcement read state). Dexie is used
because IndexedDB has far larger limits than localStorage; abstract it away behind hooks.

Ticket identity: the Supabase account (email OTP) is the identity; `/api/tickets` returns tickets
matched by email plus positions the account attached (`devcon8_ticket_links`), attached first. The
client derives one primary ticket (`src/data/tickets/primary.ts`): an attached ticket, else the sole
email match, else the tab asks (a select among the email-matched tickets, or an upload of the ticket
as a screenshot, PDF or `.pkpass`, decoded on the device). Only the primary is shown; see `CLAUDE.md`
for the rules.

Offline UX: `useOnline` (`src/hooks/useOnline.ts`) is the single connectivity source. The header
marker is an icon-only pill whose tooltip/aria-label reads "Offline, schedule from HH:MM" (last sync time), image retries hang off the same
subscription, and live-only features (Q&A, streams, chat, ticket refresh, push, sign-in) render one
quiet `NeedsConnection` line instead of spinners or errors.

# native app

The same build also ships as native iOS/Android apps via **Capacitor** (`webDir: out`), wrapping the
PWA - if you ever go this path, you have to architect it carefully / use a SPA approach because router
based navigation is janky as hell in webviews (which powers Capacitor). Proof of concept already in
the repo (`src/app/page.native-app.tsx`); detail hrefs there resolve both the in-app and the share
form.

# new versions

Updates are **opt-in, never forced** (`skipWaiting: false`, `clientsClaim: true`). When a new
worker installs while one is already controlling the page, `ServiceWorkerUpdater.tsx` shows a
persistent "Update available" toast with a Reload button; only on click does it `postMessage`
SKIP_WAITING to the waiting worker, which activates and triggers a single reload. The app also
calls `registration.update()` on `visibilitychange`, so returning to the tab proactively checks
for new versions. We don't do skipwaiting as that may lead to inconsistencies in some edge cases:
_either everything updates, or nothing does, as a heuristic._

clientsClaim: true is important to allow offline to work on the first visit

offline mode will work once the app is fully loaded and the service worker is active - so it probably
takes 5-10 seconds on most devices

# verification

- `pnpm data:test`: pure-function tests for normalise, materialise, the sync decision and the
  routing helpers.
- `node scripts/offline-sweep.mjs --port <port>` (repo root) against `pnpm preview --port <port>`:
  warms the SW and the store, goes offline, hard-loads every core route and detail deep link, checks
  the legacy redirects and a cross-section back/forward trip with no document reload, and asserts no
  offline fallback and no broken image.

# login

basic supabase auth currently, kept "skip" as core functionality since supabase is technically an
intermediatery which is not CROPSy

I think adding SIWE would be cool dogfooding but you'll still need to validate email for ticket and
meerkat integration, so there's an argument to be made that its pointless to forego email auth or
even have SIWE at all - only reason you'd want that is if you want people to personalize their
schedule, but somehow not care about the tickets/meerkat - you could loosen the meerkat integration to
just require login / not check for valid ticket if it helps

```mermaid
flowchart TD
    subgraph Data["Data layer (source of truth = EventStore rows in Dexie)"]
        UI[UI / hooks] -->|useSyncExternalStore| SNAP[In-memory snapshot]
        SNAP -->|hydrate on boot| DEXIE[(Dexie rows: sessions, speakers, rooms, meta)]
        SYNC[sync: version probe 60 B] -->|changed| BUNDLE[GET /events/:id/bundle ~1 MB]
        BUNDLE -->|normalise, one transaction| DEXIE
        BUNDLE -->|materialise| SNAP
        SYNC -.unchanged / failed.-> SNAP
    end
    subgraph SW["Service worker (Serwist)"]
        SHELL[Precache app-shell routes<br/>git-hash revisioned, view params ignored]
        RT[Runtime cache:<br/>RSC/docs NetworkFirst (params normalised)<br/>chunks SWR · images/fonts CacheFirst<br/>/api/* untouched]
        REDIR[/schedule/<id> → /schedule?session=<id>]
        UPD[New SW installs] --> TOAST[Update toast] -->|user clicks Reload| SKIP[SKIP_WAITING → activate → reload]
    end
    Data -. devcon-api never cached by the SW .- RT
```

# measured (2026-09-04, devcon-7: 650 sessions, 729 speakers, 19 rooms)

Production build (`pnpm preview`) against the production API, mobile viewport.

| Check | Result |
| --- | --- |
| Cold open | 2 requests: version probe 47 B + bundle 0.96 MB (0.30 MB compressed on the wire) |
| Reopen with an unchanged schedule | 1 request: version probe 47 B, no bundle, no IndexedDB write |
| IndexedDB rows (JSON size) | sessions 596 KB, speakers 365 KB, rooms 6 KB, meta 0.7 KB: 0.97 MB total (was ~1.8 MB of SWR blobs) |
| Hydrate on boot | 23 ms |
| Offline sweep (`scripts/offline-sweep.mjs`) | passed: 7 routes, 6 deep links, 2 legacy redirects, cross-section trip without reload |
| `pnpm data:test` | 50 checks passing |
| Tab switch, 4x CPU throttle (persistent panes + progressive lists) | Speakers 154 ms (was 809), Schedule 170 ms (was 635), Home 159 ms (was 483); first-ever Speakers visit 493 ms incl. its chunk (was 938) |
