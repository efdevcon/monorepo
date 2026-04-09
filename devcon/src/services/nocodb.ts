import { Api } from 'nocodb-sdk'
import { getFormConfig } from '../config/nocodb-forms'

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN
const NOCODB_SHARED_VIEW_PASSWORD = process.env.NOCODB_SHARED_VIEW_PASSWORD

function getApi() {
  if (!NOCODB_BASE_URL || !NOCODB_API_TOKEN) {
    throw new Error('NocoDB env vars not configured (NOCODB_BASE_URL, NOCODB_API_TOKEN)')
  }
  return new Api({
    baseURL: NOCODB_BASE_URL,
    headers: { 'xc-token': NOCODB_API_TOKEN },
  })
}

// In-memory field metadata cache
const cache = new Map<string, { fields: any[]; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const SUPPORTED_TYPES = new Set(['SingleLineText', 'Email', 'SingleSelect', 'LongText'])

export interface TableField {
  id: string
  title: string
  column_name: string
  type: string
  required: boolean
  description?: string
  options?: string[]
}

export async function getTableFields(slug: string): Promise<TableField[]> {
  const config = getFormConfig(slug)
  const cacheKey = `${config.baseId}:${config.tableId}:${config.formViewId}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) return cached.fields

  const api = getApi()

  // 1. Fetch field type metadata from v3 API
  const tableRes = await (api as any).instance.get(
    `/api/v3/meta/bases/${config.baseId}/tables/${config.tableId}`
  )
  const allFields: any[] = tableRes.data?.fields ?? []
  const fieldById = new Map<string, any>()
  for (const f of allFields) {
    fieldById.set(f.id, f)
  }

  // 2. Fetch form view metadata from password-protected shared view endpoint
  //    Returns field visibility, order, required, label overrides
  const formRes = await (api as any).instance.get(
    `/api/v2/public/shared-view/${config.sharedViewId}/meta`,
    { headers: NOCODB_SHARED_VIEW_PASSWORD ? { 'xc-password': NOCODB_SHARED_VIEW_PASSWORD } : {} }
  )
  const formColumns: any[] = formRes.data?.columns ?? []

  // 3. Filter visible + supported, sort by form order, merge metadata
  const fields: TableField[] = formColumns
    .filter(fc => fc.show)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map(fc => {
      const meta = fieldById.get(fc.fk_column_id)
      if (!meta || !SUPPORTED_TYPES.has(meta.type)) return null

      const title = fc.label || meta.title
      return {
        id: meta.id,
        title,
        column_name: meta.title,
        type: meta.type,
        required: !!fc.required,
        ...(fc.help || meta.description ? { description: fc.help || meta.description } : {}),
        ...(meta.type === 'SingleSelect' && meta.options?.choices
          ? { options: meta.options.choices.map((c: any) => c.title) }
          : {}),
      }
    })
    .filter((f): f is TableField => !!f)

  cache.set(cacheKey, { fields, expiresAt: Date.now() + CACHE_TTL })
  return fields
}

export async function createRow(slug: string, data: Record<string, any>) {
  const config = getFormConfig(slug)
  const api = getApi()
  return api.dbTableRow.create('noco', config.baseId, config.tableId, data)
}

export async function findRowByEmail(slug: string, emailColumn: string, email: string): Promise<any | null> {
  const config = getFormConfig(slug)
  const api = getApi()
  const result = await api.dbTableRow.list('noco', config.baseId, config.tableId, {
    where: `(${emailColumn},eq,${email})`,
    limit: 1,
  })
  const rows = (result as any)?.list ?? []
  return rows.length > 0 ? rows[0] : null
}

export async function updateRow(slug: string, rowId: number, data: Record<string, any>) {
  const config = getFormConfig(slug)
  const api = getApi()
  return api.dbTableRow.update('noco', config.baseId, config.tableId, rowId, data)
}
