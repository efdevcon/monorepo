/**
 * Build src/data/ethglobal-projects-by-repo.json — a map of
 *   lowercased "owner/name" -> [{ title, event, url, prizes[], finalist }]
 * from the ethglobal-skills dataset (17k+ hackathon projects). Lets us detect,
 * by cross-referencing an applicant's GitHub contributions, which ETHGlobal
 * projects they built and whether any were finalists / prize winners — without
 * any ETHGlobal auth or a new form field.
 *
 * Source: https://github.com/ethglobal-skills/repo (projects_full.json, ~50MB).
 * Run from the devcon repo root: npx tsx src/scripts/builder/build-ethglobal-index.ts
 */
import fs from 'fs'
import path from 'path'
import { normalizeRepoRef } from '../../services/builder/repo-ref'
import { lookupRepo } from '../../services/builder/list'

const SRC_URL = 'https://raw.githubusercontent.com/ethglobal-skills/repo/main/scraper/data/projects_full.json'
const OUT_FILE = path.resolve(process.cwd(), 'src/data/ethglobal-projects-by-repo.json')

interface IndexEntry {
  title: string
  event: string
  url: string
  prizes: string[]
  finalist: boolean
}

async function main() {
  console.log('Downloading ETHGlobal projects dataset (~50MB)…')
  const res = await fetch(SRC_URL)
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  const data: any = await res.json()
  const projects: any[] = Array.isArray(data) ? data : data?.projects ?? []
  console.log(`  ${projects.length} projects`)

  const index: Record<string, IndexEntry[]> = {}
  let mapped = 0
  let finalists = 0
  let skippedListed = 0
  let skippedSubresource = 0
  // Sub-resource URLs (e.g. /issues/294, /pull/12) reference a repo — usually an
  // UPSTREAM one the project touched — not the team's own repo. Skip them, or we
  // falsely match everyone who ever contributed to that upstream repo.
  const SUBRESOURCE = /\/(issues|pull|commit|commits|compare|discussions|wiki|releases|blob)\//i
  for (const p of projects) {
    if (!p?.github) continue
    if (SUBRESOURCE.test(String(p.github))) {
      skippedSubresource++
      continue
    }
    const repo = normalizeRepoRef(String(p.github))
    if (!repo) continue
    // Real hackathon repos are never established/listed projects. A project
    // pointing at a listed repo (e.g. a placeholder like ethereum/ethereum-org-website)
    // is bad data — skip it so we don't falsely match everyone who touched that repo.
    if (lookupRepo(repo)) {
      skippedListed++
      continue
    }
    const prizes: string[] = Array.isArray(p.prizes)
      ? p.prizes.map((x: any) => x?.prize_title).filter(Boolean)
      : []
    const finalist = prizes.some((t: string) => /finalist/i.test(t))
    if (finalist) finalists++
    const entry: IndexEntry = { title: p.title, event: p.event, url: p.url, prizes, finalist }
    ;(index[repo] ||= []).push(entry)
    mapped++
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(index))
  console.log(`Indexed ${Object.keys(index).length} repos (${mapped} entries, ${finalists} finalist; skipped ${skippedListed} listed, ${skippedSubresource} sub-resource URLs) -> ${OUT_FILE}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
