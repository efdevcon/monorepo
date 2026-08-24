import { defaultSlugify } from '@/utils/content'
import { CreateBlockie } from '@/utils/account'
import { PRETALX_CONFIG, PretalxInstanceConfig } from '@/utils/config'
import { createHmac } from 'crypto'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import Parser from 'rss-parser'

dayjs.extend(utc)

const cache = new Map()

export interface RequestParams {
  inclContacts?: boolean
  state?: 'confirmed' | 'accepted'
}

export async function GetLastcheduleUpdate(config: PretalxInstanceConfig = PRETALX_CONFIG) {
  try {
    const parser = new Parser()
    const baseUri = config.PRETALX_BASE_URI.replace('/api', '')
    const feed = await parser.parseURL(`${baseUri}/${config.PRETALX_EVENT_NAME}/schedule/feed.xml`)
    const lastUpdate = dayjs(feed.lastBuildDate)

    return lastUpdate.valueOf()
  } catch (e) {
    console.log('Unable to fetch schedule update. Make sure the event name is correct and made public.')
    return Date.now()
  }
}

export async function GetRooms(config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const rooms = await exhaustResource('rooms', config)
  return rooms.map((i: any) => {
    return {
      id: i.name?.en ? defaultSlugify(i.name?.en) : String(i.id),
      name: i.name?.en ?? '',
      description: i.description?.en ?? '',
      info: i.speaker_info?.en ?? '',
      capacity: i.capacity,
    }
  })
}

export async function GetSpeakers(params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  if (!process.env.EMAIL_SECRET) {
    console.warn('EMAIL_SECRET is not set. Skipping email hashing.')
  }

  const speakersData = await exhaustResource(`speakers?questions=all&expand=answers.question,track,submission_type,tags`, config)
  return speakersData.map((i: any) => mapSpeaker(i, params, config)).filter((s: any) => s.sourceId !== 'ADDJPN')
}

export async function GetSlots(config: PretalxInstanceConfig = PRETALX_CONFIG) {
  return exhaustResource('slots', config)
}

export async function GetSubmissions(params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const [submissions, slots, rawRooms, speakers] = await Promise.all([
    exhaustResource(`submissions?questions=all&expand=answers.question,track,submission_type,tags`, config),
    GetSlots(config).catch(() => []),
    exhaustResource('rooms', config).catch(() => []),
    exhaustResource(`speakers?questions=all&expand=answers.question,track,submission_type,tags`, config).catch(() => []),
  ])

  // Build lookups
  const slotMap = new Map<number, any>(slots.map((s: any) => [s.id, s]))
  const roomIdToSlug = new Map<number, string>(
    rawRooms.map((r: any) => [r.id, r.name?.en ? defaultSlugify(r.name.en) : String(r.id)])
  )
  // Unlike /talks, /submissions returns `speakers` as an array of codes (not
  // full objects), so mapSession can't derive a name/slug from them. Resolve
  // each code to its full speaker object up front.
  const speakerMap = new Map<string, any>(speakers.map((s: any) => [s.code, s]))

  return submissions
    .filter((i: any) => i.state === (params.state ?? 'confirmed'))
    .map((i: any) => {
      // Enrich with slot data if available (submissions return slots as ID array)
      if (i.slots && Array.isArray(i.slots) && typeof i.slots[0] === 'number') {
        const slotData = slotMap.get(i.slots[0])
        if (slotData) {
          const roomSlug = roomIdToSlug.get(slotData.room)
          i.slot = {
            start: slotData.start,
            end: slotData.end,
            room: roomSlug ? { en: roomSlug } : null,
          }
        }
      }
      // Resolve speaker codes (or partial objects) to full speaker objects.
      if (Array.isArray(i.speakers)) {
        i.speakers = i.speakers.map((sp: any) => {
          const code = typeof sp === 'string' ? sp : sp?.code
          return speakerMap.get(code) ?? (sp && typeof sp === 'object' ? sp : { code })
        })
      }
      return mapSession(i, params, config)
    })
}

