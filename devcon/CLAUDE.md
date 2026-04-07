# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Standards

This is a TypeScript-first codebase. Ensure all new code has proper types — no implicit 'any'. Run type-checks (`tsc --noEmit` or equivalent) before considering a task complete.

## Commands

```bash
pnpm dev                    # Dev server (TinaCMS + Next.js on localhost:3000)
pnpm build                  # Production build (tinacms build && next build --webpack)
pnpm lint                   # ESLint (next lint)
pnpm pretix:test-all        # Test Pretix API connection
pnpm x402:test-flow         # Test full x402 payment flow (requires dev server running)
```

## Architecture

**Next.js 16 with Pages Router** — not App Router. Deployed on Netlify.

### Monorepo

This is the `devcon` package in a pnpm workspace. Shared code lives in `../../lib/` (aliased as `lib/*` in tsconfig), including shared components and shadcn/ui primitives at `lib/shadcn/`.

### Key Directories

- `src/pages/` — Pages Router pages + API routes
- `src/components/common/` — Reusable UI (button, card, layouts, carousel)
- `src/components/domain/` — Feature-specific (tickets, discounts, devcon-week)
- `src/services/` — Backend integrations (Pretix, Supabase, x402, relayer)
- `src/types/` — TypeScript type definitions
- `src/state/` — Recoil atoms
- `src/context/` — React contexts (Web3Modal, AppKit, page HOC)
- `src/hooks/` — Custom hooks
- `src/assets/css/` — SCSS modules and global styles
- `tina/` — TinaCMS config; `content/` — CMS markdown content

### Styling

Dual approach: **TailwindCSS 3.4** (primary, with shadcn/ui) and **SCSS Modules** (legacy components in `src/assets/css/`). Fonts: Inter (body) and Poppins (headings) loaded from Google Fonts.

### State Management

Recoil for global state (`src/state/main.ts`). React Context for Web3Modal/AppKit. React Query for server state.

### Ticketing & Payments

- **Pretix** — Ticket management backend. Service at `src/services/pretix.ts` with built-in TTL caching, request deduplication, and retry logic.
- **x402 Protocol** — Crypto payments (USDC, USDT0, ETH) on Ethereum, Optimism, Arbitrum, Base. Full x402 v2 compliance with dual-mode: spec-compliant for SDK clients, multi-step checkout for frontend. See `src/pages/api/x402/README.md` for full API docs.
- **Supabase** — PostgreSQL for order tracking (`src/services/ticketStore.ts`).
- **Gasless relayer** — EIP-3009 `transferWithAuthorization` for gas-sponsored USDC payments.

### Auth & Identity

- NextAuth (`src/pages/api/auth/[...nextauth].ts`)
- SIWE (Sign-in with Ethereum) via Wagmi/Viem
- AnonAadhaar for Indian identity verification (discount eligibility)

### Internationalization

Locales: `default`, `en`, `es`. Middleware handles i18n routing.

## Code Style

- Prettier: single quotes, no semicolons, 120 char width, no parens on single arrow params
- ESLint: `next/core-web-vitals` base config
- TypeScript: strict mode, `src/` as baseUrl for imports
- SVGs in `src/assets/images/` and `src/assets/icons/` are auto-converted to React components via @svgr/webpack

## Conventions

- Do NOT run build or compile checks unless explicitly asked
- Use `pnpm`, not npm or yarn
- Use shadcn/ui components — ticketing form components at `src/@/components/ui/`, general UI primitives in shared `../../lib/components/ui/`
- Use Lucide icons; only import SVG/images if no Lucide equivalent exists
- Components split into `common/` (reusable) vs `domain/` (feature-specific)
- API error responses follow `{ success: false, error: string, details?: string }`
- Wallet addresses must use EIP-55 checksum format (`getAddress()` from viem)
- Payment references are single-use, expire after 1 hour

## Code Changes

Before applying per-file workarounds or hardcoded fixes, check if there's a root/shared function that should be fixed instead. Prefer fixing issues at the source.

## UI/Design Workflow

When implementing UI changes, always check for Figma MCP server availability first. If unavailable, ask the user for specific design values (colors, spacing, sizes) rather than guessing or stalling.

## Downloading Image Assets from Figma

When asked to download, export, or save an image from a Figma URL:

### 1. Parse the URL

```
https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2
```

- `fileKey` = path segment after `/design/`
- `nodeId` = `node-id` query param, convert `-` to `:` (e.g. `2698-2019` → `2698:2019`)
- For branch URLs (`/branch/:branchKey/`), use `branchKey` as `fileKey`

### 2. If Figma MCP is available

Call `get_design_context` with `fileKey` and `nodeId`. The response contains asset URL constants at the top:

```javascript
const imgLayerName = "https://www.figma.com/api/mcp/asset/<uuid>";
```

Each constant corresponds to an image layer in the design. Match the variable name (derived from the Figma layer name) to identify the desired asset. Download with:

```bash
curl -L -o /path/to/output.png "https://www.figma.com/api/mcp/asset/<uuid>"
```

Asset URLs expire after 7 days — download immediately.

For a full-node screenshot instead of individual assets, use `get_screenshot` with `fileKey` and `nodeId`.

### 3. If Figma MCP is NOT available

Use the Figma REST API (requires a `FIGMA_TOKEN` env var or personal access token):

```bash
curl -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/images/:fileKey?ids=:nodeId&format=png&scale=2" \
  | jq -r '.images[":nodeId"]' \
  | xargs curl -L -o /path/to/output.png
```

### 4. Verify the download

```bash
file /path/to/output.png && ls -lh /path/to/output.png
```
