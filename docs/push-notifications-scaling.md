# Web push at scale (event-app)

Status 2026-09-23: PR #135 (session reminders) under test. This note records what limits the current setup, what to watch during the test, and the ranked plan to raise the ceiling. Decide after the test. Items 1, 2, the timeout of 3 and the TTL of 4 are in the branch (uncommitted at time of writing).

## Current setup

Netlify scheduled function (every minute) → `POST /api/push/dispatch` (synchronous Next route, secret-gated) → claims due announcements and session reminders in Supabase → web-push fan-out in parallel chunks of 50, two fixed retries (300 ms, 1.2 s), TTL 1 h, urgency high → bookkeeping (prune 404/410, failure counters). State: `devcon8_announcements` (status column is the claim), `devcon8_session_reminders` (the row is the claim), `devcon8_push_subscriptions`, `devcon8_interests`.

## Limits found

| Limit | Where | Effect |
|---|---|---|
| Sync function budget, 10 s default (26 s on request) | Netlify | Every fan-out must finish inside one call, announcements and reminders together |
| 150 fresh reminder pairs per run per event | `reminders.ts` `MAX_REMINDERS_PER_RUN` | 1,500 (user, session) pairs per 10-minute window, shared by all sessions starting in it; the rest get no push, silently |
| No `order by` in the claim | migration RPC | Which pairs win under the cap is arbitrary |
| Unbounded subscriber select | `service.ts` `getSubscriptions` | Supabase returns at most 1,000 rows (project Max Rows), so an announcement reaches the first 1,000 subscriptions only |
| Fixed retry delays, no request timeout | `service.ts` `sendWithRetry` | 429 is not paced by `Retry-After`; a hung socket eats the run budget |
| One TTL for everything | `service.ts` | A late device can receive "starts in 10 minutes" after the session started |
| Bookkeeping once per batch | `reminders.ts`, `service.ts` | A crash mid fan-out re-sends the whole batch on reclaim |

Stall windows: a row left in `sending` by a crashed run is reclaimed after `STALL_MS` (10 min) for announcements, but after `REMINDER_STALL_MS` (2 min, `service.ts`) for reminders. A reminder is claimed at start minus 10, so a 10-minute window would first reclaim at the session start, exactly when the claim RPC retires the row as `skipped`. A sync function cannot outlive 26 s, so 2 minutes safely means the run is dead; keep it well under the lead.

## Notification preferences (per device)

Each `devcon8_push_subscriptions` row carries two flags (migration `20260923120000_devcon8_push_subscription_prefs.sql`): `announcements` (default on) and `reminders` (default off, opt-in). A row exists only while at least one is on; turning the last one off unsubscribes the browser and deletes the row. The client (`usePushSubscription`: `prefs`, `setPref`) writes them through `POST /api/push/subscriptions` (optional `prefs`, sets only the fields given, so re-subscribing never resets a flag), `PATCH` (rejects both off) and reads them back through `POST /api/push/subscriptions/prefs`; rotation carries both flags to the new endpoint.

Where the filters live:

- Announcements: `getSubscriptions({ announcements: true })` in `dispatchDueAnnouncements`. The team test-send (`/api/push/test`) ignores the flags and goes to every `is_team` device.
- Reminders: inside `devcon8_session_reminders_claim` (the subscription `exists` check requires `p.reminders`, backed by a partial index), so the 150-per-run cap is spent only on accounts with an opted-in device and no empty `sent` rows are written; `getSubscriptionsForUsers` then returns only the opted-in devices. The rehearsal route applies the same filter and says so when every device of the caller has reminders off.

## What to watch during the test

Per dispatch run (log lines from `/api/push/dispatch`): duration, `due`, `claimed`, `sent`, `ok`, `fail`, failure codes, `skipped`. Specifically: runs near the function timeout, any 429, reminders arriving late in the window, duplicates after a redeploy or crash, and whether `claimed` ever equals the cap.

## Plan, ranked by impact per line of code

