/**
 * Test (or perform) an AV day-of enrichment write via PUT /sessions/sources/:id.
 *
 * Two modes:
 *
 *   pnpm av:test-write
 *     Round-trip smoke test against a test-devcon-8 session: reads the current
 *     sources_youtubeId, sets a marker value, verifies, reverts, verifies.
 *     Healthy pipeline = both PUTs return 204 AND two `[skip deploy]` commits
 *     appear on main under data/sessions/test-devcon-8/ within a minute.
 *     A 500 with the value still changing in memory means CommitSession is
 *     failing (see docs/av/av-stack-overview.md blocker #10) — the write will
 *     NOT survive a restart/deploy/resync.
 *
 *   pnpm av:test-write <sessionId> <field> <value>
 *     Single real update, no revert. Field must be one the endpoint accepts:
 *     sources_youtubeId, sources_ipfsHash, sources_swarmHash,
 *     sources_livepeerId, sources_streamethId, transcript_vtt,
 *     transcript_text, duration.
 *
 * Auth: first key of API_KEYS in .env (same list the Render service uses).
 * Target: DEVCON_API_URL env override, default https://api.devcon.org.
 */
import 'dotenv/config'

const BASE = process.env.DEVCON_API_URL || 'https://api.devcon.org'
const TEST_SESSION = 'a-dacc-vision-for-decentralized-ai' // test-devcon-8
const MARKER = 'jNQXAC9IVRw'

const apiKey = (process.env.API_KEYS || '').split(',')[0]?.trim()
if (!apiKey) {
  console.error('API_KEYS not set in .env')
  process.exit(1)
}

async function getSession(id: string) {
  // Unique query param per read: /sessions/:id is edge-cached for 60s
  // (Render Edge Caching, 2026-08-19), and this GET verifies a write made
  // moments ago — a cached response would read the pre-write payload and
  // fail the smoke test. A fresh cache key forces an origin fetch.
  const res = await fetch(`${BASE}/sessions/${id}?_=${Date.now()}`)
  if (!res.ok) throw new Error(`GET /sessions/${id} -> ${res.status}`)
  return (await res.json()).data
}

async function putSources(id: string, body: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${BASE}/sessions/sources/${id}`, {
    method: 'PUT',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.status
}

async function main() {
  const [sessionId, field, value] = process.argv.slice(2)

  if (sessionId && field !== undefined && value !== undefined) {
    // Real single update
    const before = await getSession(sessionId)
    console.log(`before: ${field} =`, JSON.stringify(before[field] ?? null))
    const status = await putSources(sessionId, { [field]: field === 'duration' ? Number(value) : value })
    console.log(`PUT ${field}=${value} -> HTTP ${status} ${status === 204 ? '(ok)' : '(FAILED — check Render logs)'}`)
    const after = await getSession(sessionId)
    console.log(`after:  ${field} =`, JSON.stringify(after[field] ?? null))
    process.exit(status === 204 ? 0 : 1)
  }

  // Round-trip smoke test
  console.log(`Smoke test against ${BASE} using session ${TEST_SESSION}`)
  const before = await getSession(TEST_SESSION)
  // Session ids are not unique across events (test events are cloned from
  // real ones). Refuse to write if the id resolves to a real event — a
  // resolution regression here once wiped a devcon-7 archive session.
  if (before.eventId !== 'test-devcon-8') {
    console.error(`ABORT: session resolves to event '${before.eventId}', not test-devcon-8 — writing would touch real event data`)
    process.exit(1)
  }
  console.log('1. before: youtubeId =', JSON.stringify(before.sources_youtubeId ?? null))
  const s1 = await putSources(TEST_SESSION, { sources_youtubeId: MARKER })
  console.log(`2. PUT sources_youtubeId=${MARKER} -> HTTP ${s1}`)
  const after = await getSession(TEST_SESSION)
  console.log('3. after:  youtubeId =', JSON.stringify(after.sources_youtubeId ?? null))
  const s2 = await putSources(TEST_SESSION, { sources_youtubeId: before.sources_youtubeId ?? '' })
  console.log(`4. revert -> HTTP ${s2}`)
  const reverted = await getSession(TEST_SESSION)
  console.log('5. reverted: youtubeId =', JSON.stringify(reverted.sources_youtubeId ?? null))

  const ok = s1 === 204 && s2 === 204
  console.log(
    ok
      ? 'PASS: both writes returned 204 — now confirm two [skip deploy] commits landed on main (data/sessions/test-devcon-8/)'
      : 'FAIL: PUT returned non-204 — memory updated but git persistence failed; enrichment would be lost on restart. Check Render logs + GITHUB_TOKEN.'
  )
  process.exit(ok ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
