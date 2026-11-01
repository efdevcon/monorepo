/**
 * One organiser-only tag per event day on every scheduled session, so the
 * programme team can email a day's speakers from Pretalx's mail composer
 * (filter by tag): "Day 1 - Tue 3 Nov", "Day 2 - Wed 4 Nov", ...
 *
 *   pnpm pretalx:day-tags <event>           # dry run: prints what would change, writes nothing
 *   pnpm pretalx:day-tags <event> --apply   # creates missing day tags, updates the sessions
 *
 * A session's day comes from its schedule slot(s), in the event's time zone;
 * a few sessions run inside another session's slot and have none of their own
 * (UNSCHEDULED below). Re-running is safe: a session that moved to another day
 * loses the old day tag and gets the new one, every other tag it carries is
 * kept, unchanged sessions are left alone. The tags are not public: Pretalx's
 * schedule and devcon-api's sync (which drops non-public tags) never show them.
 * Changing tags sends no emails.
 *
 * Auth: GETs with the event's read token, writes with PRETALX_API_KEY_WRITE_<EVENT>
 * (utils/config.ts). Tokens are never printed.
 */
import 'dotenv/config'
import { eventEnvName, getEventIdByPretalxSlug, getPretalxConfig } from '@/utils/config'

const event = process.argv[2]
const apply = process.argv.includes('--apply')
if (!event) {
  console.error('usage: pnpm pretalx:day-tags <event> [--apply]')
  process.exit(1)
}
const eventId = getEventIdByPretalxSlug(event)
if (!eventId) {
  console.error(`unknown Pretalx event ${event}; it must be one of the slugs in utils/config.ts`)
  process.exit(1)
}
const config = getPretalxConfig(eventId)
const BASE = `${config.PRETALX_BASE_URI}/events/${event}`
const readToken = config.PRETALX_API_KEY
const writeToken = config.PRETALX_API_KEY_WRITE
if (!readToken) {
  console.error(`${eventEnvName('PRETALX_API_KEY', eventId)} not set in .env`)
  process.exit(1)
}
if (apply && !writeToken) {
  console.error(`${eventEnvName('PRETALX_API_KEY_WRITE', eventId)} not set in .env`)
  process.exit(1)
}

/** Confirmed sessions with no slot of their own that run on a day all the same (parts of the Opening Ceremony). */
const UNSCHEDULED: Record<string, Record<string, string>> = {
  devcon8: {
    UQTFKT: '2026-11-03',
    DALFGB: '2026-11-03',
    KMRKHW: '2026-11-03',
    UCBU3V: '2026-11-03',
    QVCWKC: '2026-11-03',
    LZ3EJK: '2026-11-03',
  },
}

const TAG_COLOR = '#888888'
const CONCURRENCY = 4

interface Tag {
  id: number
  tag: string
  is_public: boolean
}
interface Submission {
  code: string
  title: string
  slots?: { start: string | null }[]
  tags?: Tag[]
}

async function api<T>(path: string, init: RequestInit = {}, token = readToken): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(path.startsWith('http') ? path : `${BASE}/${path}`, {
      ...init,
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) },
    })
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = 2000 * 2 ** attempt
      console.log(`  … ${init.method ?? 'GET'} ${path.split('?')[0]}: HTTP ${res.status}, retrying in ${wait / 1000}s`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path.split('?')[0]}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  }
}

async function all<T>(path: string): Promise<T[]> {
  const out: T[] = []
  let next: string | null = `${BASE}/${path}`
  while (next) {
    const page: { results: T[]; next: string | null } = await api(next)
    out.push(...page.results)
    next = page.next
  }
  return out
}

/** YYYY-MM-DD of an instant in the event's time zone. */
const dayOf = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))

/** "Day 2 - Wed 4 Nov" */
function dayTagName(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  const label = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
  return `Day ${n} - ${label}`
}

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++])
    })
  )
}