export async function GetSessions(params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  try {
    const talks = await exhaustResource(`talks?questions=all&expand=answers.question,track,submission_type,tags`, config)
    return talks.map((i: any) => mapSession(i, params, config))
  } catch {
    // /talks requires a published schedule — fall back to confirmed submissions.
    // Only keep scheduled ones (with a slot): unscheduled confirmed talks have no
    // time/room and would otherwise render as 1970-01-01 in an "unassigned" stage.
    // This mirrors the published-schedule path, which only returns scheduled talks.
    console.log('No published schedule, falling back to confirmed (scheduled) submissions...')
    const submissions = await GetSubmissions({ ...params, state: 'confirmed' }, config)
    return submissions.filter((s: any) => s.slot_start)
  }
}

export async function GetSession(id: string, params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const data = await get(`submissions/${id}?questions=all&expand=answers.question,track,submission_type,tags`, config)
  return mapSession(data, params, config)
}

export async function GetSpeaker(id: string, params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const data = await get(`speakers/${id}?questions=all&expand=answers.question,track,submission_type,tags`, config)
  return mapSpeaker(data, params, config)
}

async function exhaustResource(slug: string, config: PretalxInstanceConfig, limit = config.DEFAULT_LIMIT, offset = 0, results = [] as any): Promise<any> {
  return get(`${slug}${slug.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`, config).then((data: any) => {
    results.push(data.results)
    if (data.next) {
      console.log('GET', slug, 'TOTAL COUNT', data.count)
      return exhaustResource(slug, config, limit, offset + limit, results)
    } else {
      console.log('Return results', slug, results.flat().length)
      return results.flat()
    }
  })
}

/** Drop every cached Pretalx response for one event.
 *
 * The response cache below is module-level with no TTL. That's fine for
 * scripts (one process = one run), but in the long-lived API server it made
 * every schedule re-publish a silent no-op: the webhook's "re-fetch" served
 * the pre-publish cached response, the store swapped in identical old data,
 * and the version stamp still bumped — fresh-looking version over stale
 * sessions (bug report 2026-08-15, reproduced live 2026-08-17). The sync
 * path MUST call this before fetching. */
export function clearPretalxCache(eventId: string) {
  for (const key of cache.keys()) {
    if (typeof key === 'string' && key.startsWith(`${eventId}:`)) cache.delete(key)
  }
}

/** The currently PUBLISHED schedule version name, read from the public
 *  schedule widget (uncached, unauthenticated). Used by the webhook sync to
 *  detect the release-moment race: Pretalx fires the webhook before its API
 *  reflects the newly released schedule, so a fetch at that instant returns
 *  pre-release data (observed live 2026-08-17: release 12:53:51Z, fetch got
 *  the previous version). Returns null on any failure — callers must treat
 *  that as "unknown", not as a mismatch. */
export async function getPublishedScheduleVersion(config: PretalxInstanceConfig): Promise<string | null> {
  try {
    const root = config.PRETALX_BASE_URI.replace(/\/api\/?$/, '')
    const res = await fetch(`${root}/${config.PRETALX_EVENT_NAME}/schedule/widgets/schedule.json`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.version != null ? String(data.version) : null
  } catch {
    return null
  }
}

async function get(slug: string, config: PretalxInstanceConfig) {
  const cacheKey = `${config.eventId}:${slug}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  // Ensure path segment has trailing slash before query string (pretalx 301-redirects without it)
  const path = slug.includes('?') ? slug.replace('?', '/?') : `${slug}/`
  const url = `${config.PRETALX_BASE_URI}/events/${config.PRETALX_EVENT_NAME}/${path}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${config.PRETALX_API_KEY}`,
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Pretalx API error: ${response.status} ${response.statusText} for ${url}`)
  }

  const data = await response.json()
  cache.set(cacheKey, data)
  return data
}

