/**
 * QR code redirects for devcon.org/qr/<slug>[/<placement>], managed by the
 * team in a NocoDB table and served by /api/qr/.
 *
 * NocoDB is both the editor and the store: one row per slug, read here with
 * the site's NocoDB token on every CDN miss. The durable CDN cache per scanned
 * URL (see the API route) carries the load, so a burst of scans reaches NocoDB
 * once per URL per hour plus the odd revalidation, not once per scan. There is
 * deliberately no per-instance memory cache: a NocoDB webhook calls
 * /api/qr/refresh/ on every row change to purge the CDN, and an instance that
 * kept the old table in memory would refill the CDN with it for an hour (seen
 * in testing on 2026-10-01).
 *
 * Server-only: uses NOCODB_BASE_URL, NOCODB_API_TOKEN and NOCODB_QR_TABLE_ID.
 */

/** devcon.org paths in Target URL resolve against this origin. */
const SITE_ORIGIN = 'https://devcon.org'
/** Where unknown or inactive slugs land, so a bad poster never shows an error. */
const FALLBACK_URL = `${SITE_ORIGIN}/en/`
/** Column titles in the NocoDB table. */
const COL = { slug: 'Slug', target: 'Target URL', keyword: 'Keyword', active: 'Active', notes: 'Notes' } as const

export interface QrRedirect {
  /** Path after /qr/, lower-case, no surrounding slashes (e.g. "app", "code/ns"). */
  slug: string
  /** Absolute URL, or empty when the row has no target yet. */
  target: string
  /** Matomo mtm_kwd; defaults to the slug's first segment. */
  keyword: string
  active: boolean
  notes?: string
}

export interface QrResolution {
  url: string
  /** False for the homepage fallback, so the route can cache it for less time. */
  matched: boolean
  slug?: string
}

/**
 * Last resort when NocoDB cannot be read and this instance has never loaded
 * the table: the public targets of the codes that are physically printed, so a
 * poster keeps working through an outage. Not a second source of truth: only
 * consulted on failure, and rows never carry anything private.
 */
export const SAFETY_NET: QrRedirect[] = [
  { slug: 'app', target: 'https://app.devcon.org/', keyword: 'app', active: true },
  { slug: 'guide', target: `${SITE_ORIGIN}/en/travel-guide/`, keyword: 'guide', active: true },
  { slug: 'web', target: `${SITE_ORIGIN}/en/`, keyword: 'web', active: true },
]

/** Normalise "/App/Airport/" and "app/airport" to "app/airport". */
export const normaliseSlug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')

type Row = Record<string, unknown>

function mapRow(row: Row): QrRedirect | null {
  const slug = normaliseSlug(String(row[COL.slug] ?? ''))
  if (!slug) return null
  const rawTarget = String(row[COL.target] ?? '').trim()
  const target = rawTarget ? (rawTarget.startsWith('/') ? `${SITE_ORIGIN}${rawTarget}` : rawTarget) : ''
  const active = row[COL.active]
  const notes = String(row[COL.notes] ?? '').trim()
  return {
    slug,
    target,
    keyword: String(row[COL.keyword] ?? '').trim() || slug.split('/')[0],
    active: active === true || active === 1 || active === '1' || active === 'true',
    notes: notes || undefined,
  }
}

async function queryNocoDb(): Promise<QrRedirect[]> {
  const base = process.env.NOCODB_BASE_URL?.replace(/\/$/, '')
  const token = process.env.NOCODB_API_TOKEN
  const table = process.env.NOCODB_QR_TABLE_ID
  if (!base || !token || !table)
    throw new Error('NOCODB_BASE_URL, NOCODB_API_TOKEN and NOCODB_QR_TABLE_ID are required')
  const rows: QrRedirect[] = []
  let offset = 0
  for (;;) {
    const res = await fetch(`${base}/api/v2/tables/${table}/records?limit=200&offset=${offset}`, {
      headers: { 'xc-token': token },
    })
    if (!res.ok) throw new Error(`NocoDB read failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as { list: Row[]; pageInfo?: { isLastPage?: boolean } }
    for (const row of data.list) {
      const mapped = mapRow(row)
      if (mapped) rows.push(mapped)
    }
    if (data.pageInfo?.isLastPage !== false || data.list.length === 0) break
    offset += data.list.length
  }
  return rows
}

/** Last rows this instance read successfully, for the failure path only. */
let lastGood: QrRedirect[] | null = null

/**
 * The live table for a scan: NocoDB, else the last rows this instance read,
 * else the SAFETY_NET.
 */
export async function fetchQrRedirects(): Promise<QrRedirect[]> {
  try {
    const rows = await queryNocoDb()
    lastGood = rows
    return rows
  } catch (e) {
    if (lastGood) {
      console.warn('[qr-redirects] serving the last good rows after:', (e as Error).message)
      return lastGood
    }
    console.error('[qr-redirects] serving the safety net after:', (e as Error).message)
    return SAFETY_NET
  }
}

/**
 * Longest-slug match: "app/airport" matches row "app" with placement
 * "airport"; "code/ns/flyer" matches row "code/ns" with placement "ns-flyer"
 * (everything after the slug's first segment counts as placement). Pure, so
 * it can be tested without any backend.
 */
export function resolveQr(path: string, rows: QrRedirect[]): QrResolution {
  const segments = normaliseSlug(path).split('/').filter(Boolean)
  const bySlug = new Map(rows.map(r => [r.slug, r]))
  for (let n = segments.length; n >= 1; n--) {
    const row = bySlug.get(segments.slice(0, n).join('/'))
    if (!row) continue
    if (!row.active || !row.target) break
    const url = new URL(row.target)
    url.searchParams.set('mtm_campaign', 'qr')
    url.searchParams.set('mtm_kwd', row.keyword)
    const placement = segments.slice(1).join('-')
    if (placement) url.searchParams.set('mtm_placement', placement)
    return { url: url.toString(), matched: true, slug: row.slug }
  }
  const url = new URL(FALLBACK_URL)
  url.searchParams.set('mtm_campaign', 'qr')
  url.searchParams.set('mtm_kwd', 'unknown')
  if (segments.length) url.searchParams.set('mtm_placement', segments.join('-'))
  return { url: url.toString(), matched: false }
}
