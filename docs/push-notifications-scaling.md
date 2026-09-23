# Web push at scale (event-app)

Status 2026-09-23: PR #135 (session reminders) under test. This note records what limits the current setup, what to watch during the test, and the ranked plan to raise the ceiling. Decide after the test. Items 1, 2, the timeout of 3 and the TTL of 4 are in the branch (uncommitted at time of writing).

## Current setup

Netlify scheduled function (every minute) → `POST /api/push/dispatch` (synchronous Next route, secret-gated) → claims due announcements and session reminders in Supabase → web-push fan-out in parallel chunks of 50, two fixed retries (300 ms, 1.2 s), TTL 1 h, urgency high → bookkeeping (prune 404/410, failure counters). State: `devcon8_announcements` (status column is the claim), `devcon8_session_reminders` (the row is the claim), `devcon8_push_subscriptions`, `devcon8_interests`.

## Limits found

| Limit | Where | Effect |
|---|---|---|
| Sync function budget, 10 s default (26 s on request) | Netlify | Every fan-out must finish inside one call, announcements and reminders together |
| 150 fresh reminder pairs per run per event | `reminders.ts` `MAX_REMINDERS_PER_RUN` | 2,250 (user, session) pairs per 15-minute window, shared by all sessions starting in it; the rest get no push, silently |
| No `order by` in the claim | migration RPC | Which pairs win under the cap is arbitrary |
| Unbounded subscriber select | `service.ts` `getSubscriptions` | Supabase returns at most 1,000 rows (project Max Rows), so an announcement reaches the first 1,000 subscriptions only |
| Fixed retry delays, no request timeout | `service.ts` `sendWithRetry` | 429 is not paced by `Retry-After`; a hung socket eats the run budget |
| One TTL for everything | `service.ts` | A late device can receive "starts in 15 minutes" after the session started |
| Bookkeeping once per batch | `reminders.ts`, `service.ts` | A crash mid fan-out re-sends the whole batch on reclaim |

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

## Research notes

- Netlify: sync functions 10 s default, 26 s on request; scheduled functions carry no payload and run on the published deploy only; background functions 15 min, 202 immediately, retried after 1 and 2 min; Async Workloads: durable steps, 4 retries by default, backoff and jitter, event fan-out. [Background Functions](https://docs.netlify.com/build/functions/background-functions/), [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/), [Async Workloads](https://docs.netlify.com/build/async-workloads/overview/).
- Supabase: unbounded selects are capped at Max Rows (1,000 default), silently. [limit()](https://supabase.com/docs/reference/javascript/limit), [discussion](https://github.com/orgs/supabase/discussions/1742).
- Web Push protocol: TTL required, Urgency and Topic optional, 4 KB payload; 404/410 delete the subscription; 429 read `Retry-After`. [web.dev](https://web.dev/articles/push-notifications-web-push-protocol).
- FCM at scale: wait `Retry-After` on 429 (60 s default), exponential backoff with jitter on 5xx, 10 s request timeout, reuse connections, 10k+ recipients belong in a background worker. [Firebase](https://firebase.google.com/docs/cloud-messaging/scale-fcm).
- Chrome throttles sites flagged as low-engagement senders to about 1,000 messages a minute (429), penalties escalate 1 to 14 days. Opted-in, relevant messages avoid the flag. [Chrome blog](https://developer.chrome.com/blog/web-push-rate-limits).
- Safari: the service worker must show the notification immediately or permission is revoked; Topic shows only the latest per topic. [WWDC22](https://developer.apple.com/videos/play/wwdc2022/10098/).
- `web-push` library: `TTL`, `urgency`, `topic`, `timeout`, `agent`, `headers` options; errors carry `statusCode`, `headers`, `body`. [README](https://github.com/web-push-libs/web-push).
