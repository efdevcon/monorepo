/**
 * Road to Devcon community events, sourced from the NocoDB "rtd-event-form"
 * submissions (form view id `vwbigbclgtvfvr62`).
 *
 * Server-only: relies on NOCODB_BASE_URL + NOCODB_API_TOKEN. Call from an API
 * route or getStaticProps, never the browser.
 */
import { listViewRows } from './nocodb'
import {
  EVENT_TYPES,
  gradientFor,
  type EventType,
  type RoadEvent,
} from 'components/domain/road-to-devcon/events'

const RTD_EVENT_FORM_VIEW_ID = 'vwbigbclgtvfvr62'

// NocoDB column titles → our fields (matches the rtd-event-form table). The
// first matching, non-empty column wins; extra fallbacks tolerate renames.
const FIELDS = {
  title: ['Event name', 'Event Name', 'Title', 'Name'],
  host: ['Host', 'Organizer', 'Hosted By', 'Community'],
  city: ['Event city', 'City', 'Location', 'Venue'],
  date: ['Event date', 'Date', 'Start Date'],
  url: ['Event link', 'Link', 'URL', 'Website'],
  image: ['Event image or logo', 'Event Image', 'Image', 'Logo'],
  // The form has no type/tags column today; kept so chips light up if one is added.
  types: ['Type', 'Event Type', 'Tags', 'Category', 'Format'],
  published: ['Published', 'Approved', 'Visible'],
  status: ['Status', 'Approval Status'],
} as const

function pick(row: Record<string, any>, keys: readonly string[]): any {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

/**
 * Turn a NocoDB attachment cell into a same-origin image URL via the
 * `/api/nocodb/file` proxy (which only accepts NocoDB's short-lived signed
 * `/dltemp/` URLs). Returns undefined for non-image or empty attachments.
 */
function attachmentImageUrl(value: any): string | undefined {
  let arr = value
  if (typeof value === 'string') {
    try {
      arr = JSON.parse(value)
    } catch {
      return undefined
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return undefined
  const a = arr[0]
  if (a?.mimetype && !String(a.mimetype).startsWith('image/')) return undefined
  const name = a?.title ? `&filename=${encodeURIComponent(a.title)}` : ''
  if (a?.signedUrl) return `/api/nocodb/file?url=${encodeURIComponent(a.signedUrl)}${name}`
  if (a?.signedPath) return `/api/nocodb/file?path=${encodeURIComponent(a.signedPath)}${name}`
  return undefined
}

/** Normalize a NocoDB date/datetime to a `YYYY-MM-DD` string, or null if unparseable. */
function toISODate(value: any): string | null {
  if (!value) return null
  const s = String(value)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/** Split a multi-select / comma string into known EventTypes (best-effort). */
function parseTypes(value: any): EventType[] {
  if (!value) return []
  const parts = Array.isArray(value) ? value : String(value).split(',')
  const known = new Set<string>(EVENT_TYPES as readonly string[])
  const out: EventType[] = []
  for (const p of parts) {
    const t = String(p).trim()
    const match = [...known].find(k => k.toLowerCase() === t.toLowerCase())
    if (match && !out.includes(match as EventType)) out.push(match as EventType)
  }
  return out
}

/** A row is shown unless a Published/Approved flag or Status column says otherwise. */
function isVisible(row: Record<string, any>): boolean {
  const published = pick(row, FIELDS.published)
  if (published !== undefined) {
    if (typeof published === 'boolean') return published
    const s = String(published).toLowerCase()
    return !['false', 'no', '0', 'unpublished', 'hidden'].includes(s)
  }
  const status = pick(row, FIELDS.status)
  if (status !== undefined) {
    // Status values carry decoration/emoji (e.g. "Approved ✅"), so match on
    // substring rather than equality.
    const s = String(status).toLowerCase()
    if (['reject', 'declin', 'pending', 'spam', 'hidden', 'draft'].some(k => s.includes(k))) return false
    return ['approved', 'published', 'live', 'accepted'].some(k => s.includes(k))
  }
  return true // no gating column → show it
}

export async function getRoadToDevconEvents(): Promise<RoadEvent[]> {
  const rows = await listViewRows(RTD_EVENT_FORM_VIEW_ID)

  const events: RoadEvent[] = []
  for (const row of rows) {
    if (!isVisible(row)) continue

    const title = pick(row, FIELDS.title)
    const date = toISODate(pick(row, FIELDS.date))
    // A card needs at least a title and a placeable date.
    if (!title || !date) continue

    const types = parseTypes(pick(row, FIELDS.types))
    const rawUrl = pick(row, FIELDS.url)
    const id = `nocodb-${row.Id ?? row.id ?? title}`

    let city = pick(row, FIELDS.city)
    if (!city) city = types.includes('Virtual') ? 'Virtual' : 'TBA'

    events.push({
      id,
      title: String(title),
      host: String(pick(row, FIELDS.host) ?? '').trim() || 'Community',
      city: String(city),
      date,
      types,
      url: rawUrl ? String(rawUrl) : undefined,
      image: attachmentImageUrl(pick(row, FIELDS.image)),
      gradient: gradientFor(id),
    })
  }

  events.sort((a, b) => a.date.localeCompare(b.date))
  return events
}
