/**
 * One-time setup for the Builder Application form.
 * Creates the table columns + the form-config row via the NocoDB meta/records API.
 * Idempotent: skips columns/rows that already exist.
 *
 * Run with: npx tsx src/scripts/builder/setup-nocodb.ts
 */
import 'dotenv/config'
import { configureFormView } from './configure-form-view'

const BASE_URL = (process.env.NOCODB_BASE_URL || '').replace(/\/$/, '')
const TOKEN = process.env.NOCODB_API_TOKEN || ''

const TABLE_ID = 'mj5drwikc8fxslp' // Builder Application
const FORM_VIEW_ID = 'vwmee9a1l1dyqg34'
const FORM_CONFIG_TABLE_ID = 'mz6lcse5kfidb23'
const FORM_SLUG = 'builder-application'

if (!BASE_URL || !TOKEN) {
  console.error('Missing NOCODB_BASE_URL or NOCODB_API_TOKEN')
  process.exit(1)
}

const headers = { 'xc-token': TOKEN, 'Content-Type': 'application/json' }

interface ColDef {
  title: string
  uidt: string
  options?: string[]
}

const COLUMNS: ColDef[] = [
  // Applicant
  { title: 'Email', uidt: 'Email' },
  { title: 'Full Name', uidt: 'SingleLineText' },
  { title: 'Country', uidt: 'SingleLineText' },
  {
    title: 'Role',
    uidt: 'MultiSelect',
    options: [
      'Developer',
      'Researcher',
      'Designer',
      'Marketing',
      'Entrepreneur / Independent',
      'Founder / Co-Founder',
      'Human Resources',
      'Social / Community Enthusiast',
      'Product Lead',
      'Artist',
      'Other',
    ],
  },
  { title: 'Other Role', uidt: 'SingleLineText' },
  { title: 'Team', uidt: 'SingleLineText' },
  { title: 'GitHub Username', uidt: 'SingleLineText' },
  { title: 'Contributed Repos', uidt: 'LongText' },
  { title: 'Talent Protocol URL', uidt: 'URL' },
  { title: 'Devfolio URL', uidt: 'URL' },
  { title: 'POAP URL', uidt: 'URL' },
  { title: 'Personal Website', uidt: 'URL' },
  { title: 'Social URL', uidt: 'URL' },
  { title: 'Wallet Address', uidt: 'SingleLineText' },
  { title: 'Why Ethereum', uidt: 'LongText' },
  { title: 'Goals', uidt: 'LongText' },
  { title: 'Gender', uidt: 'SingleLineText' },
  // Script / admin
  { title: 'Past Devcon POAPs', uidt: 'SingleLineText' },
  { title: 'Matched Repos', uidt: 'LongText' },
  { title: 'Matched Count', uidt: 'Number' },
  { title: 'Match Source', uidt: 'SingleLineText' },
  { title: 'Decision', uidt: 'SingleSelect', options: ['Pending', 'Approved', 'Rejected'] },
  { title: 'Voucher Sent', uidt: 'Checkbox' },
  { title: 'Voucher Code', uidt: 'SingleLineText' },
  { title: 'Submission Date', uidt: 'DateTime' },
]

// devcon.org host for the admin review link (formula column). Override via
// BUILDER_REVIEW_BASE_URL if needed (e.g. a staging host).
const REVIEW_BASE_URL = (process.env.BUILDER_REVIEW_BASE_URL || 'https://devcon.org').replace(/\/$/, '')

async function getExistingColumns(): Promise<Array<{ id: string; title: string; uidt: string }>> {
  let res = await fetch(`${BASE_URL}/api/v2/meta/tables/${TABLE_ID}`, { headers })
  if (!res.ok) res = await fetch(`${BASE_URL}/api/v1/db/meta/tables/${TABLE_ID}`, { headers })
  if (!res.ok) throw new Error(`Cannot read table meta: ${res.status}`)
  const j: any = await res.json()
  return (j.columns ?? []).map((c: any) => ({ id: c.id, title: c.title, uidt: c.uidt }))
}

