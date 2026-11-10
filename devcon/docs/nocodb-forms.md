# NocoDB forms on devcon.org

How the team builds forms and surveys in NocoDB and publishes them on devcon.org, with Claude doing the heavy lifting. Start at the top if you are new; the developer reference is at the end.

## The big picture

- **NocoDB** is the team's database and form builder (the site you open in the browser to see tables of applications, FAQs and so on). It is organised in **bases** (one per topic, e.g. ticket applications or event logistics), each holding **tables**. A table can have a **form view**: the list of questions, their order, wording, help text and which ones are required.
- **devcon.org renders those form views** at a devcon.org address, in the site's design, with features plain NocoDB forms lack: email verification, wallet connect, sections, branching questions, voice answers, preview links. Every submission lands as a row in the NocoDB table.
- **No code is needed for a new form.** Build the table and form view in NocoDB (or ask Claude to), publish it with one config row, and edit wording in NocoDB whenever you like; devcon.org picks up changes within a minute. Developers only touch code for new field types or behaviours.

## Working with Claude

Claude Code can read and change NocoDB directly. There are two ways to connect it; most people only need the first.

| | MCP connection | API token |
|---|---|---|
| What it is | Claude gets NocoDB "tools" for one base: records, tables, fields, views, forms | A key for NocoDB's web API, used from scripts |
| Good for | Everyday work in plain language: "create a survey table", "add a question", "export the answers" | Bulk scripts, and the few things this NocoDB licence refuses over MCP (conditional form fields, webhooks) |
| Set up | Once per base, by each person on their own computer | Once per person; the site itself also uses one |

Both inherit your own NocoDB permissions, so Claude can never do more than you could by hand.

### Connect a base through MCP

1. In NocoDB, open the base, then **Settings**, then **Model Context Protocol** (on a licensed edition: **Account Settings**, **MCP Server**, **Manual connections**).
2. Click **New MCP Endpoint**, give it a name (your name plus the base is a good one) and create it. NocoDB shows the endpoint URL and a token once; copy both.
3. In a terminal, in the monorepo folder, run (replace the two placeholders; the host is the same address you use to open NocoDB):

   ```bash
   claude mcp add NocoDB-Base-<BaseName> -- npx mcp-remote https://<NOCODB_HOST>/mcp/<ENDPOINT_ID> --header "xc-mcp-token: <TOKEN>"
   ```

4. Restart Claude Code and type `/mcp`: the server should show as connected. Then just ask, e.g. "list the tables in this base".

Notes: name servers `NocoDB-Base-<BaseName>` so everyone's setup looks the same. By default the connection only exists when Claude is started in that folder; add `--scope user` to have it everywhere. The token is a secret: never paste it in chat, in a document or in the repo (not in `.mcp.json`). To remove a connection: `claude mcp remove NocoDB-Base-<BaseName>`, and delete the endpoint in NocoDB.

### Connect through the API

1. In NocoDB, open the **user menu** (bottom left), **Account Settings**, **API Tokens**, **Create New API Token**. Copy the token; it is shown once.
2. Put it in `devcon/.env` (this file is never committed) as `NOCODB_API_TOKEN=<TOKEN>`, next to `NOCODB_BASE_URL=https://<NOCODB_HOST>`. The site uses the same two variables.
3. Ask Claude to "use the NocoDB token from devcon/.env". Requests send the header `xc-token`. Endpoints Claude uses most:
   - rows: `GET` / `POST` `/api/v2/tables/<TABLE_ID>/records`
   - form view fields: `GET /api/v1/db/meta/views/<VIEW_ID>/columns`
   - conditional fields: `POST /api/v1/db/meta/views/<VIEW_ID>/filters` with `fk_parent_column_id` (the field being shown or hidden)

Table and view IDs are in the browser address bar when you open them in NocoDB; Claude can also look them up over MCP.

### Things to ask Claude

- "Create a table 'Devcon 9 survey' with these questions and a form view" (paste the questions).
- "Show question X only when Role is Volunteer."
- "Put a section header 'About you' above the name question."
- "Publish this form on devcon.org as /form/devcon-9-survey, no email verification, closed for now, with a preview password."
- "Open the form" / "Close the form".
- "How many answers so far? Export them as CSV."

## Publishing a form on devcon.org

