import { Api } from 'nocodb-sdk'
import { resolveFormView, getFormFields as getFormFieldsFromMeta, getAllTableColumns } from './nocodb-meta'
import type { FormField } from './nocodb-meta'

export { getAllTableColumns }

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN

function getApi() {
  if (!NOCODB_BASE_URL || !NOCODB_API_TOKEN) {
    throw new Error('NocoDB env vars not configured (NOCODB_BASE_URL, NOCODB_API_TOKEN)')
  }
  return new Api({
    baseURL: NOCODB_BASE_URL,
    headers: { 'xc-token': NOCODB_API_TOKEN },
  })
}

export type TableField = FormField

export async function getTableFields(viewId: string): Promise<TableField[]> {
  return getFormFieldsFromMeta(viewId)
}

export async function createRow(viewId: string, data: Record<string, any>) {
  const { baseId, tableId } = await resolveFormView(viewId)
  const api = getApi()
  return api.dbTableRow.create('noco', baseId, tableId, data)
}

export async function findRowByEmail(viewId: string, emailColumn: string, email: string): Promise<any | null> {
  const { baseId, tableId } = await resolveFormView(viewId)
  const api = getApi()
  const result = await api.dbTableRow.list('noco', baseId, tableId, {
    where: `(${emailColumn},eq,${email})`,
    limit: 1,
  })
  const rows = (result as any)?.list ?? []
  return rows.length > 0 ? rows[0] : null
}

export async function updateRow(viewId: string, rowId: number, data: Record<string, any>) {
  const { baseId, tableId } = await resolveFormView(viewId)
  const api = getApi()
  return api.dbTableRow.update('noco', baseId, tableId, rowId, data)
}

export async function getRowById(viewId: string, rowId: number): Promise<any | null> {
  const { baseId, tableId } = await resolveFormView(viewId)
  const api = getApi()
  try {
    return await api.dbTableRow.read('noco', baseId, tableId, rowId)
  } catch {
    return null
  }
}

// List all rows for a view (paginated under the hood). Builder applications are
// low-volume, so we page through to a sane cap and return them all.
export async function listRows(viewId: string, opts: { sort?: string } = {}): Promise<any[]> {
  const { baseId, tableId } = await resolveFormView(viewId)
  const api = getApi()
  const pageSize = 200
  const out: any[] = []
  let offset = 0
  for (let page = 0; page < 50; page++) {
    const result = await api.dbTableRow.list('noco', baseId, tableId, {
      limit: pageSize,
      offset,
      ...(opts.sort ? { sort: opts.sort } : {}),
    })
    const rows = (result as any)?.list ?? []
    out.push(...rows)
    const info = (result as any)?.pageInfo
    if (rows.length < pageSize || info?.isLastPage) break
    offset += pageSize
  }
  return out
}
