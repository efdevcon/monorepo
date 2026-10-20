# devcon-api

Express + Swagger API for Devcon data. Deployed on Render (api.devcon.org).

## Commands

```bash
pnpm dev                                   # nodemon on http://localhost:4000
pnpm exec tsc --noEmit                     # type-check before considering a task complete
NODE_ENV=test pnpm exec jest <file> --runInBand   # run tests PER FILE
```

## Hard rules

- **No database.** Data is JSON files under `data/`, loaded into an in-memory store at boot. Git is the store of record: writes (AV enrichment, sync) commit JSON back to the repo.
- **`[skip deploy]` commit tag**: data-only commits made by the API itself use this Render skip phrase so they don't trigger a redeploy. Keep it on automated data commits.
- **Never run the full jest suite in one process** - every test file loads the full data store and node runs out of memory. Run per-file with `--runInBand`.
- **Speaker emails must never leave a sync or endpoint response.**
- Schedule truth flows Pretalx -> sync -> `data/` -> memory. Day-of AV enrichment (YouTube IDs, sources) goes through `PUT /sessions/sources/:id`, not through Pretalx.
- **Community Hub sessions are not in Pretalx and have no files under `data/sessions/`.** `GET /events/:id/community-hubs/{version,bundle}` builds them from the hourly live export of the hubs' dSheets, `data/community-hubs/sheets.json`, read from GitHub (written by the `fileverse-live-export.yml` Action, whose `COMMUNITY_HUB_SHEETS` secret holds the sheet links; in-memory cache). `sheets.json` is the only file (the Action's, never hand-edit); its deployed copy is the API's warm start and GitHub-outage fallback, and the API writes nothing to the repo. Keep hub sessions out of the Pretalx bundle. Details: `../docs/community-hubs.md`.
- **AI catalogue** (`GET /events/:id/ai` index, `GET /events/:id/ai/sessions?day=…`): the programme as markdown for attendees' own assistants (ChatGPT, Claude), one line per session with its CODE first (Pretalx code, or the sheet id for a hub row), main programme plus the hubs bundle. Formatter `src/utils/ai-catalogue.ts` (tested), assembly `src/services/ai-catalogue.ts`. Assistants quote the codes back into the event app's `/my-interests?add=…` link, so keep the line format and the codes stable; `EVENT_APP_ORIGIN` sets the app origin in the index. The app mirrors these pages under its own origin (`/ai`) because Cloudflare's bot rules on api.devcon.org can refuse an assistant's fetcher; served as text/plain for the same reason.

## Supabase migrations

The "no database" rule above is about THIS API's data store. This repo also hosts the schema migrations for the shared Supabase project `mealmslwugsqqyoesrxd` (used by devcon ticketing/x402 and event-app), at `src/supabase/migrations/`.

- **Create**: add a file named `<YYYYMMDDHHMMSS>_<snake_case_name>.sql` in `src/supabase/migrations/`.
- **Apply**: `pnpm db:migrate src/supabase/migrations/<file>.sql` (wraps `scripts/db-migrate.sh`). It applies exactly that one file via the Supabase management API and records the version in the CLI migration history. Auth comes from the keychain token created by `npx supabase login` (one-time, interactive terminal only); no DB password involved.
- **NEVER run `supabase db push`**: the migration history diverged from the remote in Feb 2026 (~14 local noon-timestamped files have real-timestamped twins on the remote), so push would try to re-apply old migrations against production. Until that's repaired (verify each stale file's changes exist in the DB, then `supabase migration repair`), `db:migrate` is the only safe apply path.
- Inspect state with `npx supabase migration list --workdir src` (the `supabase` dir lives under `src/`, hence `--workdir src` on all CLI calls).
- `src/supabase/.temp/` is machine-local CLI state — ignored via `src/supabase/.gitignore`, never commit it.

## Context

- Pipeline architecture, webhook/resync behavior, AV team workflows: `../docs/av/av-stack-overview.md`
- Handover notes: `docs/notes.md`
