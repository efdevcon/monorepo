/**
 * Release a new Pretalx schedule version via the API — the fallback for when
 * the Pretalx UI "publish new version" times out (it routinely does; the API
 * release endpoint returns 201 in a few seconds).
 *
 *   pnpm pretalx:release [version|list] [event]
 *
 *   pnpm pretalx:release            # release the next number (0.16 -> 0.17)
 *   pnpm pretalx:release 1.0        # explicit version override
 *   pnpm pretalx:release list       # read-only: list versions + what's next
 *   pnpm pretalx:release list devcon8
 *
 * Version names are free-form in Pretalx but we use numbers (0.15, 0.16, …);
 * auto-increment bumps the minor of the highest numeric version and ignores
 * text ones (cleanup-dummies, av-pipeline-test). Pretalx only mints a release
 * if the WIP schedule differs from the latest release — an unchanged schedule
 * 400s, that's expected.
 *
 * After the release Pretalx fires the schedule webhook: devcon-api re-syncs
 * in memory and dispatches the GitHub sync workflow, which commits the data
 * change to main. The script only confirms the Pretalx side (release created
 * + public widget serving it); watch the Actions run for the git commit.
 *
 * Auth: PRETALX_API_KEY_WRITE in .env (the read-only PRETALX_API_KEY can't
 * release). The token is never printed.
 */
import 'dotenv/config'

const BASE = 'https://cfp.devcon.org/api'
const WIDGET_BASE = 'https://cfp.devcon.org'
const VISIBILITY_RETRIES = 15
const VISIBILITY_DELAY_MS = 8000

const versionArg = process.argv[2]
const event = process.argv[3] || 'test-devcon-8'
const listOnly = versionArg === 'list'

const token = process.env.PRETALX_API_KEY_WRITE
if (!token) {
  console.error('PRETALX_API_KEY_WRITE not set in .env')
  process.exit(1)
}
const headers = { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }

async function listVersions(): Promise<string[]> {
  const res = await fetch(`${BASE}/events/${event}/schedules/?page_size=50`, { headers })
  if (!res.ok) {
    console.error(`could not list schedules for ${event}: ${res.status}`)
    return []
  }
  const data: any = await res.json()
  return (data.results || []).map((s: any) => s.version ?? 'wip')
}

/** Next numeric version: bump the minor of the highest `major.minor` release
 *  (0.9 < 0.13 — integer parts, not float compare). No numeric ones yet → 0.1. */
function nextVersion(versions: string[]): string {
  const numeric = versions
    .map(v => v.match(/^(\d+)\.(\d+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => [Number(m[1]), Number(m[2])] as const)
  if (!numeric.length) return '0.1'
  const [major, minor] = numeric.reduce((a, b) => (b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a))
  return `${major}.${minor + 1}`
}

async function main() {
  const versions = await listVersions()
  console.log(`event: ${event}`)
  console.log(`existing schedules: ${versions.join(', ') || '(none)'}`)

  const version = !versionArg || listOnly ? nextVersion(versions) : versionArg
  if (listOnly) {
    console.log(`next auto version: ${version} — nothing released`)
    return
  }
  if (versions.includes(version)) {
    console.error(`version "${version}" already exists — pick the next number`)
    process.exit(1)
  }

  console.log(`releasing version "${version}" ...`)
  const res = await fetch(`${BASE}/events/${event}/schedules/release/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ version, comment: '' }),
  })
  if (!res.ok) {
    console.error(`release failed: ${res.status}`)
    console.error((await res.text()).slice(0, 500))
    process.exit(1)
  }
  console.log('release created (201)')

  // The public widget can lag the release by ~35s (occasionally minutes) —
  // the same visibility race the webhook's sync guard budgets for.
  for (let i = 1; i <= VISIBILITY_RETRIES; i++) {
    await new Promise(r => setTimeout(r, VISIBILITY_DELAY_MS))
    const w = await fetch(`${WIDGET_BASE}/${event}/schedule/widgets/schedule.json`, { cache: 'no-store' })
    if (!w.ok) {
      console.log(`widget check ${i}/${VISIBILITY_RETRIES}: HTTP ${w.status}`)
      continue
    }
    const data: any = await w.json()
    console.log(`widget check ${i}/${VISIBILITY_RETRIES}: version=${data.version} slots=${data.talks?.length}`)
    if (data.version === version) {
      console.log('public schedule now serves the new version — webhook sync should follow within minutes')
      return
    }
  }
  console.log('release succeeded but the public widget is still serving the old version — it usually catches up within a few minutes')
}

main()
