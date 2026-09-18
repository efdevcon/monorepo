import { GetData } from '@/clients/filesystem'
import { GetLastcheduleUpdate, GetRooms, GetSessions, GetSpeakers, getPublishedScheduleVersion } from '@/clients/pretalx'
import { resolveSpeakerAvatar } from '@/services/avatar-mirror'
import { CreatePresentationFromTemplate, ReconcileDeckPermissions } from '@/clients/slides'
import { deckIdFromUrl } from '@/utils/slides-permissions'
import { sendSlidesNoGoogleAccountEmail } from '@/services/email'
import { SERVER_CONFIG } from '@/utils/config'
import { getPretalxConfig } from '@/utils/config'

import fs from 'fs'

const eventId = process.argv[2] || 'devcon-7'
const config = getPretalxConfig(eventId)
// Events that may get a Google Slides deck per session (§2d of docs/av). Two
// gates, both required: this hardcoded allow-list (extend it in a deliberate
// commit when Devcon 8 goes live; devcon-7 is over and stays out) and the
// SLIDES_EVENTS env opt-in for the current run. CI sets no SLIDES_* variables,
// so the sync workflows never create decks by accident.
const SLIDES_ALLOWED_EVENTS = ['test-devcon-8']
const csv = (v: string | undefined) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
const SLIDES_EVENTS = csv(process.env.SLIDES_EVENTS)
// Optional: only create decks for these Pretalx codes (comma separated), so a
// test run touches a handful of talks instead of the whole event.
const SLIDES_ONLY_CODES = csv(process.env.SLIDES_ONLY_CODES)
const SLIDES_SKIP_PERMISSIONS = process.env.SLIDES_SKIP_PERMISSIONS === 'true'
// Speakers whose CFP email has no Google account cannot be reached by Drive's
// invitation (not delivered in testing), so with this opt-in the sync sends
// our own email asking for a Google account address. Off by default: a test
// event mirrors real speakers.
const SLIDES_NO_ACCOUNT_EMAIL = process.env.SLIDES_NO_ACCOUNT_EMAIL === 'true'
const SLIDES_CONTACT_EMAIL = process.env.SLIDES_CONTACT_EMAIL || 'speak@devcon.org'
const SLIDES_DRY_RUN = SLIDES_SKIP_PERMISSIONS || process.env.SLIDES_PERMISSIONS_DRY_RUN === 'true'

// ── Log helpers: one heading per phase, indented detail lines, problems
// collected for the final summary (SYNC_VERBOSE=1 adds the Pretalx paging). ──
const startedAt = Date.now()
const problems: string[] = []
const heading = (title: string) => console.log(`\n▶ ${title}`)
const line = (msg: string) => console.log(`  ${msg}`)
const problem = (msg: string) => {
  problems.push(msg)
  console.log(`  ! ${msg}`)
}
/** Last characters of an id, enough to recognise it without printing it whole. */
const tail = (id: string | undefined) => (id ? `…${id.slice(-5)}` : '(unset)')
type WriteResult = 'created' | 'updated' | 'unchanged'
/** Write JSON only when the content changed, and say what happened. */
function writeJson(path: string, data: unknown): WriteResult {
  const next = JSON.stringify(data, null, 2)
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, next)
    return 'created'
  }
  if (fs.readFileSync(path, 'utf8') === next) return 'unchanged'
  fs.writeFileSync(path, next)
  return 'updated'
}
const tally = (results: WriteResult[], deleted?: number) => {
  const n = (k: WriteResult) => results.filter((r) => r === k).length
  return `created ${n('created')}, updated ${n('updated')}, unchanged ${n('unchanged')}` + (deleted === undefined ? '' : `, deleted ${deleted}`)
}

const summary = { rooms: 0, sessions: 0, speakers: 0, decksCreated: 0, permissionChanges: 0, noAccountEmails: 0 }