1. Paginate `getSubscriptions` with `range()` in pages of 1,000. Required before the audience passes 1,000 subscriptions.
2. `order by d.send_at, i.user_id` in the claim RPC's insert-select, so earlier sessions are served first under any cap.
3. Pass `timeout` (about 10 s) to `sendNotification`; on 429 honour `Retry-After` (60 s when absent) and stop the batch, claims persist to the next run; exponential backoff with jitter on 5xx.
4. Reminder TTL = seconds until the session starts; `topic` per session so queued reminders coalesce on a device that was offline.
5. Keep-alive `https.Agent` (`maxSockets` about 50) through the `agent` option; the library is HTTP/1.1.
6. Move delivery out of the synchronous route: Netlify Async Workloads (durable steps, platform retries with backoff and jitter; a completed step is not repeated) or a background function (15 min, auto-retried after 1 and 2 min, so bookkeeping per chunk is needed). The schedule then only emits the event. Raise the per-run cap to a per-workload budget. This is what lifts 10k to a one to two minute job.
7. Per-run metrics and an alert on fail rate or 429 count; a post-event wipe of `devcon8_session_reminders`.

## Real rehearsal, closer to the event

Everything as in November, only the sessions are moved; no code involved.

1. In the Pretalx test event (`test-devcon-8`), schedule two or three sessions 30 to 40 minutes ahead, two in the same minute, and publish. Allow about ten minutes for the webhook sync and the API redeploy.
2. On the production Netlify site set `PUSH_REMINDER_EVENTS=devcon8,test-devcon-8` (Functions scope) and redeploy.
3. Team: open the production app with `?dataset=test-devcon-8`, sign in, turn session reminders on in the Notifications modal (they are opt-in per device), star the sessions.
4. At start minus 10 the scheduled function claims and sends. Check the phones, the rows in `devcon8_session_reminders`, and the dispatch log line (duration, due, claimed, ok, fail).
5. To repeat, delete that dataset's rows first (the row is the idempotency lock) and reschedule.

Until then: `POST /api/push/test/reminders` (or the team-only "Rehearse reminders" control in the Notifications modal) shows what one account receives at a chosen clock, without the claim, the trigger or the function budget.

## Research notes

- Netlify: sync functions 10 s default, 26 s on request; scheduled functions carry no payload and run on the published deploy only; background functions 15 min, 202 immediately, retried after 1 and 2 min; Async Workloads: durable steps, 4 retries by default, backoff and jitter, event fan-out. [Background Functions](https://docs.netlify.com/build/functions/background-functions/), [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/), [Async Workloads](https://docs.netlify.com/build/async-workloads/overview/).
- Supabase: unbounded selects are capped at Max Rows (1,000 default), silently. [limit()](https://supabase.com/docs/reference/javascript/limit), [discussion](https://github.com/orgs/supabase/discussions/1742).
- Web Push protocol: TTL required, Urgency and Topic optional, 4 KB payload; 404/410 delete the subscription; 429 read `Retry-After`. [web.dev](https://web.dev/articles/push-notifications-web-push-protocol).
- FCM at scale: wait `Retry-After` on 429 (60 s default), exponential backoff with jitter on 5xx, 10 s request timeout, reuse connections, 10k+ recipients belong in a background worker. [Firebase](https://firebase.google.com/docs/cloud-messaging/scale-fcm).
- Chrome throttles sites flagged as low-engagement senders to about 1,000 messages a minute (429), penalties escalate 1 to 14 days. Opted-in, relevant messages avoid the flag. [Chrome blog](https://developer.chrome.com/blog/web-push-rate-limits).
- Safari: the service worker must show the notification immediately or permission is revoked; Topic shows only the latest per topic. [WWDC22](https://developer.apple.com/videos/play/wwdc2022/10098/).
- `web-push` library: `TTL`, `urgency`, `topic`, `timeout`, `agent`, `headers` options; errors carry `statusCode`, `headers`, `body`. [README](https://github.com/web-push-libs/web-push).
