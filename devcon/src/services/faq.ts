const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN
const FAQ_TABLE_ID = 'm012lq6ohzsr0ts'

export interface FaqItem {
  id: number
  question: string
  answer: string
  category: string
}

export interface FaqData {
  categories: string[]
  items: FaqItem[]
}

async function nocoFetch<T = any>(path: string): Promise<T> {
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
    throw new Error(`NocoDB fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

interface SchemaColumn {
  title: string
  colOptions?: {
    options?: Array<{ title: string; order?: number }>
  }
}

interface SchemaResponse {
  columns: SchemaColumn[]
}

interface RecordsResponse {
  list: Array<{
    Id: number
    Question?: string
    Answer?: string
    Category?: string
  }>
  pageInfo?: { isLastPage?: boolean }
}

// Strips leading numeric prefixes like "1. " so categories sort in NocoDB
// but render cleanly on the frontend.
function stripCategoryPrefix(label: string): string {
  return label.replace(/^\s*\d+\.\s*/, '')
}

export async function getFaqData(): Promise<FaqData> {
  // Category order — from Single Select options in field schema
  const schema = await nocoFetch<SchemaResponse>(`/api/v2/meta/tables/${FAQ_TABLE_ID}`)
  const categoryField = schema.columns.find(c => c.title === 'Category')
  const categories = (categoryField?.colOptions?.options || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(o => stripCategoryPrefix(o.title))

  // Records — fetch all published, default order = drag-drop order in NocoDB
  const items: FaqItem[] = []
  let page = 1
  const maxPages = 10
  while (page <= maxPages) {
    const data = await nocoFetch<RecordsResponse>(
      `/api/v2/tables/${FAQ_TABLE_ID}/records?where=(Published,checked)&limit=100&page=${page}`
    )
    for (const r of data.list || []) {
      items.push({
        id: r.Id,
        question: r.Question || '',
        answer: r.Answer || '',
        category: stripCategoryPrefix(r.Category || ''),
      })
    }
    if (data.pageInfo?.isLastPage !== false) break
    page++
  }

  return { categories, items }
}
