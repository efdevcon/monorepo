# Push notifications, the simple version

A push is the notification that pops up on the phone or computer of
everyone who turned notifications on in the Devcon app. Every push starts
as a row in the Notion board "Devcon 8 App · Announcements & Highlights".

## Sending a push

1. Write the announcement in Notion, with Type set to **Announcement**.
2. Set **Send At**. This is both the moment it appears in the app's inbox
   and the moment the push goes out.
3. Tick **Visible** and **Push**.
4. Click **Publish changes** at the top of the board. Without the click,
   the app still picks up the change by itself within about an hour.
5. At Send At the push goes out within a minute. If Send At is already in
   the past, it goes out within a minute of publishing.

## Good to know

- **A push goes to everyone** who turned notifications on. There is no way
  to pick a smaller audience from Notion.
- **Each row sends once.** Once sent, ticking Push again does nothing. To
  send the same text again, duplicate the row. The hidden row "Scheduled
  push test" has already been sent and cannot be reused.
- **To cancel** a push that has not gone out yet, untick Push and click
  Publish changes before Send At.
- Highlights never push, whatever their checkboxes say.
- Send At works to the minute, not the second.

## Testing before everyone gets it

Two checkboxes send a row to a small audience only, with "Test:" in front
of the title so nobody mistakes it for the real thing:

- **Test push (team)**: every phone or computer where someone signed in to
  the app with an ethereum.org address and turned notifications on.
- **Test push (product team)**: only the product team's own devices.

Tick one, click **Publish changes**, and the test arrives within a minute.
A test ignores Send At and Visible, so a hidden draft dated for next week
can be tested today, and it does not count as the row's one real send: the
same row can still go out to everyone later with Push.

To run a test again: untick the box, publish, tick it, publish. Unticking
before the minute is up cancels a test that has not left yet.

## Did it go out?

- If your own device is subscribed, you receive it like everyone else.
- A developer can see, for each row and each test, how many devices
  received it and how many failed, and can check that the sender runs
  every minute.

## For developers

Server design and crash recovery: header of `src/app/api/push/service.ts`.
Routes under `src/app/api/push/`, the minute tick in
`netlify/functions/push-dispatch.mts`, the Notion sync in
`src/app/api/announcements/service.ts`. Test sends:
`src/app/api/announcements/testPush.ts` (checkbox names, status rules; the
product-team addresses are the `PUSH_PRODUCT_TEAM_EMAILS` env var), state in `devcon8_announcement_tests`, sent by
`dispatchDueTestPushes` in the push service; the product audience comes
from the RPC `devcon8_push_subscriptions_for_emails`. The older
`POST /api/push/test {"id": ...}` route (signed-in ethereum.org session,
team devices) still works. Tables: `devcon8_announcements` (row state and
delivery counts) and `devcon8_push_subscriptions` (devices, `is_team`).
Env on the production site: VAPID keypair (never rotate, it drops every
subscriber), `PUSH_DISPATCH_SECRET`, `NOTION_SECRET`, Supabase keys. Scaling
notes: `../../docs/push-notifications-scaling.md`.
