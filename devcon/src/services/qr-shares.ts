/**
 * QR shares for in-person ticket sales: the state behind /tickets/qr-admin/,
 * /tickets/qr/ and the buyer landing page /s/<token>.
 *
 * Server-only. Two NocoDB tables in the Ticketing base (ids below, token from
 * NOCODB_API_TOKEN): one row per thing put on the QR sharing page, and the
 * list of link shortcuts. Column titles are used verbatim in `where`/`sort`,
 * so they have no spaces. Pretix stays the source of truth for "redeemed"
 * (services/qr-share-voucher.ts); this module only stores the mirror.
 */
import crypto from 'crypto'

// Table ids in the Ticketing base. Not secret: nothing in them is readable
// without the API token, and the same tables serve development and production
// (rows carry their Env). Hardcoded so a deploy needs no extra configuration.
export const QR_SHARES_TABLE_ID = 'myikvafx1t1jnt5'
export const QR_LINKS_TABLE_ID = 'mt3fsppzbly2vbt'

export type ShareKind = 'voucher' | 'links'
export type ShareStatus = 'open' | 'scanned' | 'closed'
export interface ShareLink {
  label: string
  url: string
}
export interface Share {
  id: number
  token: string
  kind: ShareKind
  voucherCode: string | null
  targetUrl: string | null
  links: ShareLink[]
  title: string
  description: string | null
  /** One-line price summary for tables. */
  price: string | null
  /** Price when paying with ETH, formatted; null for links and item-less vouchers. */
  priceEth: string | null
  /** Price when paying by card; null when ETH-only or not applicable. Equal to priceEth when one price serves both. */
  priceFiat: string | null
  env: string
  active: boolean
  status: ShareStatus
  sharedAt: string | null
  scannedAt: string | null
  scanCount: number
  /** Random id of the first browser that opened the landing page. Never sent to a browser. */
  browserKey: string | null
  /** Mirrors Pretix: the voucher is used up (redemptions reached the maximum). */
  redeemed: boolean
  /** Pretix max_usages, 0 = unlimited. Drives the "used up" flag; every voucher QR is still one scan. */
  maxUsages: number
  /** Pretix redeemed count, refreshed with `redeemed`. */
  redemptions: number
  lastPretixCheck: string | null
}
export interface QrLink {
  id: number
  label: string
  url: string
  showOnRedeemPage: boolean
  order: number
  enabled: boolean
}

/** A share as sent to the admin and QR sharing pages: never the browser key. */
export type PublicShare = Omit<Share, 'browserKey'>
export type NewShare = Omit<
  Share,
  'id' | 'active' | 'status' | 'sharedAt' | 'scannedAt' | 'scanCount' | 'browserKey' | 'redeemed' | 'lastPretixCheck'
>
export type SharePatch = Partial<
  Pick<Share, 'active' | 'status' | 'scannedAt' | 'scanCount' | 'browserKey' | 'redeemed' | 'redemptions' | 'lastPretixCheck'>
>

// ---------------------------------------------------------------------------
// pure helpers

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567'
const TOKEN_RE = /^[a-z2-7]{12}$/

/** 12 base32 characters (60 bits) from the CSPRNG. The only thing a QR encodes. */
export function newToken(): string {
  const bytes = crypto.randomBytes(12)
  let out = ''
  for (let i = 0; i < 12; i++) out += BASE32[bytes[i] % 32]
  return out
}

/** A voucher code from a pasted redeem URL (any URL with a `voucher` query
 *  parameter, case-insensitive) or a bare code. Null when neither. */
export function parseVoucherInput(input: string): string | null {
  const s = (input ?? '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s)
      for (const [k, v] of url.searchParams) if (k.toLowerCase() === 'voucher' && v.trim()) return v.trim()
    } catch {
      return null
    }
    return null
  }
  return /^[A-Za-z0-9_-]{3,64}$/.test(s) ? s : null
}

