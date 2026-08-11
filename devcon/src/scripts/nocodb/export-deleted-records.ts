/**
 * Export recently deleted records from a NocoDB table by mining the record audit log.
 *
 * NocoDB Community Edition has no trash/undelete, but every record deletion writes a
 * DATA_DELETE audit row containing the full record data. This script finds deleted rows
 * (gaps in the auto-increment Id sequence, plus Ids above the current max) and pulls their
 * audit history via the internal API the NocoDB UI uses:
 *   GET /api/v2/internal/{workspaceId}/{baseId}?operation=recordAuditList&row_id=X&fk_model_id=Y
 *
 * IMPORTANT: on Community Edition this endpoint only returns audits from the LAST 7 DAYS.
 * Older audit rows still exist in the nc_audit_v2 table server-side but need direct DB access.
 *
 * When restoring an exported record via the API, note that the Id is reassigned and the
 * CreatedAt system column cannot be set (fix it with direct SQL if it matters).
 *
 * Usage:
 *   pnpm nocodb:export-deleted <nocodb-table-url> [--out <file.json>] [--above-max <n>]
 *
 * Example (paste any table URL straight from the NocoDB UI):
 *   pnpm nocodb:export-deleted https://form.devcon.org/{workspaceId}/{baseId}/{tableId}/{viewId}/my-table-grid
 *
 * Exports to generated-codes/ (gitignored) unless --out is given. Requires NOCODB_API_TOKEN in .env.
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const AUDIT_WINDOW_NOTE = 'NocoDB CE only serves audits from the last 7 days; older deletions need direct DB access'

interface AuditEntry {
  id: string
  op_type: string
  created_at: string
  user: string | null
  row_id: string
  details: string | null
}

interface DeletedRecord {
  rowId: number
  deletedAt: string
  deletedBy: string | null
  data: Record<string, unknown> | null
  auditTrail: { opType: string; at: string; by: string | null; details: unknown }[]
}

const apiToken = process.env.NOCODB_API_TOKEN
const args = process.argv.slice(2)
const urlArg = args.find(a => !a.startsWith('--'))

function argValue(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx >= 0 ? args[idx + 1] : undefined
}

if (!apiToken) {
  console.error('Error: NOCODB_API_TOKEN environment variable is not set')
  process.exit(1)
}

if (!urlArg) {
  console.error('Usage: pnpm nocodb:export-deleted <nocodb-table-url> [--out <file.json>] [--above-max <n>]')
  process.exit(1)
}

const url = new URL(urlArg)
const [workspaceId, baseId, tableId] = url.pathname.split('/').filter(Boolean)

if (!workspaceId || !baseId?.startsWith('p') || !tableId?.startsWith('m')) {
  console.error(`Could not parse workspace/base/table ids from URL path "${url.pathname}"`)
  console.error('Expected https://<host>/{workspaceId}/{baseId}/{tableId}/... as copied from the NocoDB UI')
  process.exit(1)
}

const origin = url.origin
const aboveMax = parseInt(argValue('--above-max') ?? '25', 10)

async function api<T>(pathname: string): Promise<T> {
  const res = await fetch(`${origin}${pathname}`, { headers: { 'xc-token': apiToken as string } })
  if (!res.ok) {
    throw new Error(`GET ${pathname} failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as T
}

async function getPrimaryKeyTitle(): Promise<{ tableTitle: string; pkTitle: string }> {
  const meta = await api<{ title: string; columns: { title: string; pk?: boolean; ai?: boolean; uidt: string }[] }>(
    `/api/v2/meta/tables/${tableId}`
  )
  const pk = meta.columns.find(c => c.pk)
  if (!pk || (pk.uidt !== 'ID' && !pk.ai)) {
    throw new Error(
      `Table "${meta.title}" has no auto-increment primary key; the Id-gap technique cannot find deleted rows`
    )
  }
  return { tableTitle: meta.title, pkTitle: pk.title }
}

async function getExistingIds(pkTitle: string): Promise<number[]> {
  const ids: number[] = []
  let offset = 0
  for (;;) {
    const page = await api<{ list: Record<string, unknown>[]; pageInfo: { isLastPage: boolean } }>(
      `/api/v2/tables/${tableId}/records?fields=${encodeURIComponent(pkTitle)}&limit=1000&offset=${offset}`
    )
    ids.push(...page.list.map(r => Number(r[pkTitle])))
    if (page.pageInfo.isLastPage) break
    offset += 1000
  }
  return ids
}

async function getAuditTrail(rowId: number): Promise<AuditEntry[]> {
  const entries: AuditEntry[] = []
  let cursor: string | undefined
  for (let pageCount = 0; pageCount < 10; pageCount++) {
    const qs =
      `operation=recordAuditList&row_id=${rowId}&fk_model_id=${tableId}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '')
    const page = await api<{ list: AuditEntry[]; pageInfo?: { isLastPage?: boolean } }>(
      `/api/v2/internal/${workspaceId}/${baseId}?${qs}`
    )
    entries.push(...page.list)
    if (page.pageInfo?.isLastPage !== false || page.list.length === 0) break
    const last = page.list[page.list.length - 1]
    cursor = `${last.id}|${last.created_at}`
  }
  return entries
}

function toDeletedRecord(rowId: number, trail: AuditEntry[]): DeletedRecord | null {
  const deletion = trail.find(e => e.op_type === 'DATA_DELETE')
  if (!deletion) return null

  let data: Record<string, unknown> | null = null
  try {
    data = (JSON.parse(deletion.details ?? '{}') as { data?: Record<string, unknown> }).data ?? null
  } catch {}

  return {
    rowId,
    deletedAt: deletion.created_at,
    deletedBy: deletion.user,
    data,
    auditTrail: trail.map(e => {
      let details: unknown = e.details
      try {
        details = JSON.parse(e.details ?? 'null')
      } catch {}
      return { opType: e.op_type, at: e.created_at, by: e.user, details }
    }),
  }
}

async function main() {
  const { tableTitle, pkTitle } = await getPrimaryKeyTitle()
  console.log(`Table: ${tableTitle} (${tableId}), primary key: ${pkTitle}`)

  const ids = await getExistingIds(pkTitle)
  if (ids.length === 0) {
    console.error('Table has no records; nothing to compare against')
    process.exit(1)
  }
  const existing = new Set(ids)
  const maxId = Math.max(...ids)
  console.log(`Existing records: ${ids.length}, max ${pkTitle}: ${maxId}`)

  const candidates: number[] = []
  for (let i = 1; i <= maxId + aboveMax; i++) {
    if (!existing.has(i)) candidates.push(i)
  }
  console.log(`Checking ${candidates.length} candidate ids (gaps + ${aboveMax} above max) against the audit log...`)

  const deleted: DeletedRecord[] = []
  const concurrency = 8
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency)
    const trails = await Promise.all(batch.map(rowId => getAuditTrail(rowId)))
    batch.forEach((rowId, j) => {
      const record = toDeletedRecord(rowId, trails[j])
      if (record) {
        deleted.push(record)
        console.log(`  found: ${pkTitle} ${rowId}, deleted ${record.deletedAt} by ${record.deletedBy ?? 'unknown'}`)
      }
    })
  }

  let outFile = argValue('--out')
  if (!outFile) {
    const outDir = path.join(process.cwd(), 'generated-codes')
    fs.mkdirSync(outDir, { recursive: true })
    outFile = path.join(outDir, `deleted-records-${tableId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  }

  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        nocodbUrl: origin,
        workspaceId,
        baseId,
        tableId,
        tableTitle,
        note: AUDIT_WINDOW_NOTE,
        existingRecordCount: ids.length,
        maxId,
        candidatesChecked: candidates.length,
        deletedRecordCount: deleted.length,
        deletedRecords: deleted.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
      },
      null,
      2
    )
  )

  console.log(`\n${deleted.length} deleted record(s) exported to ${outFile}`)
  console.log(`Note: ${AUDIT_WINDOW_NOTE}`)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
