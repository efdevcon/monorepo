import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getContributions } from 'services/builder/github-contributions'
import { scoreBuilder } from 'services/builder/scoring'
import { matchEthglobalProjects } from 'services/builder/ethglobal'

// Returns the connected GitHub user's recognized repos so the form can prefill
// the Contributed Repos field: list/core matches PLUS any ETHGlobal
// hackathon projects detected from their contributions. Identity comes from the
// NextAuth GitHub session — never from the client. Always returns 200 with a
// (possibly empty) repos array so the widget can prefill best-effort.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (session?.type !== 'github' || !session.id) {
      res.status(200).json({ success: true, repos: [] })
      return
    }
    const { repos: contributedRepos, notableCandidates } = await getContributions(session.id)
    const score = await scoreBuilder({
      githubUsername: session.id,
      contributedRepos,
      claimedRepos: [],
      notableRepos: notableCandidates,
    })
    const ethglobalRepos = matchEthglobalProjects(contributedRepos).map(p => p.repo)
    // Union of list/core matches + detected ETHGlobal project repos, deduped.
    const repos = [...new Set([...score.matchedRepos.map(m => m.repo), ...ethglobalRepos])]
    res.status(200).json({ success: true, repos, count: repos.length })
  } catch (e: unknown) {
    res.status(200).json({ success: true, repos: [], error: (e as Error)?.message })
  }
}