/** A speaker's CFP address has no Google account: tell them what to do, once, when the grant is first attempted. */
async function notifyNoGoogleAccount(session: any, email: string) {
  const label = `[${session.sourceId}]`
  if (!SLIDES_NO_ACCOUNT_EMAIL) {
    line(`  ${label} ${email} has no Google account; set SLIDES_NO_ACCOUNT_EMAIL=true to email them, or share the deck by hand`)
    return
  }
  if (!SERVER_CONFIG.SMTP_SERVICE) {
    problem(`${label} ${email} has no Google account and SMTP is not configured, email them by hand`)
    return
  }
  const speaker = session.speakers.find((s: any) => (s.email || '').toLowerCase() === email.toLowerCase())
  try {
    const ok = await sendSlidesNoGoogleAccountEmail(email, {
      speakerName: speaker?.name || 'there',
      talkTitle: session.title,
      talkCode: session.sourceId,
      contactEmail: SLIDES_CONTACT_EMAIL,
      eventName: config.PRETALX_EVENT_NAME === 'devcon8' ? 'Devcon 8' : `Devcon (${config.PRETALX_EVENT_NAME})`,
    })
    if (ok) {
      summary.noAccountEmails++
      line(`  ✉ ${label} emailed ${email}: no Google account, asked for one (reply-to ${SLIDES_CONTACT_EMAIL})`)
    } else problem(`${label} email to ${email} was not accepted by the SMTP server`)
  } catch (e) {
    problem(`${label} could not email ${email}: ${(e as Error).message}`)
  }
}

async function main() {
  console.log(`Pretalx sync · ${eventId} (${config.PRETALX_EVENT_NAME} @ ${config.PRETALX_BASE_URI})`)
  const slidesOn = SLIDES_EVENTS.includes(eventId) && SLIDES_ALLOWED_EVENTS.includes(eventId)
  if (slidesOn) {
    line(
      `Slides: on · folder ${tail(process.env.SLIDES_FOLDER_ID)} · template ${tail(process.env.SLIDES_TEMPLATE_ID)} · ` +
        `speaker grants ${SLIDES_SKIP_PERMISSIONS ? 'off' : 'on'} · permissions pass ${SLIDES_DRY_RUN ? 'dry run' : 'applying'}` +
        (SLIDES_ONLY_CODES.length ? ` · only ${SLIDES_ONLY_CODES.join(', ')}` : '')
    )
  } else if (SLIDES_EVENTS.includes(eventId)) {
    line(`Slides: off · ${eventId} is not in SLIDES_ALLOWED_EVENTS (${SLIDES_ALLOWED_EVENTS.join(', ')})`)
  } else {
    line('Slides: off (SLIDES_EVENTS does not include this event)')
  }

  // Devcon-7 specific integrations
  if (eventId === 'devcon-7') {
    await notifyClients()
  }

  await syncEventData()
  await syncRooms()
  await syncSessions()

  if (slidesOn) {
    const sessions = await GetSessions({ inclContacts: true }, config)
    await createPresentations(sessions)
    await reconcilePermissions(sessions)
  }
  if (eventId === 'devcon-7') {
    createGlossary()
  }
}

