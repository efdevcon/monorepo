#!/usr/bin/env python3
"""
Fetch all Octant grant recipient addresses across every epoch from the Open
Source Observer (OSO) data lake and write them to outputs/pg-projects-octant.json.

Octant funding lives in OSO's OSS-funding dataset under
from_funder_name = 'octant-golemfoundation'. Each funding row's metadata holds
the recipient's Octant application URL, whose last path segment is the project's
withdrawal address, e.g.
    https://octant.app/project/1/0xD165df4296C85e780509fa1eace0150d945d49Fd

Docs: https://docs.oso.xyz/docs/developer/get-started/python

Run (from the discounts/ dir, with the OSO key in .env as OCTANT_API_KEY):
    .venv-oso/bin/python src/octant.py
"""

import os
import re
import json
from dotenv import dotenv_values
from pyoso import Client

ADDRESS_RE = re.compile(r"0x[0-9a-fA-F]{40}")
OUTPUT_FILE = "outputs/pg-projects-octant.json"


def main():
    cfg = dotenv_values(".env")
    os.environ["OSO_API_KEY"] = cfg["OCTANT_API_KEY"]
    client = Client()

    rows = client.to_pandas(
        """
        SELECT grant_pool_name, to_project_name, metadata
        FROM stg_ossd__current_funding
        WHERE from_funder_name = 'octant-golemfoundation'
        ORDER BY grant_pool_name, to_project_name
        """
    )

    # For each project keep only its most recent epoch's withdrawal address,
    # since a project can change its payout address between rounds.
    latest = {}  # project -> {"epoch": int, "addr": str}
    seen_addrs = {}  # project -> set of all addresses seen across epochs
    epochs = set()
    for _, row in rows.iterrows():
        meta = row["metadata"]
        if isinstance(meta, str):
            meta = json.loads(meta)
        url = (meta or {}).get("application_url", "")
        match = ADDRESS_RE.search(url)
        if not match:
            print(f"  no address for {row['to_project_name']} ({row['grant_pool_name']})")
            continue

        project = row["to_project_name"]
        epoch_num = int(re.search(r"\d+", row["grant_pool_name"]).group(0))
        epochs.add(epoch_num)
        addr = match.group(0).lower()
        seen_addrs.setdefault(project, set()).add(addr)
        if project not in latest or epoch_num > latest[project]["epoch"]:
            latest[project] = {"epoch": epoch_num, "addr": addr}

    changed = sum(1 for addrs in seen_addrs.values() if len(addrs) > 1)
    unique = sorted({v["addr"] for v in latest.values()})

    with open(OUTPUT_FILE, "w") as f:
        json.dump(unique, f, indent=2)

    print(f"Octant fundings: {len(rows)} across {len(epochs)} epochs")
    print(f"Distinct projects: {len(latest)}")
    print(f"Projects that changed payout address across epochs: {changed}")
    print(f"Unique recipient addresses (last round per project): {len(unique)}")
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
