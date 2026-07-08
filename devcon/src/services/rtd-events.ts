/**
 * Road to Devcon community events, sourced from the NocoDB "rtd-event-form"
 * submissions (form view id `vwbigbclgtvfvr62`).
 *
 * Server-only: relies on NOCODB_BASE_URL + NOCODB_API_TOKEN (and Supabase
 * credentials for image mirroring). Call from an API route or getStaticProps,
 * never the browser.
 */
import { listViewRows } from './nocodb'
import { ensurePublicEventImage, type NocoAttachment } from './rtd-event-images'
import { EVENT_TYPES, gradientFor, type EventType, type RoadEvent } from 'components/domain/road-to-devcon/events'

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
  updatedPostApproval: ['Updated post-approval', 'Updated Post-Approval', 'Updated post approval'],
} as const

/** Interpret a NocoDB checkbox/boolean cell as true. */
function isChecked(v: any): boolean {
  if (v === true) return true
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return ['true', '1', 'yes', 'checked'].includes(v.trim().toLowerCase())
  return false
}

function pick(row: Record<string, any>, keys: readonly string[]): any {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

/** Parse a NocoDB attachment cell and return its first image attachment, if any. */
function firstImageAttachment(value: any): NocoAttachment | undefined {
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
  return a
}

/**
 * Fallback image URL through the `/api/nocodb/file` proxy (short-lived signed
 * URL, uncacheable — only used when mirroring to Supabase Storage fails).
 */
function proxyImageUrl(a: NocoAttachment): string | undefined {
  const name = a?.title ? `&filename=${encodeURIComponent(a.title)}` : ''
  if (a?.signedUrl) return `/api/nocodb/file/?url=${encodeURIComponent(a.signedUrl)}${name}`
  if (a?.signedPath) return `/api/nocodb/file/?path=${encodeURIComponent(a.signedPath)}${name}`
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
  // Edited after approval → hide until an admin re-reviews and clears the flag.
  if (isChecked(pick(row, FIELDS.updatedPostApproval))) return false

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
    // if (['reject', 'declin', 'pending', 'spam', 'hidden', 'draft'].some(k => s.includes(k))) return false
    return ['approved'].some(k => s.includes(k)) // human note: whole function is overkill, but this is pretty safe and legible unless someone goes wild on the column names
  }
  // Fail-closed: with no approval/published signal, hide the row rather than
  // leak an unreviewed submission onto the public page. A row shows only when a
  // Published/Approved flag is truthy or a Status column says "approved".
  return false
}

export async function getRoadToDevconEvents(): Promise<RoadEvent[]> {
  const rows = await listViewRows(RTD_EVENT_FORM_VIEW_ID)

  const events: RoadEvent[] = []
  const images: Array<{ event: RoadEvent; rowId: string | number; att: NocoAttachment }> = []
  for (const row of rows) {
    if (!isVisible(row)) continue

    const title = pick(row, FIELDS.title)
    const date = toISODate(pick(row, FIELDS.date))
    // A card needs at least a title and a placeable date.
    if (!title || !date) continue

    const types = parseTypes(pick(row, FIELDS.types))
    const rawUrl = pick(row, FIELDS.url)
    const rowId = row.Id ?? row.id ?? String(title)
    const id = `nocodb-${rowId}`

    let city = pick(row, FIELDS.city)
    if (!city) city = types.includes('Virtual') ? 'Virtual' : 'TBA'

    const event: RoadEvent = {
      id,
      title: String(title),
      host: String(pick(row, FIELDS.host) ?? '').trim() || 'Community',
      city: String(city),
      date,
      types,
      // null, not undefined — getStaticProps serializes null but throws on undefined.
      url: rawUrl ? String(rawUrl) : null,
      image: null,
      gradient: gradientFor(id),
    }
    events.push(event)

    const att = firstImageAttachment(pick(row, FIELDS.image))
    if (att) images.push({ event, rowId, att })
  }

  // Mirror attachments into Supabase Storage (no-op after the first time) so
  // cards get stable public URLs. Runs only at build/revalidate, never per
  // visitor. A failed mirror falls back to the uncacheable proxy URL rather
  // than dropping the image.
  await Promise.all(
    images.map(async ({ event, rowId, att }) => {
      try {
        event.image = (await ensurePublicEventImage(rowId, att)) ?? proxyImageUrl(att) ?? null
      } catch (e) {
        console.warn(`[rtd-events] image mirror failed for row ${rowId}, using proxy:`, (e as Error).message)
        event.image = proxyImageUrl(att) ?? null
      }
    })
  )

  events.sort((a, b) => a.date.localeCompare(b.date))
  return events
}
