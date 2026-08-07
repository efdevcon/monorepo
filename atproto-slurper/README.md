# atproto-slurper

Server that ingests Devconnect community events via atproto. Runs on Render; feeds only the Devconnect website and app.

Deletion candidate: if Devconnect is wound down, snapshot the current data as JSON for the website and delete this service (see [docs/notes.md](./docs/notes.md)).

```bash
pnpm install   # from the repo root
pnpm dev
```
