# Devcon website

Main Devcon site @ [devcon.org](https://devcon.org/). Next.js (Pages Router) + TinaCMS, deployed on Netlify. Also hosts ticketing (Pretix + crypto payments via x402) and the social share image endpoints (`/api/social/*`).

## Getting started

```bash
pnpm install   # from the repo root
pnpm dev       # TinaCMS + Next.js on http://localhost:3000
```

## Docs

- Agent instructions and conventions: [CLAUDE.md](./CLAUDE.md)
- Handover notes (layout system, translations, blog/FAQ ingestion): [docs/notes.md](./docs/notes.md)
- x402 payment API: [src/pages/api/x402/README.md](./src/pages/api/x402/README.md)
