// Verifies both QR share tables exist and carry the expected columns.
// Run: pnpm exec tsx src/scripts/qr-share/check-tables.ts
import 'dotenv/config'
import assert from 'node:assert/strict'
import { QR_SHARES_TABLE_ID, QR_LINKS_TABLE_ID } from '../../services/qr-shares'

const EXPECTED: Record<string, string[]> = {
  [QR_SHARES_TABLE_ID]: [
    'Token', 'Kind', 'VoucherCode', 'TargetUrl', 'Links', 'Title', 'Description', 'Price', 'Env', 'Active', 'Status',
    'SharedAt', 'ScannedAt', 'ScanCount', 'BrowserKey', 'Redeemed', 'LastPretixCheck', 'MaxUsages', 'Redemptions', 'PriceEth', 'PriceFiat',
  ],
  [QR_LINKS_TABLE_ID]: ['Label', 'Url', 'ShowOnRedeemPage', 'Order', 'Enabled'],
}

async function main() {
  const base = process.env.NOCODB_BASE_URL?.replace(/\/$/, '')
  const token = process.env.NOCODB_API_TOKEN
  assert(base && token, 'NOCODB_BASE_URL and NOCODB_API_TOKEN are required')
  for (const [id, columns] of Object.entries(EXPECTED)) {
    const res = await fetch(`${base}/api/v2/meta/tables/${id}`, { headers: { 'xc-token': token } })
    assert(res.ok, `table ${id}: meta read failed ${res.status}`)
    const meta = (await res.json()) as { title: string; columns: { title: string }[] }
    const have = new Set(meta.columns.map(c => c.title))
    const missing = columns.filter(c => !have.has(c))
    assert.deepEqual(missing, [], `${meta.title}: missing columns ${missing.join(', ')}`)
    console.log(`ok ${meta.title}: ${columns.length} columns present`)
  }
}
main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
