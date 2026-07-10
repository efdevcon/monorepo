/**
 * Manually populate the GitHub scoring fields for a builder record — for rows
 * submitted without a connected GitHub, or to refresh the match.
 *
 * Runs the real pipeline (pull contributed repos -> score against the
 * lists) and writes GitHub Username / Matched Repos
 * / Matched Repos / Matched Count / Match Source back to the NocoDB row.
 *
 * Usage: npx tsx src/scripts/builder/backfill-github.ts <recordId> <githubUsername>
 */
import 'dotenv/config'
import { getContributions } from '../../services/builder/github-contributions'
import { scoreBuilder } from '../../services/builder/scoring'
import { parseRepoList } from '../../services/builder/repo-ref'
import { getRowById, updateRow } from '../../services/nocodb'

const VIEW_ID = 'vwmee9a1l1dyqg34'

async function listIds(): Promise<string> {
  const base = (process.env.NOCODB_BASE_URL || '').replace(/\/$/, '')
  try {
    const res = await fetch(`${base}/api/v2/tables/mj5drwikc8fxslp/records?limit=100&fields=Id,GitHub%20Username`, {
      headers: { 'xc-token': process.env.NOCODB_API_TOKEN || '' },
    })
    const j: any = await res.json()
    return (j.list ?? []).map((r: any) => `${r.Id} (${r['GitHub Username'] || '—'})`).join(', ')
  } catch {
    return '(could not list)'
  }
}

async function main() {
  const id = Number(process.argv[2])
  const username = (process.argv[3] || '').trim()
  if (!Number.isFinite(id) || id <= 0 || !username) {
    console.error('Usage: npx tsx src/scripts/builder/backfill-github.ts <recordId> <githubUsername>')
    process.exit(1)
  }

  const existing = await getRowById(VIEW_ID, id)
  if (!existing) {
    console.error(`No builder record with Id ${id}. Existing records: ${await listIds()}`)
    process.exit(1)
  }

  console.log(`Scoring GitHub "${username}" for builder record #${id}…`)
  const { repos: contributedRepos, notableCandidates } = await getContributions(username)
  console.log(`  pulled ${contributedRepos.size} contributed repos`)

  // Merge with the applicant's manually-entered "Contributed Repos" so the
  // backfill doesn't drop claimed repos that submit-time scoring captured.
  const claimedRepos = parseRepoList(typeof existing['Contributed Repos'] === 'string' ? existing['Contributed Repos'] : '')
  if (claimedRepos.length) console.log(`  + ${claimedRepos.length} manually-claimed repos from the form: ${claimedRepos.join(', ')}`)

  const score = await scoreBuilder({ githubUsername: username, contributedRepos, claimedRepos, notableRepos: notableCandidates })
  console.log(`  match summary: ${score.matchSource}`)
  console.log(`  matched repos:`)
  for (const r of score.matchedRepos) {
    console.log(`    - ${r.repo} [${r.source}${r.list ? '/' + r.list : ''}${typeof r.stars === 'number' ? `, ${r.stars}★` : ''}]`)
  }

  await updateRow(VIEW_ID, id, {
    'GitHub Username': username,
    'Matched Repos': JSON.stringify(score.matchedRepos),
    'Matched Count': score.matchedCount,
    'Match Source': score.matchSource,
  })
  console.log(`Done — updated NocoDB row #${id}.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
