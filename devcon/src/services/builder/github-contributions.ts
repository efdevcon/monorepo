const GITHUB_API = 'https://api.github.com'

function ghHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'devcon-builder-form'
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

// GraphQL needs its own minimal headers (the REST Accept / API-version headers
// make the /graphql endpoint misbehave).
function gqlHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'devcon-builder-form' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

// How many trailing 12-month windows of contribution history to scan (covers
// ETHGlobal history back to ~2019). Each window is one cheap GraphQL query.
const CONTRIB_LOOKBACK_YEARS = 8

// Repos the user committed to or opened PRs in during one 12-month window —
// crucially, REGARDLESS of ownership, so team-org repos our REST pull misses
// are captured (as long as the commits are attributed to their login).
async function contributedReposForWindow(login: string, fromISO: string, toISO: string): Promise<string[]> {
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){commitContributionsByRepository(maxRepositories:100){repository{nameWithOwner}} pullRequestContributionsByRepository(maxRepositories:100){repository{nameWithOwner}}}}}`
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: gqlHeaders(),
      body: JSON.stringify({ query, variables: { login, from: fromISO, to: toISO } }),
    })
    if (!res.ok) return []
    const json: any = await res.json()
    const c = json?.data?.user?.contributionsCollection
    if (!c) return []
    const out: string[] = []
    for (const x of c.commitContributionsByRepository ?? []) {
      if (x?.repository?.nameWithOwner) out.push(String(x.repository.nameWithOwner).toLowerCase())
    }
    for (const x of c.pullRequestContributionsByRepository ?? []) {
      if (x?.repository?.nameWithOwner) out.push(String(x.repository.nameWithOwner).toLowerCase())
    }
    return out
  } catch {
    return []
  }
}

// Repos listed on the user's "Arctic Code Vault Contributor" achievement — code
// they contributed to in the 2020 GitHub Archive Program (significant OSS,
// attributed by GitHub). The list lives in the achievement hovercard fragment,
// which needs the XHR header. Empty if they don't have the achievement.
async function getArcticVaultRepos(login: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://github.com/users/${encodeURIComponent(login)}/achievements/arctic-code-vault-contributor/detail?hovercard=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; devcon-builder-form)',
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'text/html',
        },
      }
    )
    if (!res.ok) return []
    const html = await res.text()
    const out = new Set<string>()
    const re = /href="\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)"/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html))) {
      const repo = m[1].toLowerCase()
      if (repo.startsWith('assets/') || /\.(png|svg|jpe?g|gif|css|js)$/.test(repo)) continue
      out.add(repo)
    }
    return [...out]
  } catch {
    return []
  }
}

/** Repos the user committed to / opened PRs in over the last CONTRIB_LOOKBACK_YEARS, via GraphQL. */
async function graphqlContributedRepos(login: string): Promise<string[]> {
  const now = Date.now()
  const year = 365 * 24 * 60 * 60 * 1000
  const windows: Promise<string[]>[] = []
  for (let i = 0; i < CONTRIB_LOOKBACK_YEARS; i++) {
    const to = new Date(now - i * year).toISOString()
    const from = new Date(now - (i + 1) * year).toISOString()
    windows.push(contributedReposForWindow(login, from, to))
  }
  return (await Promise.all(windows)).flat()
}

/** Verify an OAuth user-access token and return the GitHub login it belongs to, or null. */
export async function getGithubLogin(userAccessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/user`, {
      headers: { ...ghHeaders(), Authorization: `Bearer ${userAccessToken}` }
    })
    if (!res.ok) return null
    const json: any = await res.json()
    return typeof json?.login === 'string' ? json.login : null
  } catch {
    return null
  }
}

/** A repo from a "known-significant" source (owned repo or Arctic vault), with
 *  stars when free to know (owned repos carry stargazers_count; Arctic repos don't). */
export interface NotableCandidate {
  repo: string
  stars: number | null
}

export interface ContributionData {
  /** All contributed repos (lowercased "owner/name") — for list matching. */
  repos: Set<string>
  /** Owned (non-fork) + Arctic-vault repos — candidates for "notable" scoring if
   *  they miss the list. Owned carry stars; Arctic need a stars lookup. */
  notableCandidates: NotableCandidate[]
}

/**
 * Gather everything a user has contributed to, using the app GITHUB_TOKEN.
 * Sources (unioned): GraphQL commit/PR contributions (ownership-agnostic, catches
 * team-org repos), Arctic Code Vault repos, owned/collaborator repos, and authored
 * PRs. All attribution is by GitHub login, so commits under an unlinked email won't
 * appear. Also returns "notable candidates" (owned + Arctic) for the scorer.
 */
