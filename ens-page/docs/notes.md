# ens-page notes

Linktree replacement for devcon.eth.limo. Static Vite SPA on IPFS; identity +
socials read live from ENS records in the browser; campaign links come from
Notion via https://devcon.org/api/links/ (cached ~1h at the Netlify CDN, add
?refresh=1 to see edits instantly).

Spec: ../../docs/superpowers/specs/2026-08-10-ens-page-design.md

## Data flow

- ENS records (avatar, header, description, url, com.twitter, com.instagram,
  com.github, com.youtube, org.telegram, xyz.farcaster, email, name): edit at
  app.ens.domains with the name owner's wallet. Live on the site immediately,
  no redeploy. Unset records simply don't render. Full http(s) URLs in a
  record pass through untouched; bare usernames get the service URL built
  around them (see src/lib/socials.ts).
  - xyz.farcaster conventionally holds an account username, not a channel;
    channel links can either be a full URL in the record or a Notion link.
- Campaign links: Notion database (Title, URL, Image, Order, Visible),
  managed by comms. Rows with Visible unchecked or missing Title/URL are
  skipped. All images (dragged-in attachments and pasted external URLs) are
  mirrored by the API into the public Supabase bucket `ens-page-links`
  (stable thumbnail URLs; edits take up to ~1h to appear due to the CDN
  cache, or instantly via ?refresh=1). If mirroring an external URL fails it
  is served directly as a fallback.

## Env vars

| Where | Var | Purpose |
| --- | --- | --- |
| build | `VITE_ENS_NAME` | ENS name to render (d.krux.eth test, devcon.eth prod) |
| build | `VITE_LINKS_API` | links endpoint override (default https://devcon.org/api/links/) |
| build | `VITE_ALCHEMY_KEY` | optional Alchemy mainnet key, used as first RPC; create it with a domain allowlist (devcon.eth.limo, d.krux.eth.limo, localhost:5173); public RPCs remain as fallback for other origins |

Share previews (OG/Twitter tags) are hardcoded in index.html, mirroring
devcon.org's own tags, image included (hosted on devcon.org, so previews work
regardless of gateway or contenthash state). Crawlers don't run JS, so this
is the one content that needs editing index.html + a re-pin to change; keep
it in sync with devcon.org's OG copy when that changes.
| deploy script | `PINATA_JWT` | Pinata API key (scope pinFileToIPFS) |
| setup script | `NOTION_SECRET` | Notion integration token |
| devcon.org (Netlify) | `NOTION_SECRET` | used by /api/links/ (must be added to the Netlify site env) |

The Notion DB id is not secret and is hardcoded in
`devcon/src/services/notion-links.ts` and `scripts/setup-notion-db.ts`
(overridable via `NOTION_LINKS_DB_ID` if the DB is ever swapped).

## Runbooks

Deploy new site code (rare; record/Notion edits never need this):

    cd ens-page
    VITE_ENS_NAME=devcon.eth PINATA_JWT=... pnpm deploy:pin
    # then set the printed ipfs:// URI as Content Hash at app.ens.domains

Notion DB (re)setup / reseed: `pnpm setup:notion [--seed]` with NOTION_* env.
The DB lives in the EF Events workspace; the integration must be shared with it.

Tests: `pnpm test:socials` (pure), `pnpm test:ens` (mainnet integration);
in devcon/: `pnpm test:notion-links`, `pnpm test:links-api [base-url]`.

## Testing a name locally

`pnpm dev` then http://localhost:5173/?name=any.eth. Point links at a local
devcon.org with `VITE_LINKS_API=http://localhost:3000/api/links/ pnpm dev`.

## Gateway quirks

- gateway.pinata.cloud returns 403 for anonymous traffic on free plans; use
  dweb.link / ipfs.io previews instead.
- dweb.link and ipfs.io serve browsers a "Service Worker Gateway" bootstrap
  page first (curl sees the raw content). eth.limo serves content directly.
