# `src/data`

Bundled JSON datasets used by the builder application + scoring (`src/services/builder/*`).
These are generated artifacts; edit the source/script, not the JSON by hand.

Two kinds of files live here:

- **Imported from the sibling `discounts` repo** (the OSO lists). Pull them in with
  `pnpm sync:discount-data` (see below).
- **Built by this repo's own scripts** (everything else). Regenerate with the per-file command.

| File | Used by | Origin | Regenerate |
|---|---|---|---|
| `oso-web2-oss-repos.json` | `services/builder/list.ts` | discounts repo, `src/oso_repos.py` (Open Source Observer data lake) | regen in `../discounts`, then `pnpm sync:discount-data` |
| `oso-web3-repos.json` | `services/builder/list.ts` | discounts repo, `src/oso_repos.py` | regen in `../discounts`, then `pnpm sync:discount-data` |
| `core-ecosystem-repos.json` | `services/builder/list.ts` | this repo, `src/scripts/builder/build-core-repos.ts` | `npx tsx src/scripts/builder/build-core-repos.ts` (needs `GITHUB_TOKEN`) |
| `devcon-poap-attendees.json` | `services/builder/poap-attendees.ts` | this repo, `src/scripts/builder/build-poap-attendees.ts` (reads `../discounts/inputs/POAP_drop_*.csv`) | `npx tsx src/scripts/builder/build-poap-attendees.ts` |
| `ethglobal-projects-by-repo.json` | `services/builder/ethglobal.ts` | this repo, `src/scripts/builder/build-ethglobal-index.ts` (source: `ethglobal-skills/repo` `projects_full.json`) | `npx tsx src/scripts/builder/build-ethglobal-index.ts` |

## Syncing the imported (OSO) lists

These are generated in the sibling **discounts** repo and pulled in here. devcon owns where
they land: the mapping lives in `src/scripts/sync-discount-data.ts`.

```bash
# 1. regenerate the source in the discounts repo
cd ../discounts && .venv-oso/bin/python src/oso_repos.py

# 2. pull the fresh outputs into this repo
cd ../devcon && pnpm sync:discount-data

# (optional) report drift without writing — useful in CI
pnpm sync:discount-data --check
```

`pnpm sync:discount-data` copies from `../discounts/outputs/` into both `src/data/` and
`src/discounts/`. It overwrites the in-repo copies from the discounts outputs, so always
regenerate in `../discounts` first.

> The discount-eligibility lists (`core-devs.json`, `oss-contributors.json`,
> `past-attendees.json`, `pg-projects.json`) live in `src/discounts/`, not here. They're a
> separate set, also pulled by `pnpm sync:discount-data`. See `src/discounts/README.md`.
