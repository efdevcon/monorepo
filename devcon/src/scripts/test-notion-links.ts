/**
 * Smoke-test the Notion links service used by /api/links/.
 *
 *   tsx src/scripts/test-notion-links.ts
 *
 * Requires NOTION_SECRET / NOTION_LINKS_DB_ID / SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY in .env. Network test by design: hits the real
 * Notion DB (seeded by ens-page's setup script) and Supabase Storage.
 */
import 'dotenv/config'
import { strict as assert } from 'node:assert'
import { fetchNotionLinks } from 'services/notion-links'

async function main() {
  const links = await fetchNotionLinks()
  console.log(JSON.stringify(links, null, 2))

  assert.ok(Array.isArray(links) && links.length >= 1, 'expected at least the seeded row')
  for (const link of links) {
    assert.equal(typeof link.title, 'string')
    assert.ok(link.title.length > 0)
    assert.ok(/^https?:\/\//.test(link.url))
    assert.equal(typeof link.order, 'number')
    // Images must be stable URLs: either the Supabase public bucket or an
    // external URL, never an expiring prod-files-secure.s3 Notion URL.
    if (link.image) {
      assert.ok(!link.image.includes('prod-files-secure'), 'expiring Notion URL leaked through')
      assert.ok(/^https?:\/\//.test(link.image))
    }
  }
  const orders = links.map(l => l.order)
  assert.deepEqual(
    orders,
    [...orders].sort((a, b) => a - b),
    'links sorted by order'
  )

  console.log('test-notion-links: all assertions passed')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