export async function getContributions(username: string): Promise<ContributionData> {
  const repos = new Set<string>()
  const notableCandidates: NotableCandidate[] = []

  // 0) GraphQL commit/PR contributions across the last few years (ownership-agnostic).
  for (const r of await graphqlContributedRepos(username)) repos.add(r)

  // Arctic Code Vault repos (attributed 2020 OSS contributions) — notable candidates.
  for (const r of await getArcticVaultRepos(username)) {
    repos.add(r)
    notableCandidates.push({ repo: r, stars: null })
  }

  // 1) Owned / collaborator repos (paginated, cap 3 pages = 300). Non-forks with
  // their star counts are notable candidates (stars come free here).
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}`, {
      headers: ghHeaders()
    })
    if (!res.ok) break
    const rows: any[] = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) break
    for (const r of rows) {
      if (typeof r?.full_name !== 'string') continue
      const repo = r.full_name.toLowerCase()
      repos.add(repo)
      if (!r.fork) notableCandidates.push({ repo, stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : null })
    }
    if (rows.length < 100) break
  }

  // 2) Repos where they authored PRs (search, cap 2 pages = 200).
  for (let page = 1; page <= 2; page++) {
    const q = encodeURIComponent(`author:${username} type:pr`)
    const res = await fetch(`${GITHUB_API}/search/issues?q=${q}&per_page=100&page=${page}`, { headers: ghHeaders() })
    if (!res.ok) break
    const json: any = await res.json()
    const items: any[] = json?.items ?? []
    if (items.length === 0) break
    for (const it of items) {
      // repository_url like https://api.github.com/repos/owner/name
      const m = typeof it?.repository_url === 'string' ? it.repository_url.match(/repos\/([^/]+\/[^/]+)$/) : null
      if (m) repos.add(m[1].toLowerCase())
    }
    if (items.length < 100) break
  }

  return { repos, notableCandidates }
}

/** Convenience wrapper: just the contributed-repo Set (for list / ETHGlobal matching). */
export async function getContributedRepos(username: string): Promise<Set<string>> {
  return (await getContributions(username)).repos
}

/**
 * Verify the user actually contributed to a repo: true if they authored any
 * commit OR any PR there. Best-effort — returns false on error / no signal.
 * Note: commits authored under an email not linked to the GitHub account won't
 * resolve, so this can false-negative; we treat unverifiable claims as such.
 */
export async function didContributeToRepo(username: string, owner: string, repo: string): Promise<boolean> {
  const o = encodeURIComponent(owner)
  const r = encodeURIComponent(repo)
  const u = encodeURIComponent(username)
  try {
    // A fork's commit history INHERITS the upstream repo's commits, so counting
    // all `author` commits would falsely credit upstream-only contributors. For
    // forks, only count commits made AFTER the fork was created — i.e. the work
    // actually done on the fork, not the original repo.
    let sinceParam = ''
    try {
      const meta = await fetch(`${GITHUB_API}/repos/${o}/${r}`, { headers: ghHeaders() })
      if (meta.ok) {
        const m: any = await meta.json()
        if (m?.fork && m?.created_at) sinceParam = `&since=${encodeURIComponent(m.created_at)}`
      }
    } catch {
      // ignore — fall back to counting all commits
    }
    // Commits authored by the user in this repo (fork-era only, if a fork).
    const commitsRes = await fetch(`${GITHUB_API}/repos/${o}/${r}/commits?author=${u}&per_page=1${sinceParam}`, {
      headers: ghHeaders(),
    })
    if (commitsRes.ok) {
      const rows: any = await commitsRes.json()
      if (Array.isArray(rows) && rows.length > 0) return true
    }
    // PRs authored by the user in this repo.
    const q = encodeURIComponent(`repo:${owner}/${repo} author:${username} type:pr`)
    const prRes = await fetch(`${GITHUB_API}/search/issues?q=${q}&per_page=1`, { headers: ghHeaders() })
    if (prRes.ok) {
      const json: any = await prRes.json()
      if ((json?.total_count ?? 0) > 0) return true
    }
    return false
  } catch {
    return false
  }
}

/** Live GitHub star count for a repo, or null on error. */
export async function getRepoStarsFromGitHub(owner: string, repo: string): Promise<number | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: ghHeaders()
    })
    if (!res.ok) return null
    const json: any = await res.json()
    return typeof json?.stargazers_count === 'number' ? json.stargazers_count : null
  } catch {
    return null
  }
}
