# Devcon API

Express + Swagger API serving all Devcon data @ [api.devcon.org](https://api.devcon.org/). No database: synced data lives as JSON in [data/](./data) (git is the store) and is served from memory. Hosted on Render; Pretalx webhooks trigger resyncs.

## Getting started

```bash
pnpm install   # from the repo root
pnpm dev       # http://localhost:4000 (configurable via .env)
```

API overview: [api.devcon.org/docs](https://api.devcon.org/docs/)

## Docs

- Agent instructions: [CLAUDE.md](./CLAUDE.md)
- Handover notes: [docs/notes.md](./docs/notes.md)
- Full AV/schedule pipeline (Pretalx -> API -> apps): [../docs/av/av-stack-overview.md](../docs/av/av-stack-overview.md)
