// Best-effort live GitHub profile + impact + recent-activity stats for a
// verified login, via the public GitHub API (app GITHUB_TOKEN). Each piece is
// independent and degrades to null/empty so a partial failure still renders.

const GITHUB_API = 'https://api.github.com'

function ghHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = process.env.GITHUB_TOKEN
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'devcon-builder-form',
    ...extra,
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

// GitHub achievements aren't in the REST/GraphQL API — they only render on the
// profile HTML. We scrape them best-effort (empty on any failure / markup change).
const ACHIEVEMENT_LABELS: Record<string, string> = {
  'pull-shark': 'Pull Shark',
  quickdraw: 'Quickdraw',
  starstruck: 'Starstruck',
  yolo: 'YOLO',
  'pair-extraordinaire': 'Pair Extraordinaire',
  'arctic-code-vault-contributor': 'Arctic Code Vault Contributor',
  'public-sponsor': 'Public Sponsor',
  'galaxy-brain': 'Galaxy Brain',
  'heart-on-your-sleeve': 'Heart On Your Sleeve',
}

async function getAchievements(login: string): Promise<string[]> {
  try {
    const res = await fetch(`https://github.com/${encodeURIComponent(login)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; devcon-builder-form)', Accept: 'text/html' },
    })
    if (!res.ok) return []
    const html = await res.text()
    const slugs = new Set<string>()
    const re = /achievements\/([a-z0-9-]+)\/detail/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html))) slugs.add(m[1])
    return [...slugs].map(s => ACHIEVEMENT_LABELS[s] ?? s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  } catch {
    return []
  }
}

export interface GithubActivity {
  commits: number
  prs: number
  reviews: number
  issues: number
  reposContributed: number
}

export interface GithubProfile {
  login: string
  name?: string
  avatarUrl?: string
  bio?: string
  company?: string
  location?: string
  blog?: string
  twitter?: string
  followers: number
  following: number
  publicRepos: number
  createdAt?: string
  // impact
  prsAuthored: number | null
  prsMerged: number | null
  issuesOpened: number | null
  starsReceived: number | null
  topLanguages: string[]
  // activity over the last ~2 years (sum of two 12-month windows)
  activity: GithubActivity | null
  achievements: string[]
}

async function searchCount(q: string): Promise<number | null> {
  try {
    const res = await fetch(`${GITHUB_API}/search/issues?q=${encodeURIComponent(q)}&per_page=1`, {
      headers: ghHeaders(),
    })
    if (!res.ok) return null
    const j: any = await res.json()
    return typeof j?.total_count === 'number' ? j.total_count : null
  } catch {
    return null
  }
}

/** Sum of stars across owned non-fork repos + top languages (cap 2 pages). */
async function ownedRepoStats(login: string): Promise<{ stars: number | null; languages: string[] }> {
  try {
    let stars = 0
    const langCount = new Map<string, number>()
    let any = false
    for (let page = 1; page <= 2; page++) {
      const res = await fetch(
        `${GITHUB_API}/users/${encodeURIComponent(login)}/repos?per_page=100&page=${page}&type=owner&sort=pushed`,
        { headers: ghHeaders() }
      )
      if (!res.ok) break
      const rows: any[] = await res.json()
      if (!Array.isArray(rows) || rows.length === 0) break
      any = true
      for (const r of rows) {
        if (r?.fork) continue
        if (typeof r?.stargazers_count === 'number') stars += r.stargazers_count
        if (r?.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1)
      }
      if (rows.length < 100) break
    }
    const languages = [...langCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l]) => l)
    return { stars: any ? stars : null, languages }
  } catch {
    return { stars: null, languages: [] }
  }
}

async function contributions(login: string, fromISO: string, toISO: string): Promise<GithubActivity | null> {
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions totalIssueContributions totalRepositoriesWithContributedCommits}}}`
  // GraphQL needs its OWN minimal headers — the REST Accept / X-GitHub-Api-Version
  // headers cause the /graphql endpoint to misbehave.
  const token = process.env.GITHUB_TOKEN
  const gqlHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'devcon-builder-form' }
  if (token) gqlHeaders.Authorization = `Bearer ${token}`
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: gqlHeaders,
      body: JSON.stringify({ query, variables: { login, from: fromISO, to: toISO } }),
    })
    if (!res.ok) return null
    const j: any = await res.json()
    const c = j?.data?.user?.contributionsCollection
    if (!c) return null
    return {
      commits: c.totalCommitContributions ?? 0,
      prs: c.totalPullRequestContributions ?? 0,
      reviews: c.totalPullRequestReviewContributions ?? 0,
      issues: c.totalIssueContributions ?? 0,
      reposContributed: c.totalRepositoriesWithContributedCommits ?? 0,
    }
  } catch {
    return null
  }
}

/** Last ~2 years of activity = sum of two consecutive 12-month windows. */
async function recentActivity(login: string): Promise<GithubActivity | null> {
  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
  const [y1, y2] = await Promise.all([
    contributions(login, oneYearAgo.toISOString(), now.toISOString()),
    contributions(login, twoYearsAgo.toISOString(), oneYearAgo.toISOString()),
  ])
  if (!y1 && !y2) return null
  const a = y1 ?? { commits: 0, prs: 0, reviews: 0, issues: 0, reposContributed: 0 }
  const b = y2 ?? { commits: 0, prs: 0, reviews: 0, issues: 0, reposContributed: 0 }
  return {
    commits: a.commits + b.commits,
    prs: a.prs + b.prs,
    reviews: a.reviews + b.reviews,
    issues: a.issues + b.issues,
    reposContributed: Math.max(a.reposContributed, b.reposContributed),
  }
}

export async function getGithubProfile(login: string): Promise<GithubProfile | null> {
  if (!login) return null
  let p: any
  try {
    const res = await fetch(`${GITHUB_API}/users/${encodeURIComponent(login)}`, { headers: ghHeaders() })
    if (!res.ok) return null
    p = await res.json()
    if (!p?.login) return null
  } catch {
    return null
  }

  const [prsAuthored, prsMerged, issuesOpened, repoStats, activity, achievements] = await Promise.all([
    searchCount(`author:${login} type:pr`),
    searchCount(`author:${login} type:pr is:merged`),
    searchCount(`author:${login} type:issue`),
    ownedRepoStats(login),
    recentActivity(login),
    getAchievements(login),
  ])

  return {
    login: p.login,
    name: p.name || undefined,
    avatarUrl: p.avatar_url || undefined,
    bio: p.bio || undefined,
    company: p.company || undefined,
    location: p.location || undefined,
    blog: p.blog || undefined,
    twitter: p.twitter_username || undefined,
    followers: p.followers ?? 0,
    following: p.following ?? 0,
    publicRepos: p.public_repos ?? 0,
    createdAt: p.created_at || undefined,
    prsAuthored,
    prsMerged,
    issuesOpened,
    starsReceived: repoStats.stars,
    topLanguages: repoStats.languages,
    activity,
    achievements,
  }
}
