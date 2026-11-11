# NocoDB forms on devcon.org

How the team builds forms and surveys in NocoDB and publishes them on devcon.org, with Claude doing the heavy lifting. Start at the top if you are new; the developer reference is at the end.

## The big picture

- **NocoDB** is the team's database and form builder (the site you open in the browser to see tables of applications, FAQs and so on). It is organised in **projects** (one per topic, e.g. ticket applications or event logistics), each holding **tables**. Projects were previously called **bases**, a name you will still see in older notes, API paths and the `NocoDB-Base-…` connection names below. A table can have a **form view**: the list of questions, their order, wording, help text and which ones are required.
- **devcon.org renders those form views** at a devcon.org address, in the site's design, with features plain NocoDB forms lack: email verification, wallet connect, sections, branching questions, voice answers, preview links. Every submission lands as a row in the NocoDB table.
- **No code is needed for a new form.** Build the table and form view in NocoDB (or ask Claude to), publish it with one config row, and edit wording in NocoDB whenever you like; devcon.org picks up changes within a minute. Developers only touch code for new field types or behaviours.

## Working with Claude

Claude Code can read and change NocoDB directly. There are two ways to connect it; most people only need the first.

| | MCP connection | API token |
|---|---|---|
| What it is | Claude gets NocoDB "tools" for one project: records, tables, fields, views, forms | A key for NocoDB's web API, used from scripts |
| Good for | Everyday work in plain language: "create a survey table", "add a question", "export the answers" | Bulk scripts, and the few things this NocoDB licence refuses over MCP (conditional form fields, webhooks) |
| Set up | Once per project, by each person on their own computer | Once per person; the site itself also uses one |

Both inherit your own NocoDB permissions, so Claude can never do more than you could by hand.

### Connect a project through MCP

1. In NocoDB, open the project, then **Settings**, then **Model Context Protocol** (on a licensed edition: **Account Settings**, **MCP Server**, **Manual connections**).
2. Click **New MCP Endpoint**, give it a name (your name plus the project is a good one) and create it. NocoDB shows the endpoint URL and a token once; copy both.
3. In a terminal, in the monorepo folder, run (replace the two placeholders; the host is the same address you use to open NocoDB):

   ```bash
   claude mcp add NocoDB-Base-<ProjectName> -- npx mcp-remote https://<NOCODB_HOST>/mcp/<ENDPOINT_ID> --header "xc-mcp-token: <TOKEN>"
   ```

4. Restart Claude Code and type `/mcp`: the server should show as connected. Then just ask, e.g. "list the tables in this project".

Notes: name servers `NocoDB-Base-<ProjectName>` so everyone's setup looks the same (the prefix predates NocoDB's rename of bases to projects; existing connections keep it). By default the connection only exists when Claude is started in that folder; add `--scope user` to have it everywhere. The token is a secret: never paste it in chat, in a document or in the repo (not in `.mcp.json`). To remove a connection: `claude mcp remove NocoDB-Base-<ProjectName>`, and delete the endpoint in NocoDB.

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
- **Nice address** (`/form/<slug>`): add a row to the **Form config** table in NocoDB (one row per form). Columns:
  - `Form Slug`: the address part, e.g. `devcon-9-survey`.
  - `Form View ID`: the NocoDB form view.
  - `Requires OTP`: Yes means people verify their email before seeing the form. Their email is saved in the table's `Email` column, and coming back later loads their earlier answers: saving again updates the same row instead of adding one.
  - `Is Form Open`: off shows a "This form is now closed" page (on both addresses), so a form can be wired up before it goes live.
  - `Preview Password`: with a closed form, share `/form/<slug>/?preview=<password>` to let reviewers see and test it (test submissions are saved like real ones). Clear the column to revoke the link. The preview link always loads the latest version from NocoDB, so edits show on reload; everyone else sees them within 5 minutes.
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
- **Devcon 8 Memory**: a field whose label starts with `[memory]` shows the memory card under the form's `[wallet]` field. A checked-in attendee opens the link from their email (the code is in the link; there is no field to type it), connects and signs with their wallet, and mints the free NFT to it, one per ticket, no gas required. The card and the form's `[wallet]` field render only when the link carries a code the server knows (only checked-in tickets get one); everyone else never sees them. Codes are emailed with `pnpm send-memory-codes` (see below). The field stores "Memory #<token>" once minted.
- **GitHub account**: a field whose label starts with `[github]` shows a Connect GitHub button (GitHub sign-in). With a `[wallet]` field on the same form, both sit together under "Connections".
- **Country picker**: a field whose label starts with `Country:` shows a searchable list of countries.
- **Signature**: a file field (Attachment) whose name contains "signature" gets a draw-to-sign pad next to the file picker.
- **Encrypted file upload**: a file field whose label starts with `[encrypted]` is encrypted in the browser before upload, so NocoDB only ever stores the encrypted file; only the team's private keys open it (the public keys are in `src/config/encrypted-forms.ts`; ask a developer).
- **Help text formatting**: links (`[text](https://...)`), `**bold**` and `_italic_` work in help text.

