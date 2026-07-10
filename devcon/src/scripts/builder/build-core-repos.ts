/**
 * Build src/data/core-ecosystem-repos.json — the EF / Ethereum / core-client
 * org repos. These are added to the list as a "core" tier (regardless of
 * stars), mirroring exactly the repo set the discounts repo scans to build the
 * known-contributors list (efdevcon + ethereum orgs + execution/consensus
 * clients). So a contribution to e.g. efdevcon/monorepo matches per-repo.
 *
 * Run from the devcon repo root: npx tsx src/scripts/builder/build-core-repos.ts
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const headers: Record<string, string> = {
  'User-Agent': 'devcon-builder-form',
  Accept: 'application/vnd.github+json',
}
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

const ORGS = ['efdevcon', 'ethereum']
const CLIENTS = [
  'NethermindEth/nethermind',
  'paradigmxyz/reth',
  'besu-eth/besu',
  'erigontech/erigon',
  'lambdaclass/ethrex',
  'status-im/nimbus-eth1',
  'sigp/lighthouse',
  'ChainSafe/lodestar',
  'OffchainLabs/prysm',
  'Consensys/teku',
  'status-im/nimbus-eth2',
  'grandinetech/grandine',
]

const OUT_FILE = path.resolve(process.cwd(), 'src/data/core-ecosystem-repos.json')

interface CoreRepo {
  repo: string
  project: string
}

async function orgRepos(org: string): Promise<string[]> {
  const repos: string[] = []
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://api.github.com/orgs/${org}/repos?page=${page}&type=public&per_page=100`, { headers })
    if (!res.ok) break
    const data: any[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    for (const r of data) if (r?.full_name && !r.fork && !r.archived) repos.push(r.full_name)
    if (data.length < 100) break
  }
  return repos
}

async function main() {
  const out = new Map<string, CoreRepo>()
  for (const org of ORGS) {
    const repos = await orgRepos(org)
    console.log(`  ${org}: ${repos.length} repos`)
    for (const full of repos) out.set(full.toLowerCase(), { repo: full, project: org })
  }
  for (const full of CLIENTS) {
    out.set(full.toLowerCase(), { repo: full, project: full.split('/')[0] })
  }
  const arr = [...out.values()]
  fs.writeFileSync(OUT_FILE, JSON.stringify(arr))
  console.log(`Wrote ${arr.length} core repos -> ${OUT_FILE}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