async function deleteColumn(id: string): Promise<void> {
  let res = await fetch(`${BASE_URL}/api/v2/meta/columns/${id}`, { method: 'DELETE', headers })
  if (!res.ok) res = await fetch(`${BASE_URL}/api/v1/db/meta/columns/${id}`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error(`delete column ${id} failed: ${res.status} ${await res.text()}`)
}

// Self-heal column TYPE drift: if a column exists with a uidt different from what
// COLUMNS declares (e.g. Gender created as SingleSelect but now declared
// SingleLineText), drop it so the create loop re-creates it with the right type.
// Only safe before any submissions exist.
async function reconcileColumnTypes(existing: Array<{ id: string; title: string; uidt: string }>): Promise<void> {
  const desiredByTitle = new Map(COLUMNS.map((c) => [c.title, c.uidt]))
  for (const col of existing) {
    const desired = desiredByTitle.get(col.title)
    if (desired && desired !== col.uidt) {
      await deleteColumn(col.id)
      console.log(`  ~ dropped "${col.title}" (${col.uidt}) to recreate as ${desired}`)
    }
  }
}

async function createColumn(col: ColDef): Promise<void> {
  const body: any = { title: col.title, uidt: col.uidt }
  if ((col.uidt === 'SingleSelect' || col.uidt === 'MultiSelect') && col.options) {
    body.colOptions = { options: col.options.map((title) => ({ title })) }
    body.dtxp = col.options.map((o) => `'${o}'`).join(',')
  }
  // v2 meta first, fall back to v1.
  let res = await fetch(`${BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    res = await fetch(`${BASE_URL}/api/v1/db/meta/tables/${TABLE_ID}/columns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`create "${col.title}" failed: ${res.status} ${text}`)
  }
  console.log(`  + created: ${col.title} (${col.uidt})`)
}

// Best-effort: a formula column that renders the admin review link per row.
// Formula column creation is NocoDB-version-sensitive; on failure we log and
// continue (admins can still open /builder-review/<Id> by hand).
async function ensureReviewLinkColumn(existingTitles: Set<string>): Promise<void> {
  if (existingTitles.has('Review')) {
    console.log('  = exists: Review')
    return
  }
  const formula = `CONCAT("${REVIEW_BASE_URL}/builder-review/", {Id})`
  const body = { title: 'Review', uidt: 'Formula', formula_raw: formula, formula }
  let res = await fetch(`${BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    res = await fetch(`${BASE_URL}/api/v1/db/meta/tables/${TABLE_ID}/columns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }
  if (!res.ok) {
    console.warn(`  ! could not create "Review" formula column (${res.status}): ${await res.text()}`)
    console.warn('    Add it manually in NocoDB, or open /builder-review/<Id> directly.')
    return
  }
  console.log('  + created: Review (Formula link)')
}

async function ensureFormConfigRow(): Promise<void> {
  const listRes = await fetch(`${BASE_URL}/api/v2/tables/${FORM_CONFIG_TABLE_ID}/records?limit=200`, { headers })
  if (listRes.ok) {
    const j: any = await listRes.json()
    const existing = (j.list ?? []).find((r: any) => r['Form Slug'] === FORM_SLUG)
    if (existing) {
      console.log(`  form-config row for "${FORM_SLUG}" already exists (Id ${existing.Id}) — skipping`)
      return
    }
  }
  const res = await fetch(`${BASE_URL}/api/v2/tables/${FORM_CONFIG_TABLE_ID}/records`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      'Form Slug': FORM_SLUG,
      'Form View ID': FORM_VIEW_ID,
      'Requires OTP': 'Yes',
      'Is Form Open': true,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`create form-config row failed: ${res.status} ${text}`)
  }
  console.log(`  + created form-config row for "${FORM_SLUG}"`)
}

// Columns from earlier iterations that should no longer exist (e.g. First/Last
// Name merged into a single Full Name). Dropped if present — safe pre-launch.
const OBSOLETE_COLUMNS = ['First Name', 'Last Name', 'Student or Educator', 'Known Contributor']

async function main() {
  console.log('=== Builder Application NocoDB setup ===')
  let existing = await getExistingColumns()
  console.log(`Existing columns: ${existing.map((c) => c.title).join(', ')}`)

  // Drop obsolete columns, then fix any type drift, then re-read.
  for (const c of existing.filter((c) => OBSOLETE_COLUMNS.includes(c.title))) {
    await deleteColumn(c.id)
    console.log(`  ~ dropped obsolete column "${c.title}"`)
  }
  await reconcileColumnTypes(existing)
  existing = await getExistingColumns()
  const existingTitles = new Set(existing.map((c) => c.title))

  for (const col of COLUMNS) {
    if (existingTitles.has(col.title)) {
      console.log(`  = exists: ${col.title}`)
      continue
    }
    await createColumn(col)
  }

  console.log('--- review link column ---')
  await ensureReviewLinkColumn(new Set(existing.map((c) => c.title)))

  console.log('--- form config ---')
  await ensureFormConfigRow()

  console.log('--- form view visibility ---')
  await configureFormView()

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