async function main() {
  const ev: { date_from: string; date_to: string; timezone: string } = await api('')
  const days: string[] = []
  for (let d = new Date(`${ev.date_from}T00:00:00Z`); d <= new Date(`${ev.date_to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1))
    days.push(d.toISOString().slice(0, 10))
  const nameOf = new Map(days.map((day, i) => [day, dayTagName(day, i + 1)]))
  console.log(`${event}: ${ev.date_from} to ${ev.date_to} (${ev.timezone}) · ${days.length} day tags: ${[...nameOf.values()].join(' · ')}`)

  const tags = await all<Tag>('tags/?limit=100')
  const byName = new Map(tags.map(t => [t.tag, t]))
  const missing = days.filter(day => !byName.has(nameOf.get(day)!))
  console.log(`tags in Pretalx: ${tags.length} · day tags present: ${days.length - missing.length} · to create: ${missing.length}`)
  if (apply) {
    for (const day of missing) {
      const created = await api<Tag>(
        'tags/',
        {
          method: 'POST',
          body: JSON.stringify({
            tag: nameOf.get(day),
            description: { en: 'Sessions scheduled on this day, for the day-of emails (organiser-only tag).' },
            color: TAG_COLOR,
            is_public: false,
          }),
        },
        writeToken
      )
      byName.set(created.tag, created)
      console.log(`  + created tag "${created.tag}" (#${created.id})`)
    }
  }
  const dayTagIds = new Set(days.map(day => byName.get(nameOf.get(day)!)?.id).filter((id): id is number => id !== undefined))
  // A day tag that exists but is public would show up on the schedule: say so.
  for (const day of days) {
    const t = byName.get(nameOf.get(day)!)
    if (t?.is_public) console.log(`  ! tag "${t.tag}" is public in Pretalx: set it to non-public so the schedule and the app do not show it`)
  }

  const sessions = await all<Submission>('submissions/?state=confirmed&limit=100&expand=slots,tags')
  const unscheduled = UNSCHEDULED[event] ?? {}
  const perDay: Record<string, number> = {}
  const noDay: string[] = []
  const outsideEvent: string[] = []
  const plan: { code: string; title: string; from: number[]; to: number[]; days: string[]; adds: string[] }[] = []
  let unchanged = 0
  for (const s of sessions) {
    let sDays = [...new Set((s.slots ?? []).filter(x => x.start).map(x => dayOf(x.start as string, ev.timezone)))]
    if (!sDays.length && unscheduled[s.code]) sDays = [unscheduled[s.code]]
    const known = sDays.filter(d => nameOf.has(d))
    if (sDays.length && known.length < sDays.length) outsideEvent.push(`${s.code} (${sDays.filter(d => !nameOf.has(d)).join(',')})`)
    if (!known.length) {
      noDay.push(s.code)
      continue
    }
    for (const d of known) perDay[d] = (perDay[d] ?? 0) + 1
    const current = (s.tags ?? []).map(t => t.id)
    const wanted = known.map(d => byName.get(nameOf.get(d)!)?.id).filter((id): id is number => id !== undefined)
    // Every non-day tag the session has, plus its day tag(s); compared as sets, order is Pretalx's.
    const to = [...current.filter(id => !dayTagIds.has(id)), ...wanted]
    const same =
      wanted.length === known.length &&
      to.length === current.length &&
      [...to].sort((a, b) => a - b).join() === [...current].sort((a, b) => a - b).join()
    if (same) unchanged++
    else {
      const adds = known.map(d => nameOf.get(d)!).filter(name => !current.includes(byName.get(name)?.id ?? -1))
      plan.push({ code: s.code, title: s.title, from: current, to, days: known, adds })
    }
  }

  console.log(`confirmed sessions: ${sessions.length}`)
  for (const day of days) console.log(`  ${nameOf.get(day)}: ${perDay[day] ?? 0} session(s)`)
  if (noDay.length) console.log(`  no day (no slot, not in UNSCHEDULED), left untagged: ${noDay.length} · ${noDay.join(', ')}`)
  if (outsideEvent.length) console.log(`  ! slots outside the event dates: ${outsideEvent.join(', ')}`)
  console.log(`sessions already right: ${unchanged} · to update: ${plan.length}`)
  for (const p of plan.slice(0, 5))
    console.log(
      `  ${p.code} ${p.title.slice(0, 50)} · keeps ${p.from.filter(id => !dayTagIds.has(id)).length} tag(s)${
        p.from.some(id => dayTagIds.has(id)) ? ', drops an old day tag' : ''
      }, adds "${p.adds.join('", "')}"`
    )
  if (plan.length > 5) console.log(`  … ${plan.length - 5} more`)

  if (!apply) {
    console.log(`dry run: nothing written. Add --apply to create ${missing.length} tag(s) and update ${plan.length} session(s).`)
    return
  }
  let done = 0
  let failed = 0
  await pool(plan, CONCURRENCY, async p => {
    try {
      await api(`submissions/${p.code}/`, { method: 'PATCH', body: JSON.stringify({ tags: p.to }) }, writeToken)
      done++
    } catch (e) {
      failed++
      console.log(`  ! ${p.code}: ${(e as Error).message}`)
    }
  })
  console.log(`updated ${done} session(s)${failed ? ` · FAILED ${failed}` : ''}`)
  if (failed) process.exit(1)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