/** Only http(s) ever reaches an href on the buyer page, whatever a hand edit
 *  in NocoDB put in a URL field. */
export const isWebUrl = (url: string) => /^https?:\/\/\S+$/i.test(url)

/** Links column → array; anything malformed (hand edits, odd schemes) becomes []. */
export function parseLinks(raw: unknown): ShareLink[] {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  const out: ShareLink[] = []
  for (const item of value) {
    const candidate = item as { label?: unknown; url?: unknown } | null
    if (
      candidate &&
      typeof candidate === 'object' &&
      typeof candidate.label === 'string' &&
      typeof candidate.url === 'string' &&
      isWebUrl(candidate.url)
    ) {
      out.push({ label: candidate.label, url: candidate.url })
    } else {
      return []
    }
  }
  return out
}

/** Every voucher QR is one scan for one buyer, multi-use vouchers included
 *  (the next buyer gets a fresh code via "show again"); links are not
 *  sensitive and never bind. */
export function bindsBrowser(share: Pick<Share, 'kind' | 'maxUsages'>): boolean {
  return share.kind === 'voucher'
}

/** Browser binding for the landing page: a voucher binds to the first
 *  browser, links open for anyone. */
export function canOpenShare(share: Share, cookieKey: string | null): 'first' | 'same' | 'other' {
  if (!bindsBrowser(share)) return 'same'
  if (!share.browserKey) return 'first'
  return cookieKey && cookieKey === share.browserKey ? 'same' : 'other'
}

export function titleForLinks(links: ShareLink[]): string {
  return links.length ? links.map(l => l.label).join(', ') : 'Links'
}

const BROWSER_KEY_RE = /^[a-f0-9]{32}$/

/** The key that binds a voucher share to a browser: the browser's existing
 *  cookie when it carries one (a buyer scanning a second code keeps access to
 *  the first page), otherwise a fresh random key. */
export function bindingKeyFor(cookieKey: string | null): { key: string; isNew: boolean } {
  if (cookieKey && BROWSER_KEY_RE.test(cookieKey)) return { key: cookieKey, isNew: false }
  return { key: crypto.randomBytes(16).toString('hex'), isNew: true }
}

export const REDEEMED_TTL_MS = 30_000

/** Voucher shares whose Pretix "redeemed" mirror is worth refreshing now:
 *  unclosed, not yet redeemed, last checked more than 30 s ago (never checked
 *  first), capped so a long list of stale rows cannot fan out into Pretix. */
export function dueForRefresh(shares: Share[], now = Date.now(), cap = 20): Share[] {
  const age = (s: Share) => (s.lastPretixCheck ? Date.parse(s.lastPretixCheck) : 0)
  return shares
    .filter(s => s.kind === 'voucher' && !!s.voucherCode && s.status !== 'closed' && !s.redeemed && now - age(s) > REDEEMED_TTL_MS)
    .sort((a, b) => age(a) - age(b))
    .slice(0, cap)
}

// ---------------------------------------------------------------------------
// NocoDB

type Row = Record<string, unknown>

function cfg() {
  const base = process.env.NOCODB_BASE_URL?.replace(/\/$/, '')
  const token = process.env.NOCODB_API_TOKEN
  if (!base || !token) throw new Error('NOCODB_BASE_URL and NOCODB_API_TOKEN are required')
  return { base, token, shares: QR_SHARES_TABLE_ID, links: QR_LINKS_TABLE_ID }
}

