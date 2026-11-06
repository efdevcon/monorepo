# NocoDB Dynamic Forms

## Routes

| Route | Description |
|-------|-------------|
| `/form/{slug}` | Named form (requires entry in config) |
| `/form/d/{viewId}` | Any NocoDB form view by ID |

Both routes render the same `FormPage` component. OTP is enforced if the viewId has `requireOtp: true` in config — checked by both routes.

## Config

Slugs live in the NocoDB "Form config" table (read by `src/services/form-config.ts`, table id in that file): one row per form with `Form Slug`, `Form View ID`, `Requires OTP` (Yes/No) and `Is Form Open`. A closed row renders the "form closed" page, so a new form can be wired up before it goes live.

**Previewing a closed form**: put a password in the row's `Preview Password` column and share `/form/{slug}/?preview=<password>` (also works on `/form/d/{viewId}`). The page checks it with `POST /api/nocodb/{viewId}/preview/` and shows the form under a "Preview" banner; the submit route accepts the same password, so preview submissions are saved like real ones. Clear the column to revoke the link. The password never reaches the page props (`isPreviewAllowed` in `form-config.ts`).

## How it works

1. Page fetches `/api/nocodb/{viewId}/schema/` to get form title + fields
2. Schema API calls NocoDB's REST meta endpoints (`nocodb-meta.ts`) to resolve viewId → base/table/fields
3. Form fields (order, visibility, labels, required) come from `GET /api/v1/db/meta/views/:viewId/columns`
4. Submissions go to `/api/nocodb/{viewId}/submit/` which uses the NocoDB SDK for row CRUD

## Key files

- `src/services/nocodb-meta.ts` — REST meta API wrapper (form view + fields resolution)
- `src/services/nocodb.ts` — NocoDB SDK wrapper (CRUD operations)
- `src/config/nocodb-forms.ts` — slug → viewId mapping + flags
- `src/components/domain/nocodb-form/FormPage.tsx` — shared form UI
- `src/components/domain/nocodb-form/OtpGate.tsx` — email verification gate
- `src/components/domain/nocodb-form/FormRenderer.tsx` — field rendering
- `src/pages/api/nocodb/[viewId]/` — schema, submit, submission APIs

## Adding a new form

**With a slug:** add a row to the "Form config" table (see Config).

**Without a slug:** just use `/form/d/{viewId}` directly, no config needed.

## Survey-style forms

Conventions read from the NocoDB form view, so a form with sections, branching and scales needs no code:

- **Conditional fields**: NocoDB's "show on conditions" rules (view filters with a parent column) are read by `getConditionalRules()` and evaluated live in the renderer. The NocoDB UI may refuse to create them on this license; `POST /api/v1/db/meta/views/{viewId}/filters` with `fk_parent_column_id` still works.
- **Section headers**: start a field's help text with a markdown heading. The block up to a `---` line is rendered above the field as a section header (`##` = section with a rule and extra space, `###` = sub-section); the text after `---` is the field's own help. A hidden first field hides its header too, so put the header on a field that carries the section's condition.
- **Radio / checkbox lists**: the form view's "show as list" toggle on a single or multi select (`meta.is_list`) renders radio buttons or checkboxes instead of a dropdown.
- **Numbered scales**: a Rating field whose label starts with `[scale: Low label | High label]` renders as buttons 1..max with the two labels under the ends (the value is still the rating number). `[scale]` alone renders the numbers only.
- **Voice answers**: a long-text field whose label starts with `[voice]` gets a "Record your answer" button under the text box (`VoiceRecorder.tsx`). Each take (up to 2 minutes) is converted to 16 kHz WAV in the browser, transcribed by `/api/nocodb/{viewId}/transcribe/` through the EF inference server, and appended to the text box, where it stays editable. Only the text is saved, never the audio. The route only serves forms that have a voice field and are open (or opened with their preview link), with a per-IP throttle. The field's limit is 5000 characters instead of 1000.
- **Wallet connector**: a text field whose label starts with `[wallet]` renders a Connect wallet button (AppKit + a free SIWE signature) instead of an input. The submit route stores only the address proven by that signature and drops anything else posted for the field.

Example: the Devcon 8 survey (wallet connector first, then the role question; each role, attendees included, gets its own section by condition, then closing questions for everyone).

## Environment

- `NOCODB_BASE_URL` — NocoDB API base URL (used for both meta and row CRUD)
- `NOCODB_API_TOKEN` — NocoDB API token
- `EF_INFERENCE_AUDIO_URL` and `EF_INFERENCE_AUDIO_API_KEY`: the EF inference server's transcription endpoint (full URL) and its key (`sk-…`), for `[voice]` fields' speech-to-text. Without them, voice fields answer that recording is unavailable and people type instead. Without it, voice fields answer that recording is unavailable and people type instead.