Example: the Devcon 8 survey (wallet connector first, then the role question; each role, attendees included, gets its own section by condition, then closing questions for everyone, two of them with voice answers).

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

### Per-form behaviour

A few forms have code of their own, keyed on their `Form Slug` (constants in `FormPage.tsx` and `submit.ts`). Renaming one of these slugs turns the behaviour off.

- `student-application`: the verified email is classified (`/api/nocodb/classify-email/`, `check-eligibility`); a non-institutional address must upload proof of enrolment (`upload-proof`); eligible applicants are validated automatically.
- `visa-collection-attendees`: the verified email must hold a paid ticket or belong to an approved speaker; the order codes are written to the row.
- `builder-application`: GitHub and wallet are verified server-side, contributed repositories are scored, and a referral code from the link (`?mtm_campaign=`, or `ref`) is saved.
- `youth-ticket`: links the full parental consent form next to its consent checkboxes.
- `rtd-event-form`: editing an event that was already approved flags it as `Updated post-approval`.

### Key files

- `src/services/nocodb-meta.ts`: REST meta API wrapper (form view, fields, conditions)
- `src/services/nocodb.ts`: NocoDB SDK wrapper (row CRUD)
- `src/services/form-config.ts`: slug, OTP, open state and preview password from the Form config table
- `src/config/form-field-markers.ts`: the `[scale]`, `[voice]`, `[wallet]` and `[github]` label markers (`Country:` and signature fields are detected in `FormRenderer.tsx`)
- `src/config/encrypted-forms.ts`: the `[encrypted]` marker and the public keys uploads are encrypted to
- `src/components/domain/nocodb-form/`: `FormPage.tsx` (shared UI), `OtpGate.tsx` (email verification), `FormRenderer.tsx` (fields), `FormSubheading.tsx` (sections), `inline-markdown.tsx` (help text), `VoiceRecorder.tsx`, `WalletConnectField.tsx`, `GithubConnectField.tsx`, `SignaturePad.tsx`
- `src/pages/api/nocodb/[viewId]/`: schema, submit, submission (loads an email-verified person's earlier answers), preview, transcribe, upload-attachment, upload-proof and check-eligibility routes
- `src/services/memory/`, `src/pages/api/memory/index.ts`, `MemoryClaimField.tsx`: the Devcon 8 Memory. The route checks the emailed code (table `devcon8_memory_codes` keeps only one-way hashes of the code and the ticket, no names or emails) and the wallet's signed proof, queues the mint in `devcon8_memory_mints` and sends it at the next 12 s slot, through Alchemy's sponsored sender or, with `MEMORY_SENDER = 'direct'`, as a plain transaction from the minter key (which then pays the gas); the chain, contract and edition are constants in `services/memory/memory.ts` (`MEMORY_CHAIN`, `MEMORY_EDITION`). The Devcon 8 Memory is edition 1 of the Devcon Memories collection (one contract, an edition per occasion); same ticket key as the event app's perk, so a ticket gets one memory either way.
- `src/scripts/send-memory-codes.ts`: emails each checked-in attendee their code (dry run by default; `--test-to`, then `--send`; re-runs skip whoever was emailed). `src/scripts/test-memory.ts`: codes, queue and states (`pnpm test-memory`).
- `src/pages/api/nocodb/file.ts`: serves uploaded files through the site (NocoDB's signed links only; anything that could run in the browser is forced to download)

### Environment

- `NOCODB_BASE_URL`, `NOCODB_API_TOKEN`: NocoDB address and API token, used for meta reads and row writes.
- `ALCHEMY_API_KEY`, `ALCHEMY_GAS_POLICY_ID`, `MINTER_PRIVATE_KEY`: the Devcon 8 Memory's Alchemy app, gas sponsorship policy and minter key. Without them the memory card says memories aren't open yet. `MEMORY_CODE_SECRET`: what the email script derives codes from (local only; the site never needs it).
- `EF_INFERENCE_AUDIO_URL`, `EF_INFERENCE_AUDIO_API_KEY`: the speech-to-text service endpoint and key for `[voice]` fields. Without them, voice fields say recording is unavailable and people type instead.