function mapSession(i: any, params: Partial<RequestParams>, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const expertise = config.PRETALX_QUESTIONS_EXPERTISE
    ? (i.answers?.find((i: any) => i.question?.id === config.PRETALX_QUESTIONS_EXPERTISE)?.answer as string)
    : undefined
  const predefinedTags = config.PRETALX_QUESTIONS_TAGS
    ? arrayify(i.answers?.find((i: any) => i.question?.id === config.PRETALX_QUESTIONS_TAGS)?.answer)
    : []
  const audience = config.PRETALX_QUESTIONS_AUDIENCE
    ? (i.answers?.find((i: any) => i.question?.id === config.PRETALX_QUESTIONS_AUDIENCE)?.answer as string)
    : undefined
  const keywords = config.PRETALX_QUESTIONS_KEYWORDS
    ? arrayify(i.answers?.find((i: any) => i.question?.id === config.PRETALX_QUESTIONS_KEYWORDS)?.answer)
    : []

  // Newer pretalx returns `tags` as expanded objects `{id, tag, color}` (or bare
  // ids without expand); older instances returned plain name strings. Normalise
  // to name strings, merge with the predefined-tags answer, and de-duplicate.
  let tags: string[] = []
  if (Array.isArray(i.tags)) {
    tags = i.tags.map((t: any) => (typeof t === 'object' && t ? t.tag ?? t.name?.en ?? String(t.id) : t))
  }
  if (predefinedTags) tags = [...tags, ...predefinedTags]
  tags = [...new Set(tags.filter((t) => typeof t === 'string' && t.trim() !== ''))]

  let session: any = {
    id: defaultSlugify(i.title),
    sourceId: i.code,
    title: i.title,
    description: i.description ?? i.abstract,
    // Newer pretalx (cfp.devcon.org) returns track/submission_type as expanded
    // objects `{id, name:{en}}`; older instances used a bare `{en}` / numeric id.
    // Read both shapes so the migrated events keep their track labels and types.
    track: i.track?.name?.en ?? i.track?.en ?? '',
    type:
      mapSubmissionType(i.submission_type_id ?? i.submission_type?.id) ||
      i.submission_type?.name?.en ||
      i.submission_type?.en ||
      'Talk',
    expertise: expertise ?? '',
    audience: audience ?? '',
    featured: i.is_featured ?? false,
    doNotRecord: i.do_not_record ?? false,
    keywords: keywords,
    tags: tags,
    language: 'en',
    speakers: params.inclContacts
      ? (i.speakers ?? []).map((i: any) => mapSpeaker(i, params, config))
      : (i.speakers ?? []).map((i: any) => defaultSlugify(i.name || i.code)),
    eventId: config.eventId,
  }

  if (i.slot) {
    session.slot_start = dayjs.utc(i.slot.start).valueOf()
    session.slot_end = dayjs.utc(i.slot.end).valueOf()
    // Room can be {en: "Name"} from /talks, or a numeric ID from enriched /submissions
    if (i.slot.room) {
      if (typeof i.slot.room === 'object' && i.slot.room.en) {
        session.slot_roomId = defaultSlugify(i.slot.room.en)
      } else {
        // Numeric room ID — store as string, will be resolved by the store
        session.slot_roomId = String(i.slot.room)
      }
    }
  }

  return session
}

