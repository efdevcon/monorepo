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
pnpm pretix:clone --prune       # NOT YET IMPLEMENTED — flag is parsed, no effect
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

Run `pnpm pretix:clone` again. Resources tracked in the state file are PATCHed; new ones are created. Use `--dry-run` first to preview changes. `--prune` is reserved for a future iteration that will delete orphans on the target; today the flag is a no-op.
