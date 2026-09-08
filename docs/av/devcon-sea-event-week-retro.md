# Devcon SEA (12 to 15 Nov 2024): AV and API changes, 11 to 16 Nov

Source: `main` of efdevcon/monorepo, commits 2024-11-10 to 2024-11-17. All times Bangkok (UTC+7). Day 1 = 12 Nov. Compiled 2026-09-08 from git history only; see Method at the end.

## Volume

| Author | Commits | What |
|---|---|---|
| github-actions bot | 855 | 28 Pretalx syncs + 827 `[skip deploy] PUT /sessions/<id>` writes from the AV pipeline |
| wslyvh / Wesley | 64 | 16 API code, 21 app code (player, monitor, revalidation), 35 hand edits of `devcon-api/data`, 5 Etherna PR merges |
| Mirko Da Corte (Etherna) | 20 | Swarm hashes into session JSON, via PRs #12 to #16 |
| lassejaco | 95 | devcon-app UI (out of scope, one paragraph at the end) |
| Lukas Rosario | 1 | smart-wallet login signature verification |

## Schedule publishes

In Nov 2024 `sync-pretalx.yml` only had a monthly cron and `workflow_dispatch`. The Pretalx "schedule published" webhook hit `hooks.ts`, which applied the new/cancelled/moved talks in memory and then dispatched the workflow. So each `[action] Pretalx Sync` commit is one published schedule (a manual dispatch is indistinguishable but there is no sign of any).

| Day | Publishes | Times |
|---|---|---|
| Nov 11 | 3 | 10:58, 18:31, 18:45 |
| Nov 12 (D1) | 6 | 00:00, 13:48, 14:55, 18:04, 19:48, 22:08 |
| Nov 13 (D2) | 8 | 09:16, 10:54, 11:28, 12:02, 17:30, 18:36, 20:19, 22:38 |
| Nov 14 (D3) | 8 | 08:08, 10:28, 10:48, 11:12, 13:57, 15:26, 19:52, 20:10 |
| Nov 15 (D4) | 3 | 07:27, 13:40, 14:22 |

28 publishes in five days, roughly one every 90 minutes during opening hours on days 2 and 3.

## Code changes by theme

**1. Livestream player in devcon-app (Nov 11 to 13).** Before the event a session page had no live video at all. `9233decb3` added `youtubeStreamUrl_1..4` and `translationUrl` to the Room model, `9147f79fd` put a YouTube iframe on the session page, `b4198412d` picked the stream URL by day of month. That mapping was off by one (11 to 14 instead of 12 to 15) and fixed 45 minutes later in `40189126e`. On D2 evening `e05bf675e` added a YouTube / StreamEth / Swarm player switcher once recordings started arriving from several sources.

**2. Stream monitor page (Nov 12 to 15).** `e3ee8fc89` added an internal `/streams` page showing every room's stream and translation embed. Autoplay was added the same day (`b30bb920c`). The page was hard-wired to the day's stream field and re-pointed by hand each morning (`0a587e9d8` D2, `c7ef91d64` D3, `0df7761bb` D4), plus a click-to-reload for stuck embeds.

**3. Pretalx sync clobbering hand-entered data (Nov 11 and 14).** `sync-pretalx.ts` rewrote each room JSON wholesale, which would have destroyed the stream URLs typed in the day before; `ba5f92ed7` made it merge onto the existing file. On D3 a broken speaker record was excluded, first in the sync script (`11a1cde23`) and 14 minutes later moved into the shared Pretalx client (`d2bd2cb4d`).

**4. Session sources endpoint and the git write-back.** `PUT /sessions/sources/:id` (API-key auth) updates Postgres, bumps the event version so the app refetches, then pushes the whole session JSON through the GitHub Contents API as a commit authored by the bot with `[skip deploy]` so Render does not redeploy. That is what the 827 bot commits are: one per pipeline write. During the event the endpoint gained `transcript_vtt` / `transcript_text` (`9233decb3`, D0), the version bump (`ee9c5e12c`, D0) and `sources_streamethId` (`3309d65f7`, D3 08:34).

The handler wrote `body.field ?? ''` for every source field, so a caller that sent only its own field erased the others. This is visible in git:

| Erased by a pipeline write | Commits | When |
|---|---|---|
| `sources_youtubeId` (non-empty to empty) | 71 | mostly D4 (50), starting D3 19:52 |
| `sources_swarmHash` (Etherna hash to empty) | 43 | mostly D4 (36) |

Example `78cea5bbb` (D4 08:40): StreamEth pushed `sources_streamethId` alone and the same commit blanked the YouTube id and Swarm hash. Etherna had committed 219 hashes by D4 evening; 179 survived on Nov 17, and Etherna re-added the rest on Nov 28 to 29. None of the erased values were restored inside the window. The `?? data.field ?? ''` fix landed only on 2026-08-04 (`45a515fe3`).