function mapSpeaker(i: any, params: Partial<RequestParams>, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const findAnswer = (questionId: number | undefined) =>
    questionId ? i.answers?.find((i: any) => i.question?.id === questionId)?.answer : undefined

  const twitter = findAnswer(config.PRETALX_QUESTIONS_TWITTER)
  const github = findAnswer(config.PRETALX_QUESTIONS_GITHUB)
  const farcaster = findAnswer(config.PRETALX_QUESTIONS_FARCASTER)
  const lens = findAnswer(config.PRETALX_QUESTIONS_LENS)
  const ens = findAnswer(config.PRETALX_QUESTIONS_ENS)
  const telegram = findAnswer(config.PRETALX_QUESTIONS_TELEGRAM)

  // Prefer a real avatar URL. Newer pretalx (cfp.devcon.org) exposes it as
  // `avatar_url`; older data used `avatar`. Pretalx still renders devcon-6/7
  // media URLs on the retired speak.devcon.org hostname, but the files were
  // restored onto the live host (2026-08-24), so rewrite the host instead of
  // discarding the avatar. Blockie only when there is no avatar at all.
  const avatarUrl = (i.avatar ?? i.avatar_url)?.replace(/^https?:\/\/speak\.devcon\.org\//, 'https://cfp.devcon.org/')
  const avatar = avatarUrl || CreateBlockie(i.name || i.code)

  let speaker: any = {
    id: defaultSlugify(i.name || i.code),
    sourceId: i.code,
    name: i.name,
    avatar,
    description: i.biography ?? '',
  }

  if (notEmptyOrInvalid(twitter)) speaker.twitter = sanitizeProfileField(twitter)
  if (notEmptyOrInvalid(github)) speaker.github = sanitizeProfileField(github)
  if (notEmptyOrInvalid(farcaster)) speaker.farcaster = sanitizeProfileField(farcaster)
  if (notEmptyOrInvalid(lens)) speaker.lens = sanitizeProfileField(lens)
  if (notEmptyOrInvalid(ens)) {
    const handle = sanitizeProfileField(ens)
    speaker.ens = handle.startsWith('0x') ? handle : handle.endsWith('.eth') ? handle : `${handle}.eth`
  }
  if (i.email && process.env.EMAIL_SECRET) {
    speaker.hash = createHmac('sha256', process.env.EMAIL_SECRET).update(i.email.trim().toLowerCase()).digest('hex')
  }

  if (params.inclContacts && i.email) speaker.email = i.email
  if (params.inclContacts && notEmptyOrInvalid(telegram)) speaker.telegram = sanitizeProfileField(telegram)

  return speaker
}

function mapSubmissionType(type: number) {
  // devcon-7 (Bangkok)
  if (type === 52 || type === 32 || type === 51) return 'Talk' // includes keynotes
  if (type === 36) return 'Lightning Talk'
  if (type === 33 || type === 34 || type === 40) return 'Workshop'
  if (type === 41) return 'Panel'
  if (type === 38) return 'Music'
  // devcon8 (Mumbai) - ids from cfp.devcon.org/api/events/devcon8/submission-types/
  if (type === 85 || type === 86) return 'Talk' // Talk, Keynote
  if (type === 83) return 'Lightning Talk'
  if (type === 90 || type === 91 || type === 93) return 'Workshop' // 1h30, 2h, 1h
  if (type === 87) return 'Panel' // Mixed Formats (AMA / Roundtable / Fireside)
  // 89 "Experience" is intentionally unmapped: a genuinely new format, so it
  // falls through to the raw Pretalx name rather than a wrong canonical label.
  // test-devcon-8 (mirror of devcon8)
  if (type === 97 || type === 98) return 'Talk' // Talk, Keynote
  if (type === 95) return 'Lightning Talk'
  if (type === 99 || type === 101 || type === 102) return 'Workshop' // 1h, 1h30, 2h
  if (type === 96) return 'Panel' // Mixed Formats
  // 100 "Experience" intentionally unmapped, as above.
}

function notEmptyOrInvalid(value: string | undefined) {
  return value && value !== 'na' && value !== 'N/A' && value !== 'n/a' && value !== 'N/a'
}

function sanitizeProfileField(value: string) {
  if (value.includes(',')) value = value.split(',')[0]
  if (value.includes(' - ')) value = value.split(' - ')[0]
  if (value.includes(' & ')) value = value.split(' & ')[0]
  if (value.includes(' and ')) value = value.split(' and ')[0]
  if (value.includes(';')) value = value.split(';')[0]

  value = value.replace(/['"]+/g, '').trim().toLowerCase()
  value = value.replace('https://github.com/', '')
  value = value.replace('https:/gist.github.com/', '')
  value = value.replace('github.com/', '')
  value = value.replace('https://twitter.com/', '')
  value = value.replace('https://x.com/', '')
  value = value.replace('https://www.x.com/', '')
  value = value.replace('twitter.com/', '')
  value = value.replace('x.com/', '')
  value = value.replace('https://farcaster.xyz/u/', '')
  value = value.replace('https://warpcast.com/', '')
  value = value.replace('https://lens.xyz/', '')
  value = value.replace('https://hey.xyz/u/', '')
  value = value.replace('https://app.ens.domains/', '')
  value = value.replace('https://ens.domains/', '')
  value = value.replace('https://t.me/', '')
  value = value.replace('https://www.t.me/', '')
  value = value.replace('t.me/', '')
  value = value.replace('.lens', '')
  value = value.replace('?s=21', '')
  value = value.replace('?lang=en', '')
  value = value.replace('@', '')
  value = value.replace('/', '')

  return value
}

function arrayify(value: string | undefined) {
  return value
    ? value.includes(',')
      ? value.split(',').map((i) => i.replace(/['"]+/g, '').trim())
      : value.split(' ').map((i) => i.replace(/['"]+/g, '').trim())
    : []
}
