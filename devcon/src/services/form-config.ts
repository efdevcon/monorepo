/**
 * Form configuration backed by the NocoDB "Form config" table (mz6lcse5kfidb23).
 *
 * Replaces the previous static `src/config/nocodb-forms.ts` so non-engineers can
 * toggle a form's open/closed state and OTP requirement directly in NocoDB.
 *
 * Server-only: relies on NOCODB_BASE_URL + NOCODB_API_TOKEN. Call from API routes
 * or `getStaticProps`, never from the browser.
 */

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN

const FORM_CONFIG_TABLE_ID = 'mz6lcse5kfidb23'

export interface NocodbFormConfig {
  formSlug: string
  formViewId: string
  requireOtp: boolean
  open: boolean
}

interface ConfigRecord {
  Id: number
  'Form Slug'?: string | null
  'Form View ID'?: string | null
  'Requires OTP'?: 'Yes' | 'No' | null
  'Is Form Open'?: boolean | number | null
}

interface RecordsResponse {
  list: ConfigRecord[]
  pageInfo?: { totalRows: number; page: number; pageSize: number; isLastPage: boolean }
}

let cache: { data: NocodbFormConfig[]; expiresAt: number } | null = null
const CACHE_TTL = 60 * 1000

async function fetchAllConfigs(): Promise<NocodbFormConfig[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.data
  if (!NOCODB_BASE_URL || !NOCODB_API_TOKEN) {
    throw new Error('NocoDB env vars not configured (NOCODB_BASE_URL, NOCODB_API_TOKEN)')
  }

  const url = `${NOCODB_BASE_URL}/api/v2/tables/${FORM_CONFIG_TABLE_ID}/records?limit=100`
  const res = await fetch(url, {
    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    let body = ''
    try { body = await res.text() } catch {}
    throw new Error(`Form config fetch failed: HTTP ${res.status} ${body}`.trim())
  }
  const json = (await res.json()) as RecordsResponse
  const list = json.list ?? []

  const configs: NocodbFormConfig[] = []
  for (const r of list) {
    const slug = r['Form Slug']?.trim()
    const viewId = r['Form View ID']?.trim()
    if (!slug || !viewId) continue
    configs.push({
      formSlug: slug,
      formViewId: viewId,
      requireOtp: r['Requires OTP'] === 'Yes',
      open: !!r['Is Form Open'],
    })
  }

  cache = { data: configs, expiresAt: Date.now() + CACHE_TTL }
  return configs
}

export async function getFormConfigBySlug(slug: string): Promise<NocodbFormConfig | undefined> {
  const all = await fetchAllConfigs()
  return all.find(c => c.formSlug === slug)
}

export async function getFormConfigByViewId(viewId: string): Promise<NocodbFormConfig | undefined> {
  const all = await fetchAllConfigs()
  return all.find(c => c.formViewId === viewId)
}

export async function getAllFormConfigs(): Promise<NocodbFormConfig[]> {
  return fetchAllConfigs()
}

/** A form is open by default if no config exists; otherwise respect the `open` flag. */
export function isFormOpen(config?: NocodbFormConfig): boolean {
  if (!config) return true
  return config.open
}
