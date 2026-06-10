import { lookupRepo } from './list'
import { getRepoStarsFromGitHub, didContributeToRepo } from './github-contributions'
import type { NotableCandidate } from './github-contributions'

// Minimum stars for a non-listed repo to count as "notable".
const NOTABLE_MIN_STARS = 100

export interface MatchedRepo {
  repo: string
  project?: string
  stars?: number | null
  list?: 'web2' | 'web3' | 'core'
  ecosystems?: string[]
  source: 'list' | 'github' | 'unverified'
}

export interface ScoreInput {
  githubUsername?: string | null
  /** repos pulled from GitHub for the verified user (lowercased owner/name) — already verified */
  contributedRepos: Set<string>
  /** repos the applicant manually claimed (lowercased owner/name) — unverified until checked */
  claimedRepos: string[]
  /** Known-significant contributions (owned + Arctic vault) — scored as "notable"
   *  by stars if they miss the list. Already-verified, so no contribution check. */
  notableRepos?: NotableCandidate[]
}

export interface ScoreResult {
  matchedRepos: MatchedRepo[]
  matchedCount: number
  matchSource: string
}

interface ScoreDeps {
  ghStars: (owner: string, repo: string) => Promise<number | null>
  /** Verify the (connected) user actually contributed to owner/repo. */
  verifyContribution: (username: string, owner: string, repo: string) => Promise<boolean>
}

const defaultDeps: ScoreDeps = {
  ghStars: getRepoStarsFromGitHub,
  verifyContribution: didContributeToRepo,
}

export async function scoreBuilder(input: ScoreInput, deps: ScoreDeps = defaultDeps): Promise<ScoreResult> {
  const username = input.githubUsername || ''
  const matched: MatchedRepo[] = []
  const seen = new Set<string>()

  // 0) Verify manually-claimed repos. A claimed repo already present in the
  // verified GitHub pull needs no extra call. Without a connected GitHub
  // identity we can't verify anything, so all claims are "unverified".
  const verifiedClaimed: string[] = []
  const unverifiedClaimed: string[] = []
  await Promise.all(
    input.claimedRepos.map(async repo => {
      if (input.contributedRepos.has(repo)) {
        verifiedClaimed.push(repo)
        return
      }
      const [owner, name] = repo.split('/')
      const ok = username ? await deps.verifyContribution(username, owner, name) : false
      if (ok) verifiedClaimed.push(repo)
      else unverifiedClaimed.push(repo)
    })
  )

  // 1) List match across VERIFIED repos only (pulled contributions ∪ verified claims).
  const verifiedRepos = new Set<string>([...input.contributedRepos, ...verifiedClaimed])
  for (const repo of verifiedRepos) {
    const info = lookupRepo(repo)
    if (info) {
      matched.push({
        repo,
        project: info.project,
        stars: info.stars,
        list: info.list,
        ecosystems: info.ecosystems,
        source: 'list',
      })
      seen.add(repo)
    }
  }
  const listCount = matched.length

  // 2) Fallback chain for VERIFIED claimed repos that missed the list
  // (concurrently, to avoid serializing network round-trips).
  const fallbackRepos = verifiedClaimed.filter(repo => {
    if (seen.has(repo)) return false
    seen.add(repo)
    return true
  })
  const fallbackResults = await Promise.all(
    fallbackRepos.map(async (repo): Promise<{ repo: string; stars: number | null }> => {
      const [owner, name] = repo.split('/')
      return { repo, stars: await deps.ghStars(owner, name) }
    })
  )
  // Only repos with stars > 0 are "notable". A 0-star repo (e.g. a fork) isn't
  // significant, so it's dropped from the matches (it still shows in the raw
  // claimed-repos list and, if applicable, the ETHGlobal card).
  for (const m of fallbackResults) {
    if (typeof m.stars === 'number' && m.stars > 0) matched.push({ repo: m.repo, stars: m.stars, source: 'github' })
  }

  // 2b) Notable from known-significant sources (owned repos + Arctic vault) that
  // miss the list. Owned repos carry stars (free); Arctic repos need a lookup.
  // No verification needed — these are already attributed contributions.
  const notableCandidates = [
    ...new Map((input.notableRepos ?? []).map(c => [c.repo.toLowerCase(), c])).values(),
  ].filter(c => !seen.has(c.repo.toLowerCase()) && !lookupRepo(c.repo.toLowerCase()))
  const notableResults = await Promise.all(
    notableCandidates.map(async c => {
      const repo = c.repo.toLowerCase()
      const [owner, name] = repo.split('/')
      const stars = typeof c.stars === 'number' ? c.stars : await deps.ghStars(owner, name)
      return { repo, stars }
    })
  )
  for (const m of notableResults) {
    if (seen.has(m.repo)) continue
    if (typeof m.stars === 'number' && m.stars >= NOTABLE_MIN_STARS) {
      seen.add(m.repo)
      matched.push({ repo: m.repo, stars: m.stars, source: 'github' })
    }
  }

  // 3) Record unverified claims so admins see them — flagged, never counted.
  for (const repo of unverifiedClaimed) {
    if (seen.has(repo)) continue
    seen.add(repo)
    matched.push({ repo, source: 'unverified' })
  }

  // Per-list breakdown for the admin "Match summary" (omit zero counts).
  const counts = {
    'EF/Ethereum': matched.filter(m => m.source === 'list' && m.list === 'core').length,
    OSS: matched.filter(m => m.source === 'list' && m.list === 'web2').length,
    web3: matched.filter(m => m.source === 'list' && m.list === 'web3').length,
    notable: matched.filter(m => m.source === 'github').length,
    unverified: unverifiedClaimed.length,
  }
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${n} ${label}`)

  return {
    matchedRepos: matched,
    matchedCount: listCount,
    matchSource: parts.join(', ') || 'no matches',
  }
}
