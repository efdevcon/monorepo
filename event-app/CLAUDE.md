# event-app

Offline-first PWA for Devcon events (Next.js App Router + Serwist service worker + Capacitor native wrappers).

## Commands

```bash
pnpm dev          # next dev --turbopack
pnpm typecheck    # tsc --noEmit, run before considering a task complete
pnpm lint
```

## Hard rules

- **Offline-first data**: all persisted state goes through the Dexie/IndexedDB-backed SWR layer, never ad-hoc fetch + useState for API data. `/api/*` stays `NetworkOnly` in the service worker; API caching is owned by the SWR/Dexie layer, not the SW.
- **Service worker**: precache stays limited to the app-shell routes. Never enable `skipWaiting`; updates are opt-in via the update toast (`ServiceWorkerUpdater.tsx`).
- **Current time**: never call `Date.now()` / `new Date()` directly in components. Use the shared `useNow`/`useNowMs` hooks (`src/hooks/useNow.ts`) so time can be mocked with `?mockNow=` / `?mockSpeed=` query params. For content dated against the real world rather than event time (announcements), use `useRealWorldNowMs` — it opts out of the per-deployment event-start auto-mock, which would otherwise let the selected dataset (e.g. devcon-7 → Nov 2024) decide whether today's announcements are visible.
- **Event timezone**: the API serves session times as plain UTC instants with no timezone; all wall-clock rendering and day grouping must go through the venue-timezone helpers in `src/data/eventTime.ts` (`eventFmt`, `eventDayKey`, …). Never format session times with a bare `Intl.DateTimeFormat` or local `Date` getters — that shifts the schedule with the viewer's system timezone. Announcements are the exception (real-world-dated, intentionally viewer-local).
- **Code style**: double quotes, semicolons (unlike the devcon package).

## Announcements & highlights

Authored in one Notion DB ("Devcon 8 App · Announcements & Highlights", Type column splits them), synced into the Supabase `devcon8_announcements` table, served by `/api/announcements` (CDN-cached, tag-purged by `/api/announcements/refresh` — editors' "Publish" link). Pipeline code: `src/app/api/announcements/service.ts`. Client: `src/data/announcements/useAnnouncements.ts` (Dexie-backed). Highlight images are mirrored into Supabase Storage because Notion attachment URLs expire (~1h). Schema changes go through migrations in `../devcon-api/src/supabase/migrations/` — see devcon-api/CLAUDE.md for how to apply them safely (never `supabase db push`).

## Web push (announcements Phase 2)

Announcements with the Notion `Push` checkbox go out as web push at their Send At time; the inbox stays the source of truth (push is best-effort). Pipeline: `src/app/api/push/service.ts` (claim/fan-out/prune design notes in its header) + routes under `src/app/api/push/`; SW handlers at the bottom of `src/sw.ts` (Declarative Web Push JSON for Safari 18.4+, classic handler elsewhere); opt-in UI on `/announcements` (`PushOptIn` + `src/data/push/usePushSubscription.ts` — never auto-prompt). The dispatcher is `netlify/functions/push-dispatch.mts` (every minute → secret-gated `/api/push/dispatch`; idempotent, crash-reclaim after 10 min). Team test-sends: `POST /api/push/test {id}` (@ethereum.org only, doesn't consume the row's status). Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (one keypair forever — rotating orphans every subscription), `PUSH_DISPATCH_SECRET`. Subscriptions live in `devcon8_push_subscriptions`. Note: the SW is disabled in dev, so subscribe/receive can only be tested on a production build or deploy.

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
