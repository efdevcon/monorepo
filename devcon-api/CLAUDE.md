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

## Context

- Pipeline architecture, webhook/resync behavior, AV team workflows: `../docs/av/av-stack-overview.md`
- Handover notes: `docs/notes.md`