async function notifyClients() {
  try {
    if (!process.env.WEBHOOK_MEERKAT_SECRET) {
      console.error('WEBHOOK_MEERKAT_SECRET is not set')
      return
    }

    const result = await fetch('https://meerkat.events/api/v1/sync/devcon/devcon-7', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WEBHOOK_MEERKAT_SECRET}`,
      },
    })

    if (result.ok) {
      console.log('Notified Meerkat')
    } else {
      console.error('Error notifying Meerkat', result)
    }
  } catch (error) {
    console.error('Error notifying Meerkat', error)
  }
}

function createGlossary() {
  const speakers = GetData('speakers')
  const sessions = GetData(`sessions/${eventId}`)

  let dictionary: string[] = []
  for (const session of sessions) {
    for (const speakerId of session.speakers) {
      const speaker = speakers.find((s: any) => s.id === speakerId)
      if (speaker) {
        dictionary.push(...speaker.name.split(' '))
      }
    }
  }

  dictionary = [...new Set(dictionary)]
  console.log(dictionary.join(';'))
}

async function syncEventData() {
  const eventPath = `./data/events/${eventId}.json`
  if (!fs.existsSync(eventPath)) {
    heading('Event')
    line(`creating ${eventPath}`)
    fs.writeFileSync(eventPath, JSON.stringify({ version: Date.now().toString() }, null, 2))
    return
  }
  const event = fs.readFileSync(eventPath, 'utf8')
  const eventData = JSON.parse(event)
  fs.writeFileSync(eventPath, JSON.stringify({ ...eventData, version: Date.now().toString() }, null, 2))
}

async function syncRooms() {
  heading('Rooms')
  if (!fs.existsSync(`./data/rooms/${eventId}`)) {
    fs.mkdirSync(`./data/rooms/${eventId}`, { recursive: true })
  }
  const rooms = await GetRooms(config)
  const roomsFs = GetData(`rooms/${eventId}`)
  let deleted = 0
  for (const room of roomsFs) {
    if (!rooms.some((r: any) => r.id === room.id)) {
      line(`- room ${room.id} no longer in Pretalx, deleted`)
      fs.unlinkSync(`./data/rooms/${eventId}/${room.id}.json`)
      deleted++
    }
  }
  const results: WriteResult[] = []
  for (const room of rooms) {
    const roomFs = roomsFs.find((r: any) => r.id === room.id)
    results.push(writeJson(`./data/rooms/${eventId}/${room.id}.json`, { ...roomFs, ...room }))
  }
  summary.rooms = rooms.length
  line(`${rooms.length} in Pretalx, ${roomsFs.length} on disk · ${tally(results, deleted)}`)

  // Update event data
  const event = GetData('events').find((e: any) => e.id === eventId)
  if (event) {
    delete event.id
    const eventVersion = await GetLastcheduleUpdate(config)
    // The Pretalx release name this data was synced from (e.g. "0.31"),
    // served on GET /events/:id. Unreadable (no published schedule / fetch
    // failure) keeps the prior value via the event spread.
    const scheduleVersion = await getPublishedScheduleVersion(config)
    fs.writeFileSync(
      `./data/events/${eventId}.json`,
      JSON.stringify(
        {
          ...event,
          ...(scheduleVersion ? { scheduleVersion } : {}),
          rooms: rooms.map((r: any) => r.id),
          version: eventVersion.toString(),
        },
        null,
        2
      )
    )
    line(`Event: schedule release ${scheduleVersion ?? event.scheduleVersion ?? '(none published)'} · data version ${eventVersion}`)
  }
}

async function syncSessions() {
  heading('Sessions')
  const speakers = (await GetSpeakers({}, config)).filter((s: any) => s.id && s.name)
  const acceptedSpeakers: any[] = []
  if (!fs.existsSync(`./data/sessions/${eventId}`)) {
    fs.mkdirSync(`./data/sessions/${eventId}`, { recursive: true })
  }
  const sessions = await GetSessions({}, config)
  const sessionsFs = GetData(`sessions/${eventId}`)
  let deleted = 0
  for (const session of sessionsFs) {
    if (!sessions.some((s: any) => s.id === session.id)) {
      line(`- session ${session.id} no longer in Pretalx, deleted`)
      fs.unlinkSync(`./data/sessions/${eventId}/${session.id}.json`)
      deleted++
    }
  }

  // Cross-event collision check: ids are slugified titles, so a talk named
  // like another event's talk writes the SAME id and shadows it in every
  // bare-id lookup (test-devcon-8 clones of devcon-7 talks 404'd the archive,
  // 2026-08-21). Warn loudly in the workflow log; the fix is renaming a talk.
  const otherEventIds = new Map<string, string>()
  for (const dir of fs.readdirSync('./data/sessions')) {
    if (dir === eventId || !fs.statSync(`./data/sessions/${dir}`).isDirectory()) continue
    for (const f of fs.readdirSync(`./data/sessions/${dir}`)) {
      if (f.endsWith('.json')) otherEventIds.set(f.replace(/\.json$/, ''), dir)
    }
  }

  const results: WriteResult[] = []
  for (const session of sessions) {
    const collidesWith = otherEventIds.get(session.id)
    if (collidesWith) {
      problem(`session id '${session.id}' also exists in ${collidesWith}; rename one talk (bare-id lookups will shadow)`)
    }
    const fsSession = sessionsFs.find((s: any) => s.id === session.id)
    if (session.speakers.length > 0) {
      acceptedSpeakers.push(...speakers.filter((s: any) => session.speakers.includes(s.id)))
    }
    results.push(writeJson(`./data/sessions/${eventId}/${session.id}.json`, { ...fsSession, ...session }))
  }
  summary.sessions = sessions.length
  line(`${sessions.length} in Pretalx, ${sessionsFs.length} on disk · ${tally(results, deleted)}`)

  heading('Speakers')
  // Featured speakers (organizer-curated pretalx question) live on the EVENT
  // record: speaker files are shared across events, so a per-event flag there
  // would leak and get clobbered by other events' syncs. Only overwrite when
  // the question yields answers — the deployed pretalx revision cannot create
  // speaker answers via API (upstream bug), so seeded lists must survive
  // syncs that see no answers.
  const featuredSpeakerIds = [...new Set(acceptedSpeakers.filter((s: any) => s.featured === true).map((s: any) => s.id))]
  for (const speaker of acceptedSpeakers) delete speaker.featured
  if (featuredSpeakerIds.length > 0) {
    const eventPath = `./data/events/${eventId}.json`
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
    fs.writeFileSync(eventPath, JSON.stringify({ ...eventData, featuredSpeakers: featuredSpeakerIds }, null, 2))
  }
  const speakerResults: WriteResult[] = []
  const written = new Set<string>()
  for (const speaker of acceptedSpeakers) {
    if (written.has(speaker.id)) continue
    written.add(speaker.id)
    const speakerPath = `./data/speakers/${speaker.id}.json`
    // Blockie/mirroring rules live in resolveSpeakerAvatar: never clobber a
    // real avatar with a blockie, and mirror pretalx-hosted uploads into the
    // speaker-avatars bucket (an unchanged source is a string compare, no
    // network, so this loop stays fast on re-syncs).
    const prior = fs.existsSync(speakerPath) ? JSON.parse(fs.readFileSync(speakerPath, 'utf8')) : null
    speaker.avatar = await resolveSpeakerAvatar(speaker.avatar, prior?.avatar)
    speakerResults.push(writeJson(speakerPath, speaker))
  }
  summary.speakers = written.size
  line(
    `${speakers.length} in Pretalx, ${written.size} on accepted sessions · ${tally(speakerResults)}` +
      (featuredSpeakerIds.length ? ` · featured ${featuredSpeakerIds.length}` : '')
  )
}

async function createPresentations(sessions: any[]) {
  heading('Slides: decks')
  const sessionsFs = GetData(`sessions/${eventId}`)
  const inScope = (s: any) => SLIDES_ONLY_CODES.length === 0 || SLIDES_ONLY_CODES.includes(s.sourceId)
  const todo: { sessionFs: any; session: any }[] = []
  let withDeck = 0
  for (const sessionFs of sessionsFs) {
    if (sessionFs.resources_presentation) {
      withDeck++
      continue
    }
    const session = sessions.find((s: any) => s.id === sessionFs.id)
    if (!session) {
      problem(`session ${sessionFs.id} is on disk but not in the Pretalx data, no deck created`)
      continue
    }
    if (inScope(session)) todo.push({ sessionFs, session })
  }
  line(
    `${withDeck} session(s) already have a deck, ${todo.length} to create` +
      (SLIDES_ONLY_CODES.length ? ` (limited to ${SLIDES_ONLY_CODES.join(', ')})` : '')
  )

  for (const { sessionFs, session } of todo) {
    const speakerEmails: string[] = session.speakers.map((speaker: any) => speaker.email).filter(Boolean)
    const label = `[${session.sourceId}] ${session.title}`
    try {
      const deck = await CreatePresentationFromTemplate(session.title, session.sourceId, speakerEmails)
      const url = `https://docs.google.com/presentation/d/${deck.id}`
      fs.writeFileSync(`./data/sessions/${eventId}/${sessionFs.id}.json`, JSON.stringify({ ...sessionFs, resources_presentation: url }, null, 2))
      if (!deck.created) {
        line(`= ${label}: deck already in the folder, URL recorded ${url}`)
        continue
      }
      summary.decksCreated++
      const grants = deck.skippedPermissions
        ? 'speaker grants skipped'
        : `${deck.granted.length} speaker(s) granted` + (deck.invited.length ? `, ${deck.invited.length} invited by email (no Google account)` : '')
      line(`+ ${label} → ${url} · ${grants}`)
      for (const email of deck.invited) await notifyNoGoogleAccount(session, email)
      for (const email of deck.grantFailures) problem(`${label}: could not grant ${email}, share the deck by hand`)
    } catch (e) {
      problem(`${label}: ${(e as Error).message}`)
    }
  }
}

