# Feedback and crash reports

Attendees send feedback (and crash reports) from inside the app; each report becomes a row in the team's Notion database "Devcon App feedback form", with the device and app state attached automatically. Last year's Devconnect app hopped to a website form with a few URL parameters; this one stays in the app, works offline and carries much more context.

## Entry points

- Home, in "Event information" under "Need help?": "Send feedback".
- My Devcon: the "Feedback" card above the EF internal tools.
- The crash page (`app/error.tsx`): "Report this", prefilled with the error, plus "Reset the app" (clears cached files and the service worker, keeps IndexedDB and the sign-in). The root-layout crash page (`global-error.tsx`) has no providers, so it parks the error in sessionStorage and reopens Home with `?feedback=crash`.
- A floating button on every page except the room screens (`FeedbackFab`), bottom-left above the tab bar, in the old debug button's corner. On phones the schedule and the map own that corner, so it stacks one control higher there; on desktop the map docks it top-left under the 3D map's tools.

All of them call `openFeedback()` (`src/data/feedback/feedbackState.ts`); the sheet itself is mounted once in the root layout.

## What a report carries

The attendee's category (bug, idea, question), message, optional email (prefilled when signed in, editable) and up to 5 files of up to 50 MB each, any type except executables. Plus `collectDiagnostics()`: build (short commit), page, display mode, device summary and user agent, screen, language, timezone, online state and connection type, clock and mock-clock parameters, dataset, signed-in flag, interest count, catalogue sync state for both programmes, storage health, service worker state, push permission and subscription, and the last 20 console errors or warnings. Crash reports add the error message, digest and the first stack lines. No ticket secrets, tokens or interest ids.

## How it is sent

1. Each file goes straight from the browser to the private Supabase bucket `event-app-feedback`, through a signed upload URL from `POST /api/feedback/upload` (files never pass through a function body, which Netlify caps at a few MB).
2. `POST /api/feedback` validates the payload (`validate.ts`), signs one-year download links for the files and creates the Notion page: properties for triage, the message, the error, the files and the full diagnostics JSON in the body.
3. Offline, or on a network failure, the report waits in the Dexie table `feedbackOutbox` (blobs included) and `FeedbackSync` retries on launch, foreground and reconnect. A report the API refuses for good is dropped after logging.

## Notion

Columns, created by `pnpm feedback:setup`: Name, Message, Category, Status (New, Triaged, In progress, Done, Won't fix), Source (Feedback, Crash), Email, Page, Build, Device, Display mode, Online, Signed in, Push, Event, Files, Diagnostics (first 2,000 characters), Created. The page body repeats the message, then the error, the files (images inline) and the diagnostics as JSON. Triage happens on Status.

## Env

`NOTION_SECRET` (shared with announcements; the database must be shared with that integration), `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` (shared). The database id is a constant in the API service, like the announcements one: an id alone grants no access. Without the Notion secret the routes answer 503 and the sheet shows the error.

## Testing

Everything is one tap: open the sheet from Home, send with and without a file, then check the Notion row. Offline: enable the flight mode, send, go back online, watch the row appear. Crash: "Crash this page" under the EF internal tools on My Devcon (any environment, @ethereum.org accounts), or `/?previewState=crash` outside production.