- **Instant address**: `/form/d/<VIEW_ID>` works for any form view, no setup.
- **Nice address** (`/form/<slug>`): add a row to the **Form config** base in NocoDB (one row per form). Columns:
  - `Form Slug`: the address part, e.g. `devcon-9-survey`.
  - `Form View ID`: the NocoDB form view.
  - `Requires OTP`: Yes means people verify their email before seeing the form.
  - `Is Form Open`: off shows a "form closed" page (on both addresses), so a form can be wired up before it goes live.
  - `Preview Password`: with a closed form, share `/form/<slug>/?preview=<password>` to let reviewers see and test it (test submissions are saved like real ones). Clear the column to revoke the link.
- Changes to that table show on devcon.org within a minute.

## Building blocks of a form

Everything below is set in the NocoDB form view, no code:

- **Questions**: one field per question. Label, help text, required and order come from the form view. Single select = dropdown, multi select = multiple choice, Rating = stars, Long text = text box, Attachment = file upload.
- **Branching**: NocoDB "show on condition" rules (e.g. show the volunteer questions only when Role = Volunteer). The NocoDB UI refuses to create them on this licence; Claude adds them through the API (see above).
- **Section headers**: start a field's help text with a markdown heading. Everything up to a `---` line is shown above the field as a header (`##` with a rule and extra space, `###` smaller); the text after `---` is the field's own help. Put the header on a field that is always visible in that section, since a hidden field hides its header too.
- **Radio buttons and checkboxes**: the form view's "show as list" toggle on a select field.
- **Numbered scales**: a Rating field whose label starts with `[scale: Low label | High label]` shows buttons 1 to max with the two labels under the ends. `[scale]` alone shows numbers only.
- **Voice answers**: a long-text field whose label starts with `[voice]` gets a "Record your answer" button (takes of up to 2 minutes, transcribed and added to the text box, editable; only the text is saved, never the audio). Limit 5000 characters instead of 1000.
- **Wallet address**: a text field whose label starts with `[wallet]` shows a Connect wallet button; the site stores only the address proven by a free signature.

Example: the Devcon 8 survey (wallet connector first, then the role question; each role, attendees included, gets its own section by condition, then closing questions for everyone).

## Developer reference

### Routes

| Route | Description |
|-------|-------------|
| `/form/{slug}` | Named form (row in the Form config table) |
| `/form/d/{viewId}` | Any NocoDB form view by id |

Both render the same `FormPage`. OTP, open/closed state and the preview password are looked up by view id, so both routes behave the same. `src/services/form-config.ts` reads the Form config table (table id in that file, 60 s cache); the preview password never reaches page props (`isPreviewAllowed`).

### How it works

1. The page fetches `/api/nocodb/{viewId}/schema/` for the form title, fields, sections, list flags and conditional rules.
2. The schema route resolves view, table and fields through NocoDB's REST meta API (`nocodb-meta.ts`): `views/:viewId/columns` for order, visibility, labels and required, `views/:viewId/filters` for conditions.
3. Submissions go to `/api/nocodb/{viewId}/submit/`, which writes the row through the NocoDB SDK. `[wallet]` fields keep only the signed address; `[voice]` audio goes to `/api/nocodb/{viewId}/transcribe/` (transcription service, per-IP throttle, open or previewed forms only).

### Key files

- `src/services/nocodb-meta.ts`: REST meta API wrapper (form view, fields, conditions)
- `src/services/nocodb.ts`: NocoDB SDK wrapper (row CRUD)
- `src/services/form-config.ts`: slug, OTP, open state and preview password from the Form config table
- `src/config/form-field-markers.ts`: the `[scale]`, `[voice]`, `[wallet]` label markers
- `src/components/domain/nocodb-form/`: `FormPage.tsx` (shared UI), `OtpGate.tsx` (email verification), `FormRenderer.tsx` (fields), `FormSubheading.tsx` (sections), `VoiceRecorder.tsx`, `WalletConnectField.tsx`
- `src/pages/api/nocodb/[viewId]/`: schema, submit, submission, preview, transcribe and upload routes

### Environment

- `NOCODB_BASE_URL`, `NOCODB_API_TOKEN`: NocoDB address and API token, used for meta reads and row writes.
- `EF_INFERENCE_AUDIO_URL`, `EF_INFERENCE_AUDIO_API_KEY`: the speech-to-text service endpoint and key for `[voice]` fields. Without them, voice fields say recording is unavailable and people type instead.
