/**
 * Smoke-test the /api/links/ route end to end.
 *
 *   tsx src/scripts/test-links-api.ts [base-url]
 *
 * Defaults to http://localhost:3000 (run `pnpm dev` first). Pass
 * https://devcon.org to verify production after deploy.
 */
import 'dotenv/config'
import { strict as assert } from 'node:assert'

async function main() {
  const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')

  const res = await fetch(`${base}/api/links/`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('access-control-allow-origin'), '*', 'CORS must be open for eth.limo')
  assert.ok(res.headers.get('cache-control')?.includes('s-maxage=3600'), 'CDN cache header missing')

  const data = await res.json()
  assert.equal(data.success, true)
  assert.ok(Array.isArray(data.links) && data.links.length >= 1)
  for (const link of data.links) {
    assert.equal(typeof link.title, 'string')
    assert.ok(/^https?:\/\//.test(link.url))
    assert.equal(typeof link.order, 'number')
    if (link.image) assert.ok(!link.image.includes('prod-files-secure'), 'expiring Notion URL leaked through')
  }

  const fresh = await fetch(`${base}/api/links/refresh/`)
  assert.equal(fresh.status, 200)
  assert.ok(fresh.headers.get('cache-control')?.includes('no-store'), 'refresh must bypass caching')
  const freshData = await fresh.json()
  assert.equal(freshData.success, true)

  const preview = await fetch(`${base}/api/links/preview/`)
  assert.equal(preview.status, 200)
  assert.ok(preview.headers.get('cache-control')?.includes('no-store'), 'preview must bypass caching')
  const previewData = await preview.json()
  assert.equal(previewData.success, true)
  for (const link of previewData.links) assert.ok(link.id, 'links must carry their Notion page id')

  // Click counter: bad ids are rejected without touching data. (A real
  // increment is verified manually to avoid polluting the counters.)
  const badClick = await fetch(`${base}/api/links/click/?id=00000000000000000000000000000000`, { method: 'POST' })
  assert.equal(badClick.status, 404)
  const noId = await fetch(`${base}/api/links/click/`, { method: 'POST' })
  assert.equal(noId.status, 400)

  const freshHtml = await fetch(`${base}/api/links/refresh/`, { headers: { accept: 'text/html' } })
  assert.ok((await freshHtml.text()).includes('Links refreshed'), 'browser requests get the HTML confirmation')

  console.log(`test-links-api: all assertions passed against ${base} (${data.links.length} links)`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
