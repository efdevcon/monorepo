# Devcon 8 discount/builder data scripts

Scripts that feed the Devcon 8 ticket store (discount eligibility) and the builder
application (repo scoring). These are the ones touched for Devcon 8.

**Prerequisites:** run every command from the `discounts/` repo root, with a `.env`
there containing `OCTANT_API_KEY` (OSO) and `GITHUB_TOKEN`. Python scripts use the
`.venv-oso` virtualenv.

## What each produces

| Output | Consumer | Script |
|---|---|---|
| `core-devs.json` | store: Core Devs / Protocol Guild (free) | `core.ts` |
| `oss-contributors.json` | store: OSS Contributors (now part of builder discount) | `github.ts` |
| `pg-projects.json` | store: Public Good Projects (50%) | `pg.ts` (merges 4 sources) |
| `poap-past-attendees.json` | store: Past Attendees (10%) | `poaps.ts` |
| `oso-web2-oss-repos.json`, `oso-web3-repos.json` | builder: repo scoring | `oso_repos.py` |

## Preferred order

Dependencies matter: regenerate inputs and sources before the scripts that merge them.

```bash
# 1. Inputs (feed core + poaps)
bun run split                      # -> inputs/protocol-guild-2026.json  (feeds core)
bun run poap-fetch                 # -> inputs/POAP_drop_*.csv           (feeds poaps; slow)

# 2. Public Good sources (feed pg)
.venv-oso/bin/python src/gitcoin.py    # -> outputs/pg-projects-gitcoin.json
.venv-oso/bin/python src/octant.py     # -> outputs/pg-projects-octant.json
.venv-oso/bin/python src/optimism.py   # -> outputs/pg-projects-optimism.json
bun run giveth                         # -> outputs/pg-projects-giveth.json

# 3. Final lists (run after their inputs/sources above)
bun run core                       # -> outputs/core-devs.json           (needs step 1 split)
bun run pg                         # -> outputs/pg-projects.json         (needs step 2)
bun run poap                       # -> outputs/poap-past-attendees.json (needs step 1 poap-fetch)
bun run github                     # -> outputs/oss-contributors.json    (independent; very slow crawl)
.venv-oso/bin/python src/oso_repos.py  # -> outputs/oso-web2|web3.json   (independent; builder)

# 4. Pull the fresh outputs into the devcon app
cd ../devcon && pnpm sync:discount-data
```

Notes:
- `core`, `pg`, `poaps` only merge existing inputs/sources, so always run steps 1-2 first
  if you want fresh data.
- `github` and `oso_repos.py` are independent of the others and can run any time in step 3.
- `pnpm sync:discount-data` copies the outputs into `devcon/src/discounts/` and `devcon/src/data/`
  (it overwrites from these outputs, so regenerate here first). Use `--check` to see drift without writing.
