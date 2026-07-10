/**
 * Read-only: inspect the Builder Application table columns + the Form view's
 * per-field visibility, so we can see which fields are (incorrectly) shown.
 * Run with: npx tsx src/scripts/builder/inspect-nocodb.ts
 */
import 'dotenv/config'

const BASE_URL = (process.env.NOCODB_BASE_URL || '').replace(/\/$/, '')
const TOKEN = process.env.NOCODB_API_TOKEN || ''
const TABLE_ID = 'mj5drwikc8fxslp'
const FORM_VIEW_ID = 'vwmee9a1l1dyqg34'
const FORM_CONFIG_TABLE_ID = 'mz6lcse5kfidb23'

if (!BASE_URL || !TOKEN) {
  console.error('Missing NOCODB_BASE_URL or NOCODB_API_TOKEN')
  process.exit(1)
}
const headers = { 'xc-token': TOKEN }

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

async function main() {
  console.log('=== Table columns ===')
  let tableMeta: any
  try {
    tableMeta = await getJson(`${BASE_URL}/api/v2/meta/tables/${TABLE_ID}`)
  } catch {
    tableMeta = await getJson(`${BASE_URL}/api/v1/db/meta/tables/${TABLE_ID}`)
  }
  for (const c of tableMeta.columns ?? []) {
    console.log(`  ${c.title}  [${c.uidt}]  id=${c.id}`)
  }

  console.log('\n=== Form view fields (show flag) ===')
  let form: any
  try {
    form = await getJson(`${BASE_URL}/api/v2/meta/forms/${FORM_VIEW_ID}`)
  } catch {
    form = await getJson(`${BASE_URL}/api/v1/db/meta/forms/${FORM_VIEW_ID}`)
  }
  const cols = form.columns ?? []
  for (const fc of cols) {
    // Map fk_column_id back to a title via tableMeta
    const tcol = (tableMeta.columns ?? []).find((c: any) => c.id === fc.fk_column_id)
    const title = tcol?.title ?? fc.title ?? fc.label ?? '(unknown)'
    const desc = fc.description ? ` desc="${String(fc.description).slice(0, 60)}${String(fc.description).length > 60 ? '…' : ''}"` : ''
    console.log(`  show=${fc.show}  order=${fc.order}  required=${fc.required}  "${title}"${desc}`)
  }

  console.log('\n=== form conditional rules (filters) ===')
  try {
    const filters = await getJson(`${BASE_URL}/api/v1/db/meta/views/${FORM_VIEW_ID}/filters`)
    for (const f of filters.list ?? []) {
      const target = (tableMeta.columns ?? []).find((c: any) => c.id === f.fk_parent_column_id)?.title
      const source = (tableMeta.columns ?? []).find((c: any) => c.id === f.fk_column_id)?.title
      console.log(`  show "${target}" when "${source}" ${f.comparison_op} ${JSON.stringify(f.value)} (logical=${f.logical_op})`)
    }
  } catch (e) {
    console.log('  (could not read filters)', (e as Error).message)
  }

  console.log('\n=== form-config rows for builder-application ===')
  const recs = await getJson(`${BASE_URL}/api/v2/tables/${FORM_CONFIG_TABLE_ID}/records?limit=200`)
  for (const r of (recs.list ?? []).filter((r: any) => r['Form Slug'] === 'builder-application')) {
    console.log(' ', JSON.stringify(r))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
