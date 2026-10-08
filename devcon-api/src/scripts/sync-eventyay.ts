/**
 * Sync a partner event's public eventyay (Pretalx fork) schedule into one of
 * our Pretalx events: sessions, their times and rooms, and their speakers.
 * Built for OpenTechSummit India (FOSSASIA), co-located with Devcon 8.
 *
 *   pnpm sync:eventyay <event>                       # dry run, prints the plan
 *   pnpm sync:eventyay <event> --apply               # write to Pretalx
 *   pnpm sync:eventyay <event> --apply --create-missing
 *   pnpm sync:eventyay <event> --emails <file.csv>   # attach speakers (see below)
 *   pnpm sync:eventyay <event> --speakers-template <file.csv>
 *
 * It is a sync, not an import: every run matches sessions on their source
 * code (kept in an organiser-only question, SOURCE_QUESTION below) and only
 * creates what is missing and updates what changed. Nothing is ever deleted:
 * a session that disappears from the source is reported, so a human decides.
 *
 * A session held several times (a workshop run twice) becomes one proposal
 * per run on our side, since our events do not allow several slots per
 * proposal: titles get a "(n/N)" suffix, the first run keeps the source code
 * and the others get "#2", "#3"... so the partner does not have to change
 * anything.
 *
 * Tags: the source track (AI, Community...) maps to one of our tags, added to
 * the proposal (tags set by hand are kept). Pretalx builds before 2026-03-31
 * reject every tag write; the sync then lists the tags to set by hand.
 *
 * Speakers need an email in Pretalx (add-speaker rejects a name alone), and
 * the public export has none. A speaker whose full name already exists on one
 * of the events in `reuseSpeakersFrom` is attached as that existing account,
 * so returning speakers keep one profile (name, bio, avatar left as they are,
 * only filled when empty). Everyone else gets a placeholder address: a team
 * mailbox (SYNC_PLACEHOLDER_EMAIL in .env) with a "+" suffix unique per source
 * speaker, so the profile exists with the eventyay bio and avatar, every
 * speaker stays a distinct Pretalx user, and a mail Pretalx would send lands
 * in that mailbox instead of bouncing. The partner contacts its speakers
 * itself. A real address can also be given per speaker in a CSV with columns
 * `code,email` (eventyay speaker code), kept OUTSIDE the repo since it is
 * personal data; `--speakers-template` writes the list of speakers to start
 * from. A speaker already attached with the placeholder is not swapped: that
 * is reported, to do by hand. Social links from eventyay go into our speaker
 * questions (X, Telegram, one website/GitHub/LinkedIn link), same rule: a real
 * account only gets gaps filled.
 *
 * Emails: nothing is SENT, but drafts can be QUEUED in the Pretalx outbox.
 * - The decision mail is generated when a proposal becomes "accepted",
 *   addressed to the speakers attached at that moment, so proposals are
 *   accepted and confirmed BEFORE any speaker is attached: no draft.
 * - Attaching a speaker always queues a "You have been added to a proposal"
 *   draft on our Pretalx build (the API cannot skip it). After a run that
 *   attached speakers, discard those drafts in the outbox (filter on the
 *   synced track) so a later "Send all" cannot mail them.
 * The schedule is never released: slots land in the WIP schedule and a human
 * releases it (pnpm pretalx:release).
 *
 * Auth: the event's write token, PRETALX_API_KEY_WRITE_<EVENT> (utils/config).
 */
import 'dotenv/config'
import fs from 'fs'
import sharp from 'sharp'
import { eventEnvName, getPretalxConfig } from '@/utils/config'

// ── Per-target mapping. Names, not ids, so the same config reads on any event. ──
interface TargetMapping {
  source: string // eventyay event base URL
  sourceKey: string // prefix of the stored source id
  track: string // every synced session goes to this track
  rooms: Record<string, string | null> // source room name -> our room name (null: not mapped yet)
  types: Record<string, string> // source session type -> our session type
  defaultType: string // for a source type not in `types` (reported)
  tags: Record<string, string> // source track -> our tag
  state: 'accepted' | 'confirmed'
  // Events whose speakers are reused when the full name matches, first match wins.
  // Only the event itself for test: real accounts must not land on test proposals.
  reuseSpeakersFrom: string[]
}

