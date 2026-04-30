import { Api } from 'nocodb-sdk'
import { resolveFormView, getFormFields as getFormFieldsFromMeta } from './nocodb-meta'
import type { FormField } from './nocodb-meta'

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
