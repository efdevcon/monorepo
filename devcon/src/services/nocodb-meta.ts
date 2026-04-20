/**
 * NocoDB form-view metadata helpers, implemented on top of the public REST
 * meta API (no direct Postgres access required).
 *
 * Endpoints used (all require the xc-token header):
 *   GET /api/v1/db/meta/forms/:viewId           — form-level config (heading/subheading, base, source, column configs)
 *   GET /api/v1/db/meta/columns/:colId          — to resolve a column's fk_model_id (tableId)
 *   GET /api/v1/db/meta/tables/:tableId         — table metadata incl. views[] and columns[] with SingleSelect options
 *   GET /api/v1/db/meta/views/:viewId/columns   — per-form-view column config (order, label, help, required, show)
 */

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN

export interface FormViewMeta {
  viewId: string
  tableId: string
  baseId: string
  sourceId: string
  viewTitle: string
  formHeading: string
  formSubheading?: string
  successMsg?: string
  tableName: string
}

export interface FormField {
  id: string
  title: string
  column_name: string
  uidt: string
  required: boolean
  description?: string
  options?: string[]
}

const SUPPORTED_TYPES = new Set(['SingleLineText', 'Email', 'SingleSelect', 'LongText'])

// In-memory caches — keyed by viewId / tableId.
const viewCache = new Map<string, { data: FormViewMeta; expiresAt: number }>()
const fieldsCache = new Map<string, { data: FormField[]; expiresAt: number }>()
const tableCache = new Map<string, { data: TableMeta; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000

// ── API response shapes (only the fields we consume) ─────────────────

interface FormColumnCfg {
  id: string
  fk_view_id: string
  fk_column_id: string
  label: string | null
  help: string | null
  description: string | null
  required: boolean
  show: boolean
  order: number | null
  created_at?: string
}

interface FormMeta {
  fk_view_id: string
  base_id: string
  source_id: string
  heading: string | null
  subheading: string | null
  success_msg: string | null
  columns?: FormColumnCfg[]
}

interface ColumnMeta {
  id: string
  fk_model_id: string
  base_id: string
  source_id: string
}

interface TableViewSummary {
  id: string
  title: string
  type: number
}

interface TableColumn {
  id: string
  title: string
  column_name: string
  uidt: string
  description?: string | null
  system?: boolean
  colOptions?: {
    options?: Array<{ title: string; order?: number }>
  }
}

interface TableMeta {
  id: string
  title: string
  table_name: string
  base_id: string
  source_id: string
  views: TableViewSummary[]
  columns: TableColumn[]
}

// ── REST helper ───────────────────────────────────────────────────────

async function nocoFetch<T>(path: string): Promise<T> {
  if (!NOCODB_BASE_URL || !NOCODB_API_TOKEN) {
    throw new Error('NocoDB env vars not configured (NOCODB_BASE_URL, NOCODB_API_TOKEN)')
  }
  const res = await fetch(`${NOCODB_BASE_URL}${path}`, {
    headers: {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    let body = ''
    try {
      body = await res.text()
    } catch {}
    throw new Error(`NocoDB API ${path} failed: HTTP ${res.status} ${body}`.trim())
  }
  return res.json() as Promise<T>
}

async function getTableMeta(tableId: string): Promise<TableMeta> {
  const cached = tableCache.get(tableId)
  if (cached && Date.now() < cached.expiresAt) return cached.data
  const data = await nocoFetch<TableMeta>(`/api/v1/db/meta/tables/${tableId}`)
  tableCache.set(tableId, { data, expiresAt: Date.now() + CACHE_TTL })
  return data
}

// ── Public API ────────────────────────────────────────────────────────

export async function resolveFormView(viewId: string): Promise<FormViewMeta> {
  const cached = viewCache.get(viewId)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  let form: FormMeta
  try {
    form = await nocoFetch<FormMeta>(`/api/v1/db/meta/forms/${viewId}`)
  } catch (err) {
    // Treat 404s as "not found" to preserve the prior API surface.
    const msg = (err as Error).message
    if (msg.includes('HTTP 404')) throw new Error(`Form view not found: ${viewId}`)
    throw err
  }

  if (!form.columns || form.columns.length === 0) {
    throw new Error(`Form view has no columns: ${viewId}`)
  }

  // Resolve tableId via a single column meta lookup (forms endpoint doesn't include fk_model_id).
  const firstColId = form.columns[0].fk_column_id
  const column = await nocoFetch<ColumnMeta>(`/api/v1/db/meta/columns/${firstColId}`)
  const table = await getTableMeta(column.fk_model_id)

  // View title isn't on the forms endpoint — pull it from the table's views[] list.
  const viewTitle = table.views.find(v => v.id === viewId)?.title ?? table.title

  const data: FormViewMeta = {
    viewId,
    tableId: table.id,
    baseId: form.base_id,
    sourceId: form.source_id,
    viewTitle,
    formHeading: form.heading || viewTitle,
    formSubheading: form.subheading || undefined,
    successMsg: form.success_msg || undefined,
    tableName: table.table_name,
  }

  viewCache.set(viewId, { data, expiresAt: Date.now() + CACHE_TTL })
  return data
}

export async function getFormFields(viewId: string): Promise<FormField[]> {
  const cached = fieldsCache.get(viewId)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  // Need: view-column config (order/label/help/required/show) + table columns (uidt/options/descriptions).
  const { tableId } = await resolveFormView(viewId)
  const [viewColsResp, table] = await Promise.all([
    nocoFetch<{ list: FormColumnCfg[] }>(`/api/v1/db/meta/views/${viewId}/columns`),
    getTableMeta(tableId),
  ])

  const tableColsById = new Map(table.columns.map(c => [c.id, c]))

  // Primary sort by order; tiebreak by created_at to mimic stable SQL ordering.
  // NocoDB uses fractional order values for drag-drop, and ties can occur after inserts.
  const sorted = [...viewColsResp.list].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })

  const fields: FormField[] = []
  for (const vc of sorted) {
    if (!vc.show) continue
    const col = tableColsById.get(vc.fk_column_id)
    if (!col) continue
    if (col.system) continue
    if (!SUPPORTED_TYPES.has(col.uidt)) continue

    const title = vc.label || col.title
    const description = vc.help || vc.description || col.description || undefined

    let options: string[] | undefined
    if (col.uidt === 'SingleSelect') {
      const rawOptions = col.colOptions?.options ?? []
      const orderedOptions = [...rawOptions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      options = orderedOptions.map(o => o.title)
    }

    fields.push({
      id: col.id,
      title,
      column_name: col.title,
      uidt: col.uidt,
      required: !!vc.required,
      ...(description ? { description } : {}),
      ...(options ? { options } : {}),
    })
  }

  fieldsCache.set(viewId, { data: fields, expiresAt: Date.now() + CACHE_TTL })
  return fields
}