// The durations come from the slots, not from the type defaults.
const OTS_TYPES = {
  Talk: 'CLS - Talk (Open Tech Summit)',
  'Lightning Talk': 'CLS - Lightning Talk (Open Tech Summit)',
  Workshop: 'CLS - Miniworkshop (Open Tech Summit)',
  'Mini Workshop': 'CLS - Miniworkshop (Open Tech Summit)',
  'Panel Discussion': 'CLS - Panel (Open Tech Summit)',
  'Q&A': 'CLS - Panel (Open Tech Summit)',
  'Spot-on': 'CLS - Panel (Open Tech Summit)',
}
const OTS_TAGS = {
  AI: 'AI',
  Community: 'Community',
  Development: 'Develop',
  'OSS in Ethereum': 'OSS in Ethereum',
  Cybersecurity: 'Cybersecurity',
  'Open Hardware': 'Hardware',
  'Cloud & DevOps': 'Infrastructure',
}

const TARGETS: Record<string, TargetMapping> = {
  'test-devcon-8': {
    source: 'https://eventyay.com/fossasia/ots2026',
    sourceKey: 'eventyay:fossasia/ots2026',
    track: '[CLS] - OTS',
    rooms: { 'Main Stage': 'Stage 6 (CLS)', 'Builders Room': 'CLS Stage - Builders Room' },
    types: OTS_TYPES,
    defaultType: 'CLS - Talk (Open Tech Summit)',
    tags: OTS_TAGS,
    state: 'confirmed',
    reuseSpeakersFrom: ['test-devcon-8'],
  },
  devcon8: {
    source: 'https://eventyay.com/fossasia/ots2026',
    sourceKey: 'eventyay:fossasia/ots2026',
    track: '[CLS] - OTS',
    rooms: { 'Main Stage': 'CLS Stage', 'Builders Room': 'CLS Stage - Builders Room' },
    types: OTS_TYPES,
    defaultType: 'CLS - Talk (Open Tech Summit)',
    tags: OTS_TAGS,
    state: 'confirmed',
    reuseSpeakersFrom: ['devcon8', 'devcon-7'], // config ids (utils/config.ts), not Pretalx slugs
  },
}

const SOURCE_QUESTION = 'Sync source ID'
const PLACEHOLDER_MAILBOX = process.env.SYNC_PLACEHOLDER_EMAIL || ''

// ── CLI ──
const args = process.argv.slice(2)
const eventId = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.match(/^--(emails|speakers-template)$/))
const flag = (name: string) => args.includes(name)
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const APPLY = flag('--apply')
const CREATE_MISSING = flag('--create-missing')
const EMAILS_FILE = opt('--emails')
const TEMPLATE_FILE = opt('--speakers-template')

if (!eventId || !TARGETS[eventId]) {
  console.error(`Usage: pnpm sync:eventyay <${Object.keys(TARGETS).join('|')}> [--apply] [--create-missing] [--emails file.csv] [--speakers-template file.csv]`)
  process.exit(1)
}
const map = TARGETS[eventId]
const config = getPretalxConfig(eventId)
const token = config.PRETALX_API_KEY_WRITE
if (!token) {
  console.error(`${eventEnvName('PRETALX_API_KEY_WRITE', eventId)} is not set`)
  process.exit(1)
}
if (!/^[^@\s+]+@[^@\s]+\.[^@\s]+$/.test(PLACEHOLDER_MAILBOX)) {
  console.error('SYNC_PLACEHOLDER_EMAIL is not set: the mailbox that owns the placeholder speaker addresses')
  process.exit(1)
}
const API = config.PRETALX_BASE_URI
const EV = `${API}/events/${config.PRETALX_EVENT_NAME}`
const H = { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }

// ── Small helpers ──
const counts: Record<string, number> = {}
const bump = (k: string) => (counts[k] = (counts[k] || 0) + 1)
const notes: string[] = []
const line = (msg: string) => console.log(`  ${msg}`)
const i18n = (v: any): string => (typeof v === 'string' ? v : v?.en ?? Object.values(v ?? {})[0] ?? '') as string

