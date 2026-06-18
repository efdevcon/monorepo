import { Api } from 'nocodb-sdk'
import {
  resolveFormView,
  resolveViewTable,
  getFormFields as getFormFieldsFromMeta,
  getAllTableColumns,
} from './nocodb-meta'
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

/**
 * List rows of the table backing a form view. Paginates through all records
 * (capped) so callers get the full set. Read-only; safe for public listings.
 */
export async function listViewRows(
  viewId: string,
  opts: { pageSize?: number; maxRows?: number } = {}
): Promise<any[]> {
  const { baseId, tableId } = await resolveViewTable(viewId)
  const api = getApi()
  const pageSize = opts.pageSize ?? 100
  const maxRows = opts.maxRows ?? 500
  const rows: any[] = []
  let offset = 0
  while (rows.length < maxRows) {
    const result = await api.dbTableRow.list('noco', baseId, tableId, { limit: pageSize, offset })
    const page = (result as any)?.list ?? []
    rows.push(...page)
    const isLast = (result as any)?.pageInfo?.isLastPage ?? page.length < pageSize
    if (isLast) break
    offset += pageSize
  }
  return rows
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
