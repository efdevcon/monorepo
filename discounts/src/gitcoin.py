#!/usr/bin/env python3
"""
Fetch recipient addresses for official Gitcoin Grants public-goods rounds since
Nov 2024 from the Open Source Observer (OSO) data lake and write them to
outputs/pg-projects-gitcoin.json.

"Official" rounds are those with a round_number set (GG22, GG23, ...) in
stg_gitcoin__all_donations; the long tail of independent community rounds has a
null round_number and is excluded. As with Octant, when a project appears in
multiple rounds we keep only the recipient address from its most recent round.

Docs: https://docs.oso.xyz/docs/developer/get-started/python

Run (from the discounts/ dir, with the OSO key in src/.env as OCTANT_API_KEY):
    .venv-oso/bin/python src/gitcoin.py
"""

import os
import json
from dotenv import dotenv_values
from pyoso import Client

SINCE = "2024-11-01"
ADDRESS_RE_OK = lambda a: isinstance(a, str) and len(a) == 42 and a.startswith("0x")
OUTPUT_FILE = "outputs/pg-projects-gitcoin.json"
ROUNDS_FILE = "outputs/gitcoin-rounds.json"


def main():
    cfg = dotenv_values("src/.env")
    os.environ["OSO_API_KEY"] = cfg["OCTANT_API_KEY"]
    client = Client()

    # Aggregate in SQL: per (project, recipient, round) keep the latest donation
    # time. Collapses ~100k donations to a few hundred rows.
    rows = client.to_pandas(
        f"""
        SELECT
            project_id,
            project_name,
            recipient_address,
            round_number,
            MAX(timestamp) AS last_ts
        FROM stg_gitcoin__all_donations
        WHERE round_number IS NOT NULL
          AND timestamp >= TIMESTAMP '{SINCE}'
        GROUP BY project_id, project_name, recipient_address, round_number
        """
    )

    # For each project, keep the recipient address from its most recent round.
    latest = {}  # project_id -> {"ts": ts, "addr": str, "name": str}
    seen_addrs = {}  # project_id -> set of addresses across rounds
    for _, row in rows.iterrows():
        addr = row["recipient_address"]
        if not ADDRESS_RE_OK(addr):
            continue
        addr = addr.lower()
        pid = row["project_id"] or addr  # fall back to the address if no project id
        ts = row["last_ts"]
        seen_addrs.setdefault(pid, set()).add(addr)
        if pid not in latest or ts > latest[pid]["ts"]:
            latest[pid] = {"ts": ts, "addr": addr, "name": row["project_name"]}

    changed = sum(1 for addrs in seen_addrs.values() if len(addrs) > 1)
    unique = sorted({v["addr"] for v in latest.values()})

    with open(OUTPUT_FILE, "w") as f:
        json.dump(unique, f, indent=2)

    # Per-round breakdown: name + number of (distinct) projects in each round.
    round_rows = client.to_pandas(
        f"""
        SELECT round_number, round_name, COUNT(DISTINCT project_id) AS projects
        FROM stg_gitcoin__all_donations
        WHERE round_number IS NOT NULL
          AND timestamp >= TIMESTAMP '{SINCE}'
        GROUP BY round_number, round_name
        ORDER BY round_number, projects DESC
        """
    )
    rounds_breakdown = [
        {
            "round_number": int(r["round_number"]),
            "round_name": r["round_name"],
            "projects": int(r["projects"]),
        }
        for _, r in round_rows.iterrows()
    ]
    with open(ROUNDS_FILE, "w") as f:
        json.dump(rounds_breakdown, f, indent=2)
    print(f"Wrote {ROUNDS_FILE} ({len(rounds_breakdown)} rounds)")

    rounds = sorted(set(rows["round_number"].dropna().astype(int)))
    print(f"Official Gitcoin rounds since {SINCE}: {rounds}")
    print(f"Distinct projects: {len(latest)}")
    print(f"Projects with >1 recipient address across rounds: {changed}")
    print(f"Unique recipient addresses (last round per project): {len(unique)}")
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
