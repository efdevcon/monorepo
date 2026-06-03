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
  // Rating-only: number of icons (NocoDB `meta.max`, defaults to 5) and the
  // configured fill color (`meta.color`). Surfaced so the renderer can draw
  // the right number of stars without re-parsing NocoDB's meta shape.
  rating?: { max: number; color?: string }
}

const SUPPORTED_TYPES = new Set([
  'SingleLineText',
  'Email',
  'SingleSelect',
  'LongText',
  'Date',
  'Attachment',
  'Checkbox',
  'Number',
  'Rating',
])

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
  // Rating config lives on `meta` (not colOptions): `max` icon count + `color`.
  meta?: {
    max?: number
    color?: string
  } | null
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
    // Unsupported types still pass through — the renderer will surface a
    // warning rather than silently dropping them. We avoid logging here so
    // the meta service stays cacheable / quiet on the hot path.

    // Prefer the form-view label override (vc.label), falling back to the
    // intrinsic column title. Exception: if the override happens to match the
    // column's description verbatim, the form designer almost certainly typed
    // the description into the wrong slot in NocoDB — use the column title and
    // keep the long text as the description instead. (Seen on the youth-ticket
    // consent checkboxes where vc.label and col.description are identical.)
    const vcLabel = (vc.label || '').trim()
    const colDescTrim = (col.description || '').trim()
    const overrideShadowsDescription = vcLabel.length > 0 && vcLabel === colDescTrim
    const title = overrideShadowsDescription || !vc.label ? col.title : vc.label
    const description = vc.help || vc.description || col.description || undefined

    let options: string[] | undefined
    if (col.uidt === 'SingleSelect' || col.uidt === 'MultiSelect') {
      const rawOptions = col.colOptions?.options ?? []
      const orderedOptions = [...rawOptions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      options = orderedOptions.map(o => o.title)
    }

    let rating: { max: number; color?: string } | undefined
    if (col.uidt === 'Rating') {
      rating = {
        max: typeof col.meta?.max === 'number' && col.meta.max > 0 ? col.meta.max : 5,
        ...(col.meta?.color ? { color: col.meta.color } : {}),
      }
    }

    fields.push({
      id: col.id,
      title,
      column_name: col.title,
      uidt: col.uidt,
      required: !!vc.required,
      ...(description ? { description } : {}),
      ...(options ? { options } : {}),
      ...(rating ? { rating } : {}),
    })
  }

  fieldsCache.set(viewId, { data: fields, expiresAt: Date.now() + CACHE_TTL })
  return fields
}

// ── Conditional visibility rules (auth'd view-filters endpoint) ──────
//
// NocoDB's form view supports "show field X only when field Y = value Z"
// rules. They live as rows on the view's filter list — the same filters that
// power table-view row filtering, but with `fk_parent_column_id` set to the
// form column whose visibility is being governed.
//
// /api/v1/db/meta/views/{viewId}/filters returns the full list with the
// xc-token header. We tried the public shared-view endpoint first, but it
// only works for forms that have been explicitly "shared" in the UI (which
// generates a separate share UUID); ours aren't.
//
// On any error we return an empty list and the form behaves as before.

export interface ConditionalRule {
  // Column whose visibility is governed by this rule.
  targetColumnId: string
  // Column whose value drives the comparison.
  sourceColumnId: string
  // NocoDB comparison operator — `eq`, `neq`, `anyof`, `allof`, `blank`,
  // `notblank`, `like`, `nlike`, etc.
  op: string
  // Comparison RHS. For `anyof`/`allof` this is a comma-separated string.
  value: string | null
  // Combinator with sibling rules sharing the same target.
  logicalOp: 'and' | 'or'
  // Disabled rules are returned but should be ignored by consumers.
  enabled: boolean
}

interface ViewFilter {
  id: string
  fk_column_id: string | null
  fk_parent_column_id: string | null
  fk_parent_id: string | null
  comparison_op: string
  value: string | null
  logical_op?: string
  enabled?: boolean
  is_group?: boolean | null
}

const rulesCache = new Map<string, { data: ConditionalRule[]; expiresAt: number }>()

export async function getConditionalRules(viewId: string): Promise<ConditionalRule[]> {
  const cached = rulesCache.get(viewId)
  if (cached && Date.now() < cached.expiresAt) return cached.data
  if (!NOCODB_BASE_URL || !NOCODB_API_TOKEN) return []

  try {
    const list = await nocoFetch<{ list: ViewFilter[] }>(`/api/v1/db/meta/views/${viewId}/filters`)
    const rules: ConditionalRule[] = []
    for (const f of list.list ?? []) {
      // Only entries with a `fk_parent_column_id` are show/hide rules — the
      // parent column is the one whose visibility we're driving.
      if (!f.fk_parent_column_id || !f.fk_column_id) continue
      if (f.is_group) continue
      rules.push({
        targetColumnId: f.fk_parent_column_id,
        sourceColumnId: f.fk_column_id,
        op: f.comparison_op,
        value: f.value ?? null,
        logicalOp: f.logical_op === 'or' ? 'or' : 'and',
        enabled: f.enabled !== false,
      })
    }
    rulesCache.set(viewId, { data: rules, expiresAt: Date.now() + CACHE_TTL })
    return rules
  } catch (err) {
    console.warn(`[nocodb-meta] getConditionalRules(${viewId}) failed; treating form as unconditional:`, err)
    return []
  }
}

/**
 * Returns every non-system column on the underlying table, ignoring whether
 * the form view exposes them. Use this when you need to write to columns that
 * exist on the table but are hidden from the form (e.g. server-side email
 * injection, classification tags, submission timestamps).
 */
export async function getAllTableColumns(viewId: string): Promise<FormField[]> {
  const { tableId } = await resolveFormView(viewId)
  const table = await getTableMeta(tableId)
  return table.columns
    .filter(c => !c.system)
    .map(col => ({
      id: col.id,
      title: col.title,
      column_name: col.title,
      uidt: col.uidt,
      required: false,
      ...(col.description ? { description: col.description } : {}),
    }))
}