**5. Video stats script (Nov 12 and 15).** `52e3269d0` added `stats-video.ts` to report the share of sessions with a YouTube id per day. Same-day fix `3b3d22563` stopped counting rooms without a stream URL as missing. `b0714ba44` on D4 rewrote it to cover all four days, skip `doNotRecord` sessions, break down by room and tally YouTube vs StreamEth separately.

**6. Stale session pages, four attempts in three days.** `schedule/[id].tsx` went `revalidate: 60` to `revalidate: true` (`9fb886343`, D1), to `getServerSideProps` (`e78b8a4ff`, D4 13:10), back to static with `revalidate: 0` (`62412692b`, 36 minutes later), then `revalidate: 1` (`76ec58cb7`, 37 minutes after that). The problem being chased was recordings and stream data not showing up on session pages quickly enough.

**7. Smaller fixes.** CORS allow-list gained `connections.cursive.team` (`af8409ef6`, D0 23:21) and was cleaned up after the event (`c8bb2b25b`). The speaker-deck nudge email was limited to Google Slides decks the speaker had never opened, detected by the last editor still being the EF service account (`553ca239a`; the slides pipeline is documented in `av-stack-overview.md` §2d). Smart-contract wallets could not log in until `5125b69cc` switched signature verification to viem (EIP-1271). Matomo was not initialised at all until D3 08:36 and had the wrong site id for 20 more minutes. Swag-card QR codes encoded an empty string until `4a278824f` (D1 22:17). A stray session id was redirected to `/schedule` (`51903bd27`).

## Hand edits to `devcon-api/data`

Wesley made 35 data commits. Nov 11: stream URLs for all 16 rooms, edited about six times per room while formats and ids were settled, plus one new room. Nov 12: opening sessions given YouTube ids, a duplicate speaker removed, and two very large commits (`e3ee8fc89`, `b30bb920c`) that regenerated embedding vectors alongside the code change. Nov 13 to 15: eight speaker avatar fixes, two speaker metadata syncs, Deva Awards and SEA overview sessions, and at D4 14:37 transcript text removed from about 130 sessions (`f5c6ffdea`, reason not recorded).

## AV pipeline throughput (bot commits)

| Metric | Value |
|---|---|
| Pipeline writes | 827 over 460 distinct sessions (229 written once, 191 two or three times, 40 four or more) |
| Writes per day | D1 88, D2 85, D3 133, D4 306, Nov 16 201 |
| Bursts over 50 per hour | D4 08:00, D4 19:00, Nov 16 13:00 (batch re-runs) |
| Median lag slot end to first YouTube id | 16.6 h (p25 1.8 h, p75 43 h) |
| Median lag slot end to transcript | 16.5 h |
| Median lag slot end to StreamEth id | 26.5 h |
| YouTube id replaced by a different id | 54 writes, 87 of 339 sessions saw more than one id |
| Coverage on Nov 17 (656 sessions) | YouTube 335, StreamEth 359, transcript 250, Swarm 179 |
| Coverage today (650 sessions) | YouTube 580, StreamEth 388, transcript 367, Swarm 555 |

## Etherna / Swarm

20 commits by Mirko in five PRs merged by Wesley between D1 18:45 and D4 20:18, 219 sessions with a `sources_swarmHash` by the end of D4. Because they edited JSON in git directly while the API served from Postgres, any pipeline write to the same session blanked the hash (see theme 4).

## Takeaways for Devcon 8

- Partial writes to the sources endpoint destroyed data for two days. The merge fix is now in place, but git and Postgres still diverge whenever anyone edits session JSON directly. Either load such edits into the DB or stop editing JSON by hand.
- Per-day stream selection was hard-coded twice (app and monitor page) and needed manual edits every morning. event-app derives the day from the event start date now.
- Recordings lagged the talk by a median of 16 hours, and about a quarter of sessions had their YouTube id swapped later, so anything that caches a session page needs a cheap invalidation path. The revalidation churn on D4 was the symptom.
- Analytics, QR codes and smart-wallet login were only discovered broken during the event; all three are cheap to check on a pre-event smoke list.

## devcon-app (lassejaco, out of scope)

95 UI commits: schedule rendering (overlapping slots, "now" marker), room screens, venue map floors, highlight cards, lantern and Deva Awards UI. No reverts and no player changes; the only API touches were push-notification tuning and OpenAI-generated room descriptions for the room screens. Four quick fixes (a build fix on Nov 11, a mocked-clock removal, a DevAI reference spam fix, one vague "fix").

## Method

Commits on `main` between 2024-11-10 and 2024-11-17 were grouped by author and code diffs were read commit by commit. The 827 bot writes were analysed by parsing each session JSON before and after the commit and comparing field values, which separates real changes from re-serialisation noise. Lags use the session `slot_end` against the commit time. Related docs: `av-stack-overview.md` (current pipeline map) and `pretalx-pipeline.md` (schedule webhook flow).
