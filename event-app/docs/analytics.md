# Analytics (Matomo)

Where: `https://ethereumfoundation.matomo.cloud`, site 38 (`app.devcon.org`, shared with the old app until the domain moves). Production builds only; Netlify previews count too. Set `NEXT_PUBLIC_MATOMO_SITE_ID` to an empty string to switch a deploy context off.

Code: page views and dimensions in `src/app/matomo.tsx`, events through `trackEvent` in `src/data/analytics/track.ts`. The typed catalogue there is the only place to add a name.

## Page views

One per pathname + query change. Never the hash (the install bridge lands on `/ticket#access_token=…`). No heatmaps or session recording: the ticket page shows QR secrets.

## Visit dimensions

Set on load and whenever the value changes; a visit keeps the last value.

| Id | Name | Values |
|----|------|--------|
| 1 | Display mode | `installed`, `browser` |
| 2 | Signed in | `yes`, `no` (can read `no` until auth initialises; the next hit corrects it) |
| 3 | Stars | `0`, `1-5`, `6-20`, `21+` (local interests, so signed-out users count too) |

## Events

| Category | Action | Name / value | When |
|----------|--------|--------------|------|
| install | tap | `native`, `ios`, `manual` | Install button tapped |
| install | prompt-accepted / prompt-dismissed | | Outcome of the native install prompt |
| install | steps-shown | `ios`, `manual` | Manual install steps opened |
| install | safari-hop | | "Open in Safari" tapped from the iOS steps |
| install | installed | | Browser fired `appinstalled` |
| install | card-dismissed | | Home install card closed |
| sign-in | code-requested / code-failed | | OTP email sent, or the request failed |
| sign-in | verified | | Code accepted |
| sign-in | verify-failed | `network`, `rate-limit`, `invalid` | Code refused, by reason |
| sign-in | sign-out | | |
| push | permission-granted / -denied / -dismissed / -unanswered | | Browser permission prompt outcome (`unanswered` = 30 s timeout) |
| push | subscribed | `announcements`, `reminders`, `both` | Device subscribed, with the flags chosen |
| push | unsubscribed | | Last switch turned off |
| push | announcements-on/off, reminders-on/off | | A switch changed on an already subscribed device |
| push | sheet-shown | | Onboarding sheet opened |
| push | sheet-accepted | `all`, `reminders` | Its primary button |
| push | sheet-dismissed | | "Not now" |
| planner | open-chatgpt / open-claude / copy | | Home "Plan with your AI" card |
| planner | apply-opened | | `/my-interests` opened with a plan in the URL |
| planner | applied | value = sessions added + removed | Plan applied |
| perks | claim | partner key | Claim button tapped (`ens`, `powfaucet-sepolia`, `powfaucet-hoodi`) |
| perks | sheet-shown / open-browser / copy / share | partner key | Hand-off sheet (installed app) |
| schedule | day | day key | Day picked by the user |
| schedule | programme | `main`, `hubs` | Sessions / Community Hubs switch |
| schedule | view | `list`, `timeline` | View switch |
| schedule | interests-only | `on`, `off` | My Interests toggle |
| schedule | filter | facet | A filter value toggled (never the value) |
| schedule | search | | A search started (never the text) |
| session | qa | session id | "Ask a question" opened |
| session | calendar | session id | "Add to Calendar" |
| announcements | open | title | Announcement card with a link tapped |
| announcements | highlight | title | Highlight card tapped |
| announcements | push-open | pathname | Page opened from a push notification (worker marks the URL with `#from=push`, stripped on the page) |
| offline | used | value = page views made offline | Sent once when the connection returns |
| sw | update-shown / update-accepted | | Update toast |
| sync | bundle-failed | event id | Catalogue sync failed while online |
| error | page | pathname | Route error page rendered |

## Rules

- Never send emails, ticket secrets, order codes, bridge tokens or search text. Session and speaker ids are public slugs and fine.
- Don't duplicate as events what the database already records (stars, push subscriptions).
- New events go into the catalogue in `track.ts`; the dimensions were created on site 38 through the Reporting API, with the `MATOMO_TOKEN` of the devcon package (two visit slots and five action slots left).

## Open

- Matomo Cloud bills per hit and events count like page views. The schedule `day` and `filter` events are the noisy ones during the event; confirm the plan's quota, and whether heartbeat pings count, before Devcon week.