async function noco<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { base, token } = cfg()
  const res = await fetch(`${base}/api/v2/tables/${path}`, {
    ...init,
    headers: { 'xc-token': token, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    throw new Error(`NocoDB ${init.method ?? 'GET'} ${path} failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  return (await res.json()) as T
}

const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0)
const bool = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true'

function mapShare(r: Row): Share {
  return {
    id: num(r.Id),
    token: str(r.Token) ?? '',
    kind: r.Kind === 'links' ? 'links' : 'voucher',
    voucherCode: str(r.VoucherCode),
    targetUrl: str(r.TargetUrl),
    links: parseLinks(r.Links),
    title: str(r.Title) ?? '',
    description: str(r.Description),
    price: str(r.Price),
    priceEth: str(r.PriceEth),
    priceFiat: str(r.PriceFiat),
    env: str(r.Env) ?? '',
    active: bool(r.Active),
    status: r.Status === 'scanned' || r.Status === 'closed' ? r.Status : 'open',
    sharedAt: str(r.SharedAt),
    scannedAt: str(r.ScannedAt),
    scanCount: num(r.ScanCount),
    browserKey: str(r.BrowserKey),
    redeemed: bool(r.Redeemed),
    maxUsages: num(r.MaxUsages),
    redemptions: num(r.Redemptions),
    lastPretixCheck: str(r.LastPretixCheck),
  }
}

function mapLink(r: Row): QrLink {
  return {
    id: num(r.Id),
    label: str(r.Label) ?? '',
    url: str(r.Url) ?? '',
    showOnRedeemPage: bool(r.ShowOnRedeemPage),
    order: num(r.Order),
    enabled: bool(r.Enabled),
  }
}

/** Values interpolated into a NocoDB `where` never carry its syntax characters. */
const esc = (v: string) => v.replace(/[(),~]/g, '')

async function queryShares(where: string, extra = ''): Promise<Share[]> {
  const { shares } = cfg()
  const data = await noco<{ list: Row[] }>(`${shares}/records?where=${encodeURIComponent(where)}&sort=-SharedAt${extra}`)
  return data.list.map(mapShare)
}

export async function createShare(input: NewShare): Promise<Share> {
  const { shares } = cfg()
  const body: Row = {
    Token: input.token,
    Kind: input.kind,
    VoucherCode: input.voucherCode ?? '',
    TargetUrl: input.targetUrl ?? '',
    Links: input.links.length ? JSON.stringify(input.links) : '',
    Title: input.title,
    Description: input.description ?? '',
    Price: input.price ?? '',
    PriceEth: input.priceEth ?? '',
    PriceFiat: input.priceFiat ?? '',
    Env: input.env,
    Active: false,
    Status: 'open',
    SharedAt: new Date().toISOString(),
    ScanCount: 0,
    Redeemed: false,
    MaxUsages: input.maxUsages,
    Redemptions: input.redemptions,
  }
  const created = await noco<Row>(`${shares}/records`, { method: 'POST', body: JSON.stringify(body) })
  const rows = await queryShares(`(Id,eq,${num(created.Id)})`)
  if (!rows[0]) throw new Error('share row not found after create')
  return rows[0]
}

export async function updateShare(id: number, patch: SharePatch): Promise<void> {
  const { shares } = cfg()
  const row: Row = { Id: id }
  if (patch.active !== undefined) row.Active = patch.active
  if (patch.status !== undefined) row.Status = patch.status
  if (patch.scannedAt !== undefined) row.ScannedAt = patch.scannedAt
  if (patch.scanCount !== undefined) row.ScanCount = patch.scanCount
  if (patch.browserKey !== undefined) row.BrowserKey = patch.browserKey ?? ''
  if (patch.redeemed !== undefined) row.Redeemed = patch.redeemed
  if (patch.redemptions !== undefined) row.Redemptions = patch.redemptions
  if (patch.lastPretixCheck !== undefined) row.LastPretixCheck = patch.lastPretixCheck
  await noco(`${shares}/records`, { method: 'PATCH', body: JSON.stringify([row]) })
}

/** Makes `id` active, then converges on a single active row per env even when
 *  two admins race: everything but the newest active row (by SharedAt) is
 *  switched off. A superseded row nobody scanned is closed as well: the desk
 *  has moved on, and a photo of its QR must not work later. */
export async function activateShare(id: number, env: string): Promise<void> {
  const { shares } = cfg()
  await updateShare(id, { active: true })
  const active = await queryShares(`(Env,eq,${esc(env)})~and(Active,eq,true)`)
  const off = active.slice(1).map(s => ({ Id: s.id, Active: false, ...(s.status === 'open' ? { Status: 'closed' } : {}) }))
  if (off.length) await noco(`${shares}/records`, { method: 'PATCH', body: JSON.stringify(off) })
}

export async function getShareByToken(token: string, env: string): Promise<Share | null> {
  if (!TOKEN_RE.test(token)) return null
  const rows = await queryShares(`(Token,eq,${token})~and(Env,eq,${esc(env)})`, '&limit=1')
  return rows[0] ?? null
}

export async function getActiveShare(env: string): Promise<Share | null> {
  const rows = await queryShares(`(Env,eq,${esc(env)})~and(Active,eq,true)`, '&limit=1')
  return rows[0] ?? null
}

export async function listShares(env: string, limit = 100): Promise<Share[]> {
  return queryShares(`(Env,eq,${esc(env)})`, `&limit=${limit}`)
}

/** Removes share rows for good (their tokens die with them). */
export async function deleteShares(ids: number[]): Promise<void> {
  if (!ids.length) return
  const { shares } = cfg()
  await noco(`${shares}/records`, { method: 'DELETE', body: JSON.stringify(ids.map(Id => ({ Id }))) })
}

/** Empties the table for one env, page by page. Returns how many rows went. */
export async function deleteAllShares(env: string): Promise<number> {
  let total = 0
  for (;;) {
    const page = await listShares(env, 100)
    if (!page.length) return total
    await deleteShares(page.map(s => s.id))
    total += page.length
  }
}

/** Enabled shortcuts with a web URL, by Order. */
export async function listLinks(): Promise<QrLink[]> {
  const { links } = cfg()
  const data = await noco<{ list: Row[] }>(
    `${links}/records?where=${encodeURIComponent('(Enabled,eq,true)')}&sort=Order&limit=100`
  )
  return data.list.map(mapLink).filter(l => isWebUrl(l.url))
}

export type LinkPatch = Partial<Pick<QrLink, 'label' | 'url' | 'showOnRedeemPage' | 'order' | 'enabled'>>

export async function updateLink(id: number, patch: LinkPatch): Promise<void> {
  const { links } = cfg()
  const row: Row = { Id: id }
  if (patch.label !== undefined) row.Label = patch.label
  if (patch.url !== undefined) row.Url = patch.url
  if (patch.showOnRedeemPage !== undefined) row.ShowOnRedeemPage = patch.showOnRedeemPage
  if (patch.order !== undefined) row.Order = patch.order
  if (patch.enabled !== undefined) row.Enabled = patch.enabled
  await noco(`${links}/records`, { method: 'PATCH', body: JSON.stringify([row]) })
}

/** Removes a shortcut for good; shares that already snapshot it keep their copy. */
export async function deleteLink(id: number): Promise<void> {
  const { links } = cfg()
  await noco(`${links}/records`, { method: 'DELETE', body: JSON.stringify([{ Id: id }]) })
}

export async function createLink(input: { label: string; url: string; showOnRedeemPage: boolean }): Promise<QrLink> {
  const { links } = cfg()
  const existing = await listLinks()
  const order = existing.reduce((m, l) => Math.max(m, l.order), 0) + 10
  const created = await noco<Row>(`${links}/records`, {
    method: 'POST',
    body: JSON.stringify({ Label: input.label, Url: input.url, ShowOnRedeemPage: input.showOnRedeemPage, Order: order, Enabled: true }),
  })
  return { id: num(created.Id), label: input.label, url: input.url, showOnRedeemPage: input.showOnRedeemPage, order, enabled: true }
}
