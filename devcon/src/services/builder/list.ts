import web2 from '../../data/oso-web2-oss-repos.json'
import web3 from '../../data/oso-web3-repos.json'
import core from '../../data/core-ecosystem-repos.json'

export interface RepoInfo {
  repo: string
  project?: string
  stars?: number
  ecosystems?: string[]
  list: 'web2' | 'web3' | 'core'
}

interface Web2Row {
  repo: string
  stars?: number
  language?: string
  project?: string
  url?: string
}
interface Web3Row extends Web2Row {
  ecosystems?: string[]
}
interface CoreRow {
  repo: string
  project?: string
}

let repoMap: Map<string, RepoInfo> | null = null

function buildRepoMap(): Map<string, RepoInfo> {
  const map = new Map<string, RepoInfo>()
  for (const row of web2 as Web2Row[]) {
    const key = row.repo.toLowerCase()
    map.set(key, { repo: row.repo, project: row.project, stars: row.stars, list: 'web2' })
  }
  // web3 takes precedence if a repo appears in both (richer: has ecosystems)
  for (const row of web3 as Web3Row[]) {
    const key = row.repo.toLowerCase()
    map.set(key, { repo: row.repo, project: row.project, stars: row.stars, ecosystems: row.ecosystems, list: 'web3' })
  }
  // EF / Ethereum / core-client org repos — added regardless of stars. Loaded
  // last so a core repo is labelled 'core' even if it also appears above.
  for (const row of core as CoreRow[]) {
    const key = row.repo.toLowerCase()
    const existing = map.get(key)
    map.set(key, { repo: row.repo, project: row.project, stars: existing?.stars, ecosystems: existing?.ecosystems, list: 'core' })
  }
  return map
}

export function lookupRepo(repoFullName: string): RepoInfo | null {
  if (!repoMap) repoMap = buildRepoMap()
  return repoMap.get(repoFullName.toLowerCase()) ?? null
}
