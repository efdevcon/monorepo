/**
 * Pull the datasets that are GENERATED in the sibling `discounts` repo into this
 * repo. devcon owns where these files live; this is the single place that maps
 * a discounts-repo output to its in-repo destination.
 *
 * Run from the devcon repo root AFTER regenerating the sources in ../discounts:
 *
 *   # in ../discounts (regenerate whichever you changed)
 *   bun run core | bun run github | bun run pg | bun run poap
 *   .venv-oso/bin/python src/oso_repos.py
 *
 *   # then here
 *   pnpm sync:discount-data            # copy outputs into this repo
 *   pnpm sync:discount-data --check    # report drift only, no writes (CI guard)
 *
 * NOTE: files built by devcon's OWN scripts (core-ecosystem-repos,
 * devcon-poap-attendees, ethglobal-projects-by-repo) are not handled here;
 * regenerate those with src/scripts/builder/build-*.ts.
 */

import fs from 'fs'
import path from 'path'

const DISCOUNTS_OUTPUTS = path.resolve(process.cwd(), '../discounts/outputs')

// from (within discounts/outputs)  ->  to (within this repo).
// The poap output is renamed to match what the discount validator imports.
const MANIFEST: { from: string; to: string }[] = [
  // Discount-eligibility lists, consumed by /api/discounts/* (src/discounts/).
  { from: 'core-devs.json', to: 'src/discounts/core-devs.json' },
  { from: 'oss-contributors.json', to: 'src/discounts/oss-contributors.json' },
  { from: 'pg-projects.json', to: 'src/discounts/pg-projects.json' },
  { from: 'poap-past-attendees.json', to: 'src/discounts/past-attendees.json' },
  // Builder scoring repo lists, consumed by services/builder/list.ts (src/data/).
  { from: 'oso-web2-oss-repos.json', to: 'src/data/oso-web2-oss-repos.json' },
  { from: 'oso-web3-repos.json', to: 'src/data/oso-web3-repos.json' },
]

const CHECK = process.argv.includes('--check')

function sameContent(a: string, b: string): boolean {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false
  const sa = fs.statSync(a)
  const sb = fs.statSync(b)
  if (sa.size !== sb.size) return false
  return fs.readFileSync(a).equals(fs.readFileSync(b))
}

function main() {
  if (!fs.existsSync(DISCOUNTS_OUTPUTS)) {
    console.error(`✗ discounts outputs not found: ${DISCOUNTS_OUTPUTS}`)
    console.error('  Expected the `discounts` repo as a sibling of this one, run from the devcon repo root.')
    process.exit(1)
  }

  const missing: string[] = []
  const drifted: string[] = []
  let synced = 0

  for (const { from, to } of MANIFEST) {
    const src = path.join(DISCOUNTS_OUTPUTS, from)
    const dest = path.resolve(process.cwd(), to)

    if (!fs.existsSync(src)) {
      missing.push(from)
      console.warn(`⚠ missing source, skipped: ${from}`)
      continue
    }

    if (CHECK) {
      if (sameContent(src, dest)) {
        console.log(`✓ up to date: ${to}`)
      } else {
        drifted.push(to)
        console.log(`✗ out of sync: ${to}`)
      }
      continue
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    synced++
    console.log(`✓ ${from} → ${to}`)
  }

  if (CHECK) {
    console.log(`\n${drifted.length} of ${MANIFEST.length} file(s) out of sync.`)
    if (drifted.length || missing.length) process.exit(1)
    return
  }

  console.log(`\nSynced ${synced}/${MANIFEST.length} file(s) from ../discounts/outputs.`)
  if (missing.length) {
    console.error(`Missing ${missing.length} source(s): ${missing.join(', ')}`)
    console.error('Regenerate them in ../discounts first (see src/discounts/README.md / src/data/README.md).')
    process.exit(1)
  }
}

main()
