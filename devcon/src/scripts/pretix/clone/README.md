# Pretix Event Clone

Clones a Pretix event from `mum.ticketh.xyz/devcon/8` into `dcdev2.ticketh.xyz/org/8`.
Re-runnable to sync changes from prod into the dev mirror.

## Prerequisites

- `PRETIX_API_TOKEN_PROD` set in `.env` (read access to source)
- `PRETIX_API_TOKEN_DEV` set in `.env` (write access to target)
- `NEXT_PUBLIC_PRETIX_ENV` must NOT be `production`. Script aborts otherwise.

## Commands

```
pnpm pretix:clone --force       # reuse existing target event slug
pnpm pretix:clone               # pull + push (interactive confirm)
pnpm pretix:clone --pull        # source → snapshot only
pnpm pretix:clone --push        # snapshot → target only
pnpm pretix:clone --dry-run     # plan only, no writes
pnpm pretix:clone --yes         # skip interactive confirm
pnpm pretix:clone --only=items  # restrict to one resource type
pnpm pretix:clone --prune       # after apply, DELETE target resources not in source
```

Resource types accepted by `--only`: `event`, `settings`, `tax_rules`, `categories`, `questions`, `quotas`, `items`, `discounts`, `addons`, `bundles`.

## Files

- `snapshots/<organizer>-<event>.snapshot.json` — gitignored, regenerated each pull.
- `.clone-state-<src>--to--<dst>.json` — gitignored, holds source-id → target-id maps. Persisted across runs; do not delete unless re-cloning from scratch.

## What is cloned

Event metadata, allowlisted settings, tax rules, categories, questions (with options and item links), quotas (with item/variation links), items (with variations, addons, bundles), discounts.

## What is NOT cloned

Orders, vouchers, check-in lists, payment provider credentials, mail SMTP settings, webhooks, organizer-level resources (teams, devices, gift cards). The cloned target is always `live=false`, `testmode=true`, `is_public=false`.

## Re-syncing from prod

Run `pnpm pretix:clone` again. Resources tracked in the state file are PATCHed; new ones are created. Use `--dry-run` first to preview changes.

## Pruning orphans

`--prune` runs after the apply phases and DELETEs target resources whose IDs aren't in the rebuilt state map — i.e. anything on target that doesn't exist in source by ID nor by natural key (since adoption would have claimed it). Delete order is the reverse of apply (`discounts → items → quotas → questions → categories → tax_rules`) so FK constraints hold. Orphan variations on kept items are stripped first; variations on orphan items cascade via Pretix's own DELETE. Individual DELETE failures (e.g. Pretix refusing to remove a resource bound to a test order) become warnings, not fatal — the rest of the prune continues.

Always run `--prune --dry-run` first to preview deletions. Combine with `--only=<type>` to prune one resource type at a time.
