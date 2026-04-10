import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.NOCODB_META_DB_URL,
  max: 5,
  idleTimeoutMillis: 30000,
})

export interface FormViewMeta {
  viewId: string
  tableId: string
  baseId: string
  sourceId: string
  viewTitle: string
  formHeading: string
  formSubheading?: string
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

// In-memory cache
const viewCache = new Map<string, { data: FormViewMeta; expiresAt: number }>()
const fieldsCache = new Map<string, { data: FormField[]; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function resolveFormView(viewId: string): Promise<FormViewMeta> {
  const cached = viewCache.get(viewId)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const { rows } = await pool.query(
    `SELECT
       v.id AS view_id, v.title AS view_title,
       fv.heading, fv.subheading,
       m.id AS table_id, m.table_name,
       b.id AS base_id,
       v.source_id
     FROM nc_views_v2 v
     JOIN nc_form_view_v2 fv ON fv.fk_view_id = v.id
     JOIN nc_models_v2 m ON m.id = v.fk_model_id
     JOIN nc_bases_v2 b ON b.id = v.base_id
     WHERE v.id = $1 AND v.type = 1`,
    [viewId]
  )

  if (rows.length === 0) {
    throw new Error(`Form view not found: ${viewId}`)
  }

  const row = rows[0]
  const data: FormViewMeta = {
    viewId: row.view_id,
    tableId: row.table_id,
    baseId: row.base_id,
    sourceId: row.source_id,
    viewTitle: row.view_title,
    formHeading: row.heading || row.view_title,
    formSubheading: row.subheading || undefined,
    tableName: row.table_name,
  }

  viewCache.set(viewId, { data, expiresAt: Date.now() + CACHE_TTL })
  return data
}

export async function getFormFields(viewId: string): Promise<FormField[]> {
  const cached = fieldsCache.get(viewId)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const { rows } = await pool.query(
    `SELECT
       fvc."order", fvc.label, fvc.description AS form_description, fvc.help,
       fvc.required, fvc.show,
       c.id AS col_id, c.title AS col_title, c.column_name, c.uidt,
       c.description AS col_description, c.system
     FROM nc_form_view_columns_v2 fvc
     JOIN nc_columns_v2 c ON c.id = fvc.fk_column_id
     WHERE fvc.fk_view_id = $1
     ORDER BY fvc."order"`,
    [viewId]
  )

  // Collect select options for all columns in one query
  const colIds = rows.filter(r => r.uidt === 'SingleSelect').map(r => r.col_id)
  const optionsMap = new Map<string, string[]>()

  if (colIds.length > 0) {
    const { rows: optRows } = await pool.query(
      `SELECT fk_column_id, title
       FROM nc_col_select_options_v2
       WHERE fk_column_id = ANY($1)
       ORDER BY "order"`,
      [colIds]
    )
    for (const opt of optRows) {
      const list = optionsMap.get(opt.fk_column_id) || []
      list.push(opt.title)
      optionsMap.set(opt.fk_column_id, list)
    }
  }

  const fields: FormField[] = rows
    .filter(r => r.show && !r.system && SUPPORTED_TYPES.has(r.uidt))
    .map(r => {
      const title = r.label || r.col_title
      const description = r.help || r.form_description || r.col_description || undefined
      return {
        id: r.col_id,
        title,
        column_name: r.col_title,
        uidt: r.uidt,
        required: !!r.required,
        ...(description ? { description } : {}),
        ...(r.uidt === 'SingleSelect' ? { options: optionsMap.get(r.col_id) || [] } : {}),
      }
    })

  fieldsCache.set(viewId, { data: fields, expiresAt: Date.now() + CACHE_TTL })
  return fields
}
