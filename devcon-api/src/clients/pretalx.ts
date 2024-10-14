import { defaultSlugify } from '@/utils/content'
import { CreateBlockie } from '@/utils/account'
import { PRETALX_CONFIG } from '@/utils/config'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import Parser from 'rss-parser'

dayjs.extend(utc)

const cache = new Map()

export interface RequestParams {
  inclContacts?: boolean
  state?: 'confirmed' | 'accepted'
}

export async function GetLastcheduleUpdate() {
  try {
    const parser = new Parser()
    const feed = await parser.parseURL(`https://speak.devcon.org/${PRETALX_CONFIG.PRETALX_EVENT_NAME}/schedule/feed.xml`)
    const lastUpdate = dayjs(feed.lastBuildDate)

    return lastUpdate.valueOf()
  } catch (e) {
    console.log('Unable to fetch schedule update. Make sure the event name is correct and made public.')
  }
}

export async function GetRooms() {
  const rooms = await exhaustResource('rooms')
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

export async function GetSpeakers(params: Partial<RequestParams> = {}) {
  const speakersData = await exhaustResource(`speakers?questions=all`)
  return speakersData.map((i: any) => mapSpeaker(i, params))
}

export async function GetSubmissions(params: Partial<RequestParams> = {}) {
  const submissions = await exhaustResource(`submissions?questions=all`)
  return submissions.filter((i: any) => i.state === (params.state ?? 'confirmed')).map((i: any) => mapSession(i, params))
}

export async function GetSessions(params: Partial<RequestParams> = {}) {
  const talks = await exhaustResource(`talks?questions=all`)
  return talks.map((i: any) => mapSession(i, params))
}

export async function GetSession(id: string, params: Partial<RequestParams> = {}) {
  const data = await get(`submissions/${id}?questions=all`)
  return mapSession(data, params)
}

export async function GetSpeaker(id: string, params: Partial<RequestParams> = {}) {
  const data = await get(`speakers/${id}?questions=all`)
  return mapSpeaker(data, params)
}

async function exhaustResource(slug: string, limit = PRETALX_CONFIG.DEFAULT_LIMIT, offset = 0, results = [] as any): Promise<any> {
  return get(`${slug}${slug.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`).then((data: any) => {
    results.push(data.results)
    if (data.next) {
      console.log('GET', slug, 'TOTAL COUNT', data.count)
      return exhaustResource(slug, limit, offset + limit, results)
    } else {
      console.log('Return results', slug, results.flat().length)
      return results.flat()
    }
  })
}

async function get(slug: string) {
  if (cache.has(slug)) {
    return cache.get(slug)
  }

  const url = `${PRETALX_CONFIG.PRETALX_BASE_URI}/events/${PRETALX_CONFIG.PRETALX_EVENT_NAME}/${slug}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${PRETALX_CONFIG.PRETALX_API_KEY}`,
    },
  })

  const data = await response.json()
  cache.set(slug, data)
  return data
}

function mapSession(i: any, params: Partial<RequestParams>) {
  const expertise = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_EXPERTISE)?.answer as string
  const predefinedTags = arrayify(i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_TAGS)?.answer)
  const audience = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_AUDIENCE)?.answer as string
  const keywords = arrayify(i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_KEYWORDS)?.answer)

  let session: any = {
    id: defaultSlugify(i.title),
    sourceId: i.code,
    title: i.title,
    description: i.description ?? i.abstract,
    track: i.track?.en ?? '',
    type: mapSubmissionType(i.submission_type_id) || i.submission_type?.en || 'Talk',
    expertise: expertise ?? '',
    audience: audience ?? '',
    featured: i.is_featured ?? false,
    doNotRecord: i.do_not_record ?? false,
    keywords: keywords,
    tags: [...i.tags, ...predefinedTags] ?? [],
    language: 'en',
    speakers: params.inclContacts ? i.speakers.map((i: any) => mapSpeaker(i, params)) : i.speakers.map((i: any) => i.code),
    eventId: `devcon-${PRETALX_CONFIG.PRETALX_EVENT_ID}`,
  }

  if (i.slot) {
    session.slot_start = dayjs.utc(i.slot.start).toDate()
    session.slot_end = dayjs.utc(i.slot.end).toDate()
    session.slot_roomId = i.slot?.room ? defaultSlugify(i.slot.room.en) : null
  }

  return session
}

function mapSpeaker(i: any, params: Partial<RequestParams>) {
  const twitter = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_TWITTER)?.answer
  const github = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_GITHUB)?.answer
  const farcaster = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_FARCASTER)?.answer
  const lens = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_LENS)?.answer
  const ens = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_ENS)?.answer
  const telegram = i.answers?.find((i: any) => i.question.id === PRETALX_CONFIG.PRETALX_QUESTIONS_TELEGRAM)?.answer

  let speaker: any = {
    id: defaultSlugify(i.name),
    sourceId: i.code,
    name: i.name,
    avatar: i.avatar ?? CreateBlockie(i.name),
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

  if (params.inclContacts && i.email) speaker.email = i.email
  if (params.inclContacts && notEmptyOrInvalid(telegram)) speaker.telegram = sanitizeProfileField(telegram)

  return speaker
}

function mapSubmissionType(type: number) {
  if (type === 52 || type === 32 || type === 51) return 'Talk' // includes keynotes
  if (type === 36) return 'Lightning Talk'
  if (type === 33 || type === 34 || type === 40) return 'Workshop'
  if (type === 41) return 'Panel'
  if (type === 38) return 'Music'
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
  value = value.replace('@', '')
  value = value.replace('.lens', '')
  value = value.replace('https://github.com/', '')
  value = value.replace('https:/gist.github.com/', '')
  value = value.replace('https://twitter.com/', '')
  value = value.replace('twitter.com/', '')
  value = value.replace('https://x.com/', '')
  value = value.replace('x.com/', '')
  value = value.replace('https://farcaster.xyz/u/', '')
  value = value.replace('https://warpcast.com/', '')
  value = value.replace('https://lens.xyz/', '')
  value = value.replace('https://hey.xyz/u/', '')
  value = value.replace('https://app.ens.domains/', '')
  value = value.replace('https://ens.domains/', '')
  value = value.replace('https://t.me/', '')

  return value
}

function arrayify(value: string | undefined) {
  return value
    ? value.includes(',')
      ? value.split(',').map((i) => i.replace(/['"]+/g, '').trim())
      : value.split(' ').map((i) => i.replace(/['"]+/g, '').trim())
    : []
}