async function api(method: string, path: string, body?: any): Promise<any> {
  const url = path.startsWith('http') ? path : `${EV}/${path}`
  const res = await fetch(url, { method, headers: H, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${url.replace(API, '')} -> ${res.status} ${text.replace(/\s+/g, ' ').slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
async function all(path: string): Promise<any[]> {
  const out: any[] = []
  let url: string | null = `${EV}/${path}${path.includes('?') ? '&' : '?'}page_size=100`
  while (url) {
    const d: any = await api('GET', url)
    out.push(...(d.results ?? []))
    url = d.next
  }
  return out
}
/** Write when --apply, otherwise only describe. */
async function write<T>(what: string, fn: () => Promise<T>): Promise<T | undefined> {
  line(`${APPLY ? '' : '[dry] '}${what}`)
  return APPLY ? fn() : undefined
}

/** eventyay stores HTML; Pretalx renders markdown. A small, lossy-on-purpose conversion. */
function htmlToMarkdown(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseCsv(file: string): Map<string, string> {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
  const header = rows.shift()!.split(',').map(h => h.trim().toLowerCase())
  const ci = header.indexOf('code')
  const ei = header.indexOf('email')
  if (ci < 0 || ei < 0) throw new Error(`${file}: needs "code" and "email" columns`)
  const out = new Map<string, string>()
  for (const r of rows) {
    const cells = r.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    if (cells[ci] && cells[ei]) out.set(cells[ci], cells[ei].toLowerCase())
  }
  return out
}

// ── Main ──
;(async () => {
  console.log(`▶ eventyay sync · ${map.source} -> ${config.PRETALX_EVENT_NAME} · ${APPLY ? 'APPLY' : 'dry run'}${CREATE_MISSING ? ' · create missing' : ''}`)

  // Source
  const widget: any = await (await fetch(`${map.source}/schedule/widgets/schedule.json`)).json()
  const srcSpeakersRaw: any = await (await fetch(`${map.source}/speakers/?format=json`)).json()
  const srcSpeakers = new Map<string, any>((Array.isArray(srcSpeakersRaw) ? srcSpeakersRaw : srcSpeakersRaw.results).map((s: any) => [s.code, s]))
  const srcRooms = new Map<number, string>(widget.rooms.map((r: any) => [r.id, i18n(r.name)]))
  const srcTracks = new Map<number, string>((widget.tracks ?? []).map((r: any) => [r.id, i18n(r.name)]))
  const entries = widget.talks.filter((t: any) => t.code) // breaks have no code
  // A session held several times appears once per slot in the source; each run is a unit here.
  const occurrences = new Map<string, any[]>()
  for (const t of entries) occurrences.set(t.code, [...(occurrences.get(t.code) ?? []), t])
  for (const list of occurrences.values()) list.sort((a, b) => a.start.localeCompare(b.start))
  const sessions = [...occurrences.values()].map(list => list[0])
  const units = [...occurrences.entries()].flatMap(([code, list]) =>
    list.map((talk, i) => ({ key: i ? `${code}#${i + 1}` : code, talk, run: i + 1, runs: list.length }))
  )
  const minutes = (t: any) => Math.round((new Date(t.end).getTime() - new Date(t.start).getTime()) / 60000)
  console.log(`  source: ${sessions.length} sessions in ${entries.length} slots, ${srcSpeakers.size} speakers, ${widget.talks.length - entries.length} breaks skipped`)

  if (TEMPLATE_FILE) {
    const rows = ['code,name,sessions,email']
    for (const s of srcSpeakers.values()) {
      const titles = sessions.filter((t: any) => t.speakers?.includes(s.code)).map((t: any) => i18n(t.title).replace(/[",]/g, ' '))
      rows.push(`${s.code},"${s.name.replace(/"/g, '')}","${titles.join(' | ')}",`)
    }
    fs.writeFileSync(TEMPLATE_FILE, rows.join('\n') + '\n')
    console.log(`  wrote speaker template (${srcSpeakers.size} rows) to ${TEMPLATE_FILE}`)
  }

  // Target reference data
  const [rooms, types, tracks, tags, questions] = await Promise.all([all('rooms/'), all('submission-types/'), all('tracks/'), all('tags/'), all('questions/')])
  const roomByName = new Map(rooms.map((r: any) => [i18n(r.name), r.id]))
  const typeByName = new Map(types.map((t: any) => [i18n(t.name), t.id]))
  const tagByName = new Map(tags.map((t: any) => [i18n(t.tag), t.id]))

  let trackId = tracks.find((t: any) => i18n(t.name) === map.track)?.id
  if (!trackId) {
    if (!CREATE_MISSING) throw new Error(`track "${map.track}" missing (re-run with --create-missing to create it)`)
    const t = await write(`create track "${map.track}"`, () => api('POST', 'tracks/', { name: { en: map.track }, color: '#4b5563' }))
    trackId = t?.id
  }
  let question = questions.find((q: any) => i18n(q.question) === SOURCE_QUESTION && q.target === 'submission')
  if (!question) {
    if (!CREATE_MISSING) throw new Error(`question "${SOURCE_QUESTION}" missing (re-run with --create-missing to create it)`)
    question = await write(`create organiser-only question "${SOURCE_QUESTION}"`, () =>
      api('POST', 'questions/', {
        question: { en: SOURCE_QUESTION },
        help_text: { en: '[Read-only, set by the Devcon team] Source of a session synced from a partner schedule.' },
        variant: 'string',
        target: 'submission',
        question_required: 'optional',
        active: true,
        is_public: false,
        is_visible_to_reviewers: false,
        contains_personal_data: false,
        freeze_after: '2020-01-01T00:00:00Z',
      })
    )
  }

  // Existing synced proposals, keyed by source code
  const bySource = new Map<string, any>()
  if (question?.id) {
    const answers = await all(`answers/?question=${question.id}`)
    const subCodes = new Map<string, string>()
    for (const a of answers) if ((a.answer || '').startsWith(`${map.sourceKey}:`)) subCodes.set(a.answer.slice(map.sourceKey.length + 1), a.submission)
    if (subCodes.size) {
      const subs = await all('submissions/?expand=speakers')
      const byCode = new Map(subs.map((s: any) => [s.code, s]))
      for (const [src, ours] of subCodes) if (byCode.has(ours)) bySource.set(src, byCode.get(ours))
    }
  }
  console.log(`  target: ${bySource.size} sessions already synced\n`)

  const wipId = (await api('GET', 'schedules/?page_size=50')).results.find((x: any) => x.version === 'wip')?.id
  const wipSlots = async (code: string) =>
    ((await api('GET', `slots/?submission=${code}&page_size=50`)).results ?? []).filter((x: any) => x.schedule === wipId).sort((a: any, b: any) => a.id - b.id)
  const emails = EMAILS_FILE ? parseCsv(EMAILS_FILE) : new Map<string, string>()
  const [mailbox, mailDomain] = PLACEHOLDER_MAILBOX.split('@')
  const placeholderEmail = (code: string) => `${mailbox}+${map.sourceKey.split('/').pop()}-${code}@${mailDomain}`.toLowerCase()
  const isPlaceholder = (e: string) => e.startsWith(`${mailbox}+`) && e.endsWith(`@${mailDomain}`)
  // Existing accounts, by normalised full name, from the events listed in the mapping
  const normName = (n: string) => n.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
  const known = new Map<string, { email: string; event: string }>()
  for (const ev of map.reuseSpeakersFrom) {
    const c = getPretalxConfig(ev)
    const key = c.PRETALX_API_KEY_WRITE || c.PRETALX_API_KEY
    let url: string | null = `${c.PRETALX_BASE_URI}/events/${c.PRETALX_EVENT_NAME}/speakers/?page_size=100`
    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Token ${key}` } })
      if (!res.ok) throw new Error(`GET ${ev} speakers -> ${res.status}`)
      const d: any = await res.json()
      for (const sp of d.results ?? []) {
        const e = (sp.email || '').toLowerCase()
        if (e && sp.name && !isPlaceholder(e) && !known.has(normName(sp.name))) known.set(normName(sp.name), { email: e, event: ev })
      }
      url = d.next
    }
  }
  line(`existing accounts available for reuse: ${known.size} (${map.reuseSpeakersFrom.join(', ')})`)

  // Social links -> our speaker questions (ids per event in utils/config.ts). One
  // link per question; the website question takes website, else GitHub, else LinkedIn.
  const socialQuestions: Record<string, number | undefined> = {
    x: config.PRETALX_QUESTIONS_TWITTER,
    website: config.PRETALX_QUESTIONS_WEBSITE,
    telegram: config.PRETALX_QUESTIONS_TELEGRAM,
    farcaster: config.PRETALX_QUESTIONS_FARCASTER,
  }
  const socialAnswers = (sp: any): [number, string][] => {
    const links = new Map<string, string>((sp?.social_links ?? []).map((l: any) => [String(l.key).toLowerCase(), String(l.url || '').trim()]))
    const pick = (...keys: string[]) => keys.map(k => links.get(k)).find(Boolean)
    const wanted: [string, string | undefined][] = [
      ['x', pick('x', 'twitter')],
      ['website', pick('website', 'homepage', 'github', 'linkedin')],
      ['telegram', pick('telegram')?.replace(/^https?:\/\/t\.me\//i, '@')],
      ['farcaster', pick('farcaster', 'warpcast')],
    ]
    return wanted.filter(([k, v]) => v && socialQuestions[k]).map(([k, v]) => [socialQuestions[k]!, v!])
  }
  // Current answers to those questions, by question then speaker code (read once)
  const currentAnswers = new Map<number, Map<string, { id: number; answer: string }>>()
  for (const qid of [...new Set(Object.values(socialQuestions).filter(Boolean) as number[])]) {
    const m = new Map<string, { id: number; answer: string }>()
    for (const a of await all(`answers/?question=${qid}`)) if (a.person) m.set(a.person, { id: a.id, answer: a.answer || '' })
    currentAnswers.set(qid, m)
  }
  const missingRooms = new Set<string>()
  const missingTags = new Set<string>()
  const untagged = new Map<string, number>()
  const tagsToSet = new Map<string, string[]>()

  for (const u of units) {
    const t = u.talk
    // A repeated session gets a numbered title, so the copies stay apart everywhere
    // (Pretalx, our data where ids are title slugs, deck names).
    const title = u.runs > 1 ? `${i18n(t.title)} (${u.run}/${u.runs})` : i18n(t.title)
    const srcRoom = srcRooms.get(t.room) ?? `room ${t.room}`
    const ourRoomName = map.rooms[srcRoom]
    const roomId = ourRoomName ? roomByName.get(ourRoomName) : undefined
    if (!roomId) missingRooms.add(ourRoomName ? `${srcRoom} -> "${ourRoomName}" (not found)` : srcRoom)
    const srcType = i18n(t.session_type)
    const typeName = map.types[srcType] ?? map.defaultType
    if (!map.types[srcType]) notes.push(`[${u.key}] ${title}: source type "${srcType}" is not mapped, used "${map.defaultType}"`)
    const srcTrack = srcTracks.get(t.track) ?? ''
    const tagName = map.tags[srcTrack]
    const tagId = tagName ? tagByName.get(tagName) : undefined
    if (tagName && !tagId) missingTags.add(tagName)
    if (!tagName && srcTrack) untagged.set(srcTrack, (untagged.get(srcTrack) ?? 0) + 1)
    const fields = {
      title,
      abstract: htmlToMarkdown(t.abstract || '') || title,
      description: htmlToMarkdown(t.description || ''),
      submission_type: typeByName.get(typeName),
      track: trackId,
      // the slot is the truth: eventyay's duration field can disagree with it
      duration: minutes(t),
      slot_count: 1,
      do_not_record: !!t.do_not_record,
      content_locale: 'en',
    }
    if (!fields.submission_type) throw new Error(`session type "${typeName}" not found on ${config.PRETALX_EVENT_NAME}`)

    console.log(`▶ [${u.key}] ${title}${u.runs > 1 ? ` (run ${u.run} of ${u.runs})` : ''}`)
    let ours = bySource.get(u.key)

    // 1. create or update
    if (!ours) {
      bump('created')
      ours = await write(`create proposal (${typeName}, ${fields.duration} min${tagName ? `, tag ${tagName}` : ''})`, () =>
        api('POST', 'submissions/', { ...fields, tags: tagId ? [tagId] : [] })
      )
      if (ours) await api('POST', 'answers/', { question: question.id, submission: ours.code, answer: `${map.sourceKey}:${u.key}` })
    } else {
      const changed = Object.entries(fields).filter(([k, v]) => (ours[k] ?? '') !== (v ?? '') && !(k === 'description' && !ours[k] && !v))
      if (changed.length) {
        bump('updated')
        await write(`update ${changed.map(([k]) => k).join(', ')}`, () => api('PATCH', `submissions/${ours.code}/`, Object.fromEntries(changed)))
      } else bump('unchanged')
    }
    if (!ours) continue // dry run of a new session stops here
    // tags: add the mapped one, keep the others (set by hand)
    const have: number[] = (ours.tags ?? []).map((x: any) => (typeof x === 'object' && x ? x.id : x))
    if (tagId && !have.includes(tagId)) {
      bump('tags')
      try {
        await write(`tag ${tagName}`, () => api('PATCH', `submissions/${ours.code}/`, { tags: [...have, tagId] }))
      } catch (e) {
        tagsToSet.set(tagName, [...(tagsToSet.get(tagName) ?? []), ours.code])
        line(`! tag not written: ${(e as Error).message.slice(0, 120)}`)
      }
    }

    // 2. state: accept and confirm BEFORE speakers exist, so no decision mail is generated
    if (ours.state === 'submitted' || (ours.state === 'accepted' && map.state === 'confirmed')) {
      const steps = ours.state === 'submitted' ? (map.state === 'confirmed' ? ['accept', 'confirm'] : ['accept']) : ['confirm']
      for (const s of steps) {
        const res = await write(`${s}`, () => api('POST', `submissions/${ours.code}/${s}/`))
        if (res) ours.state = res.state
      }
    } else if (!['accepted', 'confirmed'].includes(ours.state)) {
      notes.push(`[${u.key}] ${title}: state is "${ours.state}" in Pretalx, left alone`)
    }

    // 3. the slot in the WIP schedule (room + start; the end follows the duration)
    if (roomId) {
      const slot = (APPLY || bySource.has(u.key) ? await wipSlots(ours.code) : [])[0]
      const label = `schedule ${ourRoomName} ${t.start.slice(11, 16)}-${t.end.slice(11, 16)}`
      const same = (a: string | null, b: string) => !!a && new Date(a).getTime() === new Date(b).getTime()
      if (!slot) line(`${APPLY ? '! no WIP slot for' : '[dry]'} ${label}`)
      else if (slot.room !== roomId || !same(slot.start, t.start) || !same(slot.end, t.end)) {
        bump('slots')
        await write(label, () => api('PATCH', `slots/${slot.id}/`, { room: roomId, start: t.start }))
        // Pretalx keeps the old end when a slot moves and only recomputes it when the
        // proposal's duration changes (a same-value update is ignored): nudge it.
        if (APPLY && !same((await api('GET', `slots/${slot.id}/`)).end, t.end)) {
          bump('slot ends recomputed')
          await api('PATCH', `submissions/${ours.code}/`, { duration: fields.duration + 1 })
          await api('PATCH', `submissions/${ours.code}/`, { duration: fields.duration })
        }
      }
    } else line(`not scheduled: room "${srcRoom}" has no match`)

    // 4. speakers: the real email when known, else the placeholder
    const current = new Set<string>((ours.speakers ?? []).map((s: any) => (s.email || '').toLowerCase()))
    for (const sc of t.speakers ?? []) {
      const src = srcSpeakers.get(sc)
      const existing = src?.name ? known.get(normName(src.name)) : undefined
      const real = emails.get(sc) ?? existing?.email
      const email = real ?? placeholderEmail(sc)
      if (real && current.has(placeholderEmail(sc))) {
        notes.push(`[${u.key}] ${title}: ${src?.name ?? sc} is attached with the placeholder address, replace it by hand with the real one`)
        continue
      }
      if (!current.has(email)) {
        const how = emails.get(sc) ? '' : existing ? ` (existing account on ${existing.event})` : ' (placeholder email)'
        bump(emails.get(sc) ? 'speakers attached' : existing ? 'speakers attached (existing account)' : 'speakers attached (placeholder email)')
        await write(`attach speaker ${src?.name ?? sc}${how}`, () => api('POST', `submissions/${ours.code}/add-speaker/`, { email, name: src?.name }))
      }
      if (!APPLY) {
        const planned = socialAnswers(src)
        if (planned.length) line(`[dry] social links for ${src?.name ?? sc}: ${planned.map(([q, v]) => `${v} -> q${q}`).join(', ')}`)
        continue
      }
      const fresh = await api('GET', `submissions/${ours.code}/?expand=speakers`)
      const sp = fresh.speakers.find((s: any) => (s.email || '').toLowerCase() === email)
      if (!sp) continue
      // A real account keeps its own name, bio and avatar; only gaps are filled.
      const bio = htmlToMarkdown(src?.biography || '')
      const patch: Record<string, any> = {}
      if (src?.name && sp.name !== src.name && !real) patch.name = src.name
      if (bio && sp.biography !== bio && (!real || !sp.biography)) patch.biography = bio
      if (!sp.avatar_url && src?.avatar) {
        const img = await fetch(src.avatar)
        if (img.ok) {
          let ct = img.headers.get('content-type') || 'image/jpeg'
          let body = Buffer.from(await img.arrayBuffer())
          // Pretalx only accepts jpeg, png and gif uploads; eventyay serves some avatars as webp.
          if (!/image\/(jpeg|png|gif)/.test(ct)) {
            body = await sharp(body).png().toBuffer()
            ct = 'image/png'
          }
          const ext = ct.includes('png') ? 'png' : ct.includes('gif') ? 'gif' : 'jpg'
          const up = await fetch(`${API}/upload/`, {
            method: 'POST',
            headers: { Authorization: `Token ${token}`, 'Content-Type': ct, 'Content-Disposition': `attachment; filename="avatar.${ext}"` },
            body,
          })
          if (up.ok) patch.avatar = (await up.json()).id
          else line(`! avatar upload for ${src.name} failed: ${up.status} ${(await up.text()).slice(0, 80)}`)
        }
      }
      if (Object.keys(patch).length) {
        bump('speaker profiles updated')
        await write(`update speaker ${src?.name}: ${Object.keys(patch).join(', ')}`, () => api('PATCH', `speakers/${sp.code}/`, patch))
      }
      // social links: placeholders follow eventyay, real accounts only get gaps filled
      for (const [qid, value] of socialAnswers(src)) {
        const cur = currentAnswers.get(qid)?.get(sp.code)
        if (cur?.answer === value) continue
        if (cur && real) continue
        bump('social links written')
        if (!cur) {
          const created = await api('POST', 'answers/', { question: qid, person: sp.code, answer: value })
          currentAnswers.get(qid)?.set(sp.code, { id: created.id, answer: value })
        } else {
          await api('PATCH', `answers/${cur.id}/`, { answer: value })
          cur.answer = value
        }
        line(`social link ${value} -> question ${qid}`)
      }
    }
  }

  // Sessions (or runs) that left the source
  const live = new Set(units.map(u => u.key))
  for (const [src, ours] of bySource) if (!live.has(src)) notes.push(`[${src}] -> ${ours.code} "${ours.title}" is no longer in the source schedule (not deleted)`)

  console.log(`\nDone · ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ') || 'nothing to do'}`)
  if (missingRooms.size) console.log(`Rooms without a match (sessions left unscheduled): ${[...missingRooms].join(', ')}`)
  if (missingTags.size) console.log(`Tags not found on ${config.PRETALX_EVENT_NAME}: ${[...missingTags].join(', ')}`)
  if (untagged.size) console.log(`Source tracks without a tag mapping: ${[...untagged].map(([k, v]) => `${k} (${v})`).join(', ')}`)
  if (tagsToSet.size) {
    console.log(`Tags to set by hand in Pretalx (this Pretalx rejected the tag writes):`)
    for (const [tag, codes] of tagsToSet) console.log(`  ${tag}: ${codes.join(', ')}`)
  }
  for (const n of notes) console.log(`! ${n}`)
  const attached = (counts['speakers attached'] ?? 0) + (counts['speakers attached (placeholder email)'] ?? 0) + (counts['speakers attached (existing account)'] ?? 0)
  if (APPLY && attached)
    console.log(
      `\n! ${attached} "You have been added to a proposal" draft(s) are now in the outbox:\n  ${config.PRETALX_BASE_URI.replace(/\/api$/, '')}/orga/event/${config.PRETALX_EVENT_NAME}/mails/outbox/\n  Discard them (filter on the "${map.track}" track) so a "Send all" cannot send them.`
    )
  if (!APPLY) console.log('Dry run: nothing was written. Re-run with --apply.')
})().catch(e => {
  console.error(`✗ ${e.message}`)
  process.exit(1)
})
