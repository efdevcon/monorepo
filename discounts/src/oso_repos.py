#!/usr/bin/env python3
"""
Export two lists of major GitHub repos from the Open Source Observer (OSO) data
lake:
  - outputs/oso-web3-repos.json  : web3 projects, tagged by chain ecosystem
  - outputs/oso-web2-oss-repos.json : major OSS projects that are NOT web3

"web3" = membership in a chain ecosystem collection (Electric Capital "Crypto
Ecosystems" taxonomy + Optimism/Stellar). "web2 OSS" = a major repo in no crypto
ecosystem. "major" = non-fork repo with at least MIN_STARS GitHub stars.

Each web3 repo lists ALL the chain ecosystems it belongs to (multi-value
`ecosystems` field). A forced L1/L2/chain bucket is NOT reliable from OSO
collections (e.g. ethereum/go-ethereum is missing from ethereum-crypto-ecosystems
and the `optimism` collection is a grants set that mixes in ETH mainnet projects),
so we surface the raw ecosystem tags and let the consumer slice them.

Docs: https://docs.oso.xyz/docs/developer/get-started/python
Run:  .venv-oso/bin/python src/oso_repos.py
"""

import os
import json
from dotenv import dotenv_values
from pyoso import Client

MIN_STARS = 500

# Chain ecosystem collections (OSS_DIRECTORY) that define the web3 universe,
# mapped to a readable ecosystem label for the output.
ECOSYSTEMS = {
    "ethereum-crypto-ecosystems": "ethereum",
    "optimism": "optimism",
    "arbitrum-crypto-ecosystems": "arbitrum",
    "base-crypto-ecosystems": "base",
    "polygon-crypto-ecosystems": "polygon",
    "zksync-crypto-ecosystems": "zksync",
    "scroll-crypto-ecosystems": "scroll",
    "solana-crypto-ecosystems": "solana",
    "stellar": "stellar",
    "filecoin-crypto-ecosystems": "filecoin",
    "celo-crypto-ecosystems": "celo",
}

WEB3_OUT = "outputs/oso-web3-repos.json"
WEB2_OUT = "outputs/oso-web2-oss-repos.json"


def sql_list(names):
    return ", ".join("'" + n + "'" for n in names)


def main():
    cfg = dotenv_values("src/.env")
    os.environ["OSO_API_KEY"] = cfg["OCTANT_API_KEY"]
    client = Client()

    # project_id -> set of ecosystem labels it belongs to
    pbc = client.to_pandas(
        f"""
        SELECT DISTINCT pbc.project_id, col.collection_name
        FROM projects_by_collection_v1 pbc
        JOIN collections_v1 col ON col.collection_id = pbc.collection_id
        WHERE col.collection_source = 'OSS_DIRECTORY'
          AND col.collection_name IN ({sql_list(ECOSYSTEMS)})
        """
    )
    project_ecosystems = {}
    for _, r in pbc.iterrows():
        label = ECOSYSTEMS[r["collection_name"]]
        project_ecosystems.setdefault(r["project_id"], set()).add(label)

    web3_project_ids = set(project_ecosystems)

    # All major non-fork repos with their project + display name.
    repos = client.to_pandas(
        f"""
        SELECT
            r.artifact_namespace || '/' || r.artifact_name AS repo,
            r.artifact_url,
            r.star_count,
            r.fork_count,
            r.language,
            r.project_id,
            p.display_name AS project
        FROM int_repositories_enriched r
        JOIN projects_v1 p ON p.project_id = r.project_id
        WHERE r.is_fork = false AND r.star_count >= {MIN_STARS}
        """
    )

    # Dedup by repo; for web3, union the ecosystem labels across its projects.
    web3, web2 = {}, {}
    for _, r in repos.iterrows():
        repo = r["repo"].lower()
        row = {
            "repo": r["repo"],
            "stars": int(r["star_count"]),
            "language": r["language"] or "",
            "project": r["project"] or "",
            "url": r["artifact_url"],
        }
        if r["project_id"] in web3_project_ids:
            ecos = web3.get(repo, {}).get("_ecos", set()) | project_ecosystems[r["project_id"]]
            web3[repo] = {**row, "_ecos": ecos}
        else:
            web2.setdefault(repo, row)

    # A repo can map to both a web3 and a non-web3 project; web3 wins.
    for repo in list(web2):
        if repo in web3:
            del web2[repo]

    web3_rows = sorted(web3.values(), key=lambda x: (-x["stars"], x["repo"].lower()))
    web2_rows = sorted(web2.values(), key=lambda x: (-x["stars"], x["repo"].lower()))

    web3_json = [
        {
            "repo": x["repo"],
            "ecosystems": sorted(x["_ecos"]),
            "stars": x["stars"],
            "language": x["language"],
            "project": x["project"],
            "url": x["url"],
        }
        for x in web3_rows
    ]
    web2_json = [
        {
            "repo": x["repo"],
            "stars": x["stars"],
            "language": x["language"],
            "project": x["project"],
            "url": x["url"],
        }
        for x in web2_rows
    ]

    with open(WEB3_OUT, "w") as f:
        json.dump(web3_json, f, indent=2)
    with open(WEB2_OUT, "w") as f:
        json.dump(web2_json, f, indent=2)

    eco_counts = {}
    for x in web3_rows:
        for e in x["_ecos"]:
            eco_counts[e] = eco_counts.get(e, 0) + 1
    print(f"MIN_STARS = {MIN_STARS}")
    print(f"web3 repos: {len(web3_rows)}")
    print("  by ecosystem (repos can have several):",
          dict(sorted(eco_counts.items(), key=lambda kv: -kv[1])))
    print(f"web2 OSS repos: {len(web2_rows)}")
    print(f"Wrote {WEB3_OUT} and {WEB2_OUT}")


if __name__ == "__main__":
    main()
