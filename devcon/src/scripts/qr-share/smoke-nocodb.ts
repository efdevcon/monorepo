// Round trip against the real tables, development env only. Leaves the row closed.
// Run: pnpm exec tsx src/scripts/qr-share/smoke-nocodb.ts
import 'dotenv/config'
import assert from 'node:assert/strict'
import {
  createShare,
  activateShare,
  getShareByToken,
  getActiveShare,
  listShares,
  updateShare,
  listLinks,
  newToken,
} from '../../services/qr-shares'

async function main() {
  const env = 'development'
  const token = newToken()
  const created = await createShare({
    token,
    kind: 'links',
    voucherCode: null,
    targetUrl: null,
    links: [{ label: 'smoke', url: 'https://devcon.org/' }],
    title: 'smoke test',
    description: null,
    price: null,
    priceEth: null,
    priceFiat: null,
    env,
    maxUsages: 0,
    redemptions: 0,
  })
  assert.equal(created.token, token)
  assert.equal(created.status, 'open')
  await activateShare(created.id, env)
  const active = await getActiveShare(env)
  assert.equal(active?.id, created.id)
  const byToken = await getShareByToken(token, env)
  assert.equal(byToken?.links[0].label, 'smoke')
  await updateShare(created.id, { status: 'scanned', scanCount: 1, scannedAt: new Date().toISOString() })
  const after = await getShareByToken(token, env)
  assert.equal(after?.status, 'scanned')
  assert.equal(after?.scanCount, 1)
  await updateShare(created.id, { status: 'closed', active: false })
  assert.equal(await getActiveShare(env), null)
  assert.ok((await listShares(env)).some(s => s.id === created.id))
  console.log('links table rows:', (await listLinks()).length)
  console.log('ok nocodb round trip, row', created.id, 'left closed')
}
main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
