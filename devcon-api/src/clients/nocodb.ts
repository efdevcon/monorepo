import { SERVER_CONFIG } from '@/utils/config'

interface NocoDbListResponse {
  list: Record<string, unknown>[]
  pageInfo: { totalRows: number; page: number; pageSize: number; isFirstPage: boolean; isLastPage: boolean }
}

export async function FetchNocoDbTable(tableId: string): Promise<Record<string, unknown>[]> {
  if (!SERVER_CONFIG.NOCODB_URL) throw new Error('NOCODB_URL not configured')
  if (!SERVER_CONFIG.NOCODB_API_TOKEN) throw new Error('NOCODB_API_TOKEN not configured')

  const baseUrl = SERVER_CONFIG.NOCODB_URL.replace(/\/$/, '')
  const pageSize = 100
  const rows: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const url = `${baseUrl}/api/v2/tables/${tableId}/records?limit=${pageSize}&offset=${(page - 1) * pageSize}`
    const res = await fetch(url, {
      headers: {
        'xc-token': SERVER_CONFIG.NOCODB_API_TOKEN,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`NocoDB fetch failed (${res.status}) for table ${tableId}`)
    }

    const data = (await res.json()) as NocoDbListResponse
    rows.push(...data.list)

    if (data.pageInfo.isLastPage) break
    page++
  }

  return rows
}