// Speaker access is granted at deck creation; this pass keeps it current
// afterwards (speakers added, swapped or removed in Pretalx), adds the AV
// team group as reader, and strips public link access. Policy and the exact
// rules: utils/slides-permissions.ts. It only plans (and prints) unless
// SLIDES_SKIP_PERMISSIONS is off AND SLIDES_PERMISSIONS_DRY_RUN is not set,
// so a first run against real decks is a report, not a mutation.
async function reconcilePermissions(sessions: any[]) {
  heading(`Slides: permissions${SLIDES_DRY_RUN ? ' (dry run, nothing written)' : ''}`)
  const sessionsFs = GetData(`sessions/${eventId}`)
  const opts = {
    avGroup: process.env.SLIDES_AV_GROUP || null,
    keep: csv(process.env.SLIDES_KEEP_EMAILS),
    allowPublic: process.env.SLIDES_ALLOW_PUBLIC === 'true',
    dryRun: SLIDES_DRY_RUN,
  }
  let decks = 0
  let unreadable = 0
  for (const sessionFs of sessionsFs) {
    const deckId = deckIdFromUrl(sessionFs.resources_presentation)
    if (!deckId) continue
    const session = sessions.find((s: any) => s.id === sessionFs.id)
    if (!session) continue
    if (SLIDES_ONLY_CODES.length > 0 && !SLIDES_ONLY_CODES.includes(session.sourceId)) continue
    const speakerEmails: string[] = session.speakers.map((speaker: any) => speaker.email).filter(Boolean)
    decks++
    try {
      const changes = await ReconcileDeckPermissions(deckId, speakerEmails, opts)
      summary.permissionChanges += changes.length
      for (const c of changes) {
        const what =
          c.action === 'grant-writer'
            ? `grant writer to ${c.email}`
            : c.action === 'upgrade-writer'
            ? `upgrade ${c.email} from ${c.from} to writer`
            : c.action === 'revoke-writer'
            ? `revoke writer from ${c.email} (no longer a speaker)`
            : c.action === 'grant-group-reader'
            ? `grant reader to group ${c.email}`
            : `remove public link access (${c.role})`
        const note = c.note ? ` (${c.note})` : ''
        if (c.note?.startsWith('FAILED')) problem(`[${session.sourceId}] ${what}: ${c.note.slice(8)}`)
        else line(`${SLIDES_DRY_RUN ? '?' : '~'} [${session.sourceId}] ${what}${note}`)
        if (c.action === 'grant-writer' && c.invited) await notifyNoGoogleAccount(session, c.email)
      }
    } catch (e) {
      unreadable++
      problem(`[${session.sourceId}] cannot read the deck's permissions: ${(e as Error).message}`)
    }
  }
  line(
    `${decks} deck(s) checked · ${summary.permissionChanges} change(s) ${SLIDES_DRY_RUN ? 'planned' : 'applied'}` +
      (unreadable ? ` · ${unreadable} unreadable` : '')
  )
}

main()
  .then(() => {
    const secs = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(
      `\nDone in ${secs}s · rooms ${summary.rooms} · sessions ${summary.sessions} · speakers ${summary.speakers}` +
        (SLIDES_EVENTS.includes(eventId)
          ? ` · decks created ${summary.decksCreated} · permission changes ${summary.permissionChanges}` +
            (summary.noAccountEmails ? ` · no-Google-account emails ${summary.noAccountEmails}` : '')
          : '')
    )
    if (problems.length) {
      console.log(`${problems.length} problem(s) to look at:`)
      for (const p of problems) console.log(`  ! ${p}`)
    }
    process.exit(0)
  })
  .catch((e) => {
    console.error(`\nSync failed: ${(e as Error).message}`)
    if (process.env.SYNC_VERBOSE) console.error(e)
    process.exit(1)
  })
