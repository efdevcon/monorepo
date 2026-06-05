#!/usr/bin/env python3
"""
Fetch recipient addresses for Optimism RetroFunding (RetroPGF) public-goods
rounds since Nov 2024 from the Open Source Observer (OSO) data lake and write
them to outputs/pg-projects-optimism.json. RetroFunding 6 (Governance) is
excluded as it is not a public-goods round; the S7/S8 onchain-builders and
dev-tooling rounds are included.

Unlike Octant/Gitcoin, OSO's Optimism funding metadata has no payout address,
so we resolve each funded project to its address via the OSS Directory project
data (int_artifacts_by_project_in_ossd). Per project we keep a single address,
preferring EOA > WALLET > SAFE: an EOA can sign/claim directly, a SAFE multisig
cannot easily produce a signature. Mainnet/Optimism chains are preferred for a
deterministic pick. Deployment artifacts (contracts, deployers, factories) are
never payout addresses and are excluded.

Docs: https://docs.oso.xyz/docs/developer/get-started/python

Run (from the discounts/ dir, with the OSO key in src/.env as OCTANT_API_KEY):
    .venv-oso/bin/python src/optimism.py
"""

import os
import json
from dotenv import dotenv_values
from pyoso import Client

SINCE = "2024-11-01"
OUTPUT_FILE = "outputs/pg-projects-optimism.json"

TYPE_RANK = {"EOA": 0, "WALLET": 1, "SAFE": 2}
CHAIN_RANK = {"MAINNET": 0, "OPTIMISM": 1, "BASE": 2, "ARBITRUM_ONE": 3}


def main():
    cfg = dotenv_values("src/.env")
    os.environ["OSO_API_KEY"] = cfg["OCTANT_API_KEY"]
    client = Client()

    rows = client.to_pandas(
        f"""
        WITH rf AS (
            SELECT DISTINCT to_project_name
            FROM stg_ossd__current_funding
            WHERE from_funder_name = 'optimism'
              AND grant_pool_name LIKE 'retrofunding%'
              AND grant_pool_name != 'retrofunding6'  -- Governance round, not public goods
              AND funding_date >= TIMESTAMP '{SINCE}'
        ),
        proj AS (
            SELECT p.project_id, p.project_name
            FROM stg_ossd__current_projects p
            JOIN rf ON rf.to_project_name = p.project_name
        )
        SELECT
            proj.project_name,
            abp.artifact_type,
            abp.artifact_source,
            abp.artifact_name
        FROM int_artifacts_by_project_in_ossd abp
        JOIN proj ON proj.project_id = abp.project_id
        WHERE abp.artifact_name LIKE '0x%'
          AND abp.artifact_type IN ('WALLET', 'SAFE', 'EOA')
        """
    )

    # For each project, pick one address: EOA > WALLET > SAFE, then preferred
    # chain, then lexicographic for determinism.
    best = {}  # project_name -> (rank_tuple, address)
    for _, r in rows.iterrows():
        addr = r["artifact_name"]
        if not (isinstance(addr, str) and len(addr) == 42 and addr.startswith("0x")):
            continue
        addr = addr.lower()
        rank = (
            TYPE_RANK.get(r["artifact_type"], 9),
            CHAIN_RANK.get(r["artifact_source"], 9),
            addr,
        )
        project = r["project_name"]
        if project not in best or rank < best[project][0]:
            best[project] = (rank, addr)

    unique = sorted({v[1] for v in best.values()})

    with open(OUTPUT_FILE, "w") as f:
        json.dump(unique, f, indent=2)

    print(f"RetroFunding projects with a usable address: {len(best)}")
    print(f"Unique recipient addresses (1 per project): {len(unique)}")
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
