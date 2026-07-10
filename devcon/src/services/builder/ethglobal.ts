import index from '../../data/ethglobal-projects-by-repo.json'

// Cross-references an applicant's GitHub contributions against the bundled
// ETHGlobal project index (built from ethglobal-skills/repo). Surfaces which
// ETHGlobal hackathon projects they built and whether any were finalists /
// prize winners — no ETHGlobal auth or form field needed.

export interface EthglobalProject {
  repo: string
  title: string
  event: string
  url: string
  prizes: string[]
  finalist: boolean
}

interface IndexEntry {
  title: string
  event: string
  url: string
  prizes: string[]
  finalist: boolean
}

const map = index as Record<string, IndexEntry[]>

export function matchEthglobalProjects(repos: Iterable<string>): EthglobalProject[] {
  const out: EthglobalProject[] = []
  const seen = new Set<string>()
  for (const r of repos) {
    const entries = map[r.toLowerCase()]
    if (!entries) continue
    for (const e of entries) {
      const id = `${e.url}`
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ repo: r.toLowerCase(), ...e })
    }
  }
  // Finalists / prized projects first, then by prize count.
  out.sort((a, b) => Number(b.finalist) - Number(a.finalist) || b.prizes.length - a.prizes.length)
  return out
}
