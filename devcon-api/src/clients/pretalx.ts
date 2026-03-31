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

  const speakersData = await exhaustResource(`speakers?questions=all`, config)
  return speakersData.map((i: any) => mapSpeaker(i, params, config)).filter((s: any) => s.sourceId !== 'ADDJPN')
}

export async function GetSubmissions(params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const submissions = await exhaustResource(`submissions?questions=all`, config)
  return submissions.filter((i: any) => i.state === (params.state ?? 'confirmed')).map((i: any) => mapSession(i, params, config))
}

export async function GetSessions(params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const talks = await exhaustResource(`talks?questions=all`, config)
  return talks.map((i: any) => mapSession(i, params, config))
}

export async function GetSession(id: string, params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const data = await get(`submissions/${id}?questions=all`, config)
  return mapSession(data, params, config)
}

export async function GetSpeaker(id: string, params: Partial<RequestParams> = {}, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const data = await get(`speakers/${id}?questions=all`, config)
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

async function get(slug: string, config: PretalxInstanceConfig) {
  const cacheKey = `${config.eventId}:${slug}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const url = `${config.PRETALX_BASE_URI}/events/${config.PRETALX_EVENT_NAME}/${slug}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${config.PRETALX_API_KEY}`,
    },
  })

  const data = await response.json()
  cache.set(cacheKey, data)
  return data
}

function mapSession(i: any, params: Partial<RequestParams>, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const expertise = config.PRETALX_QUESTIONS_EXPERTISE
    ? (i.answers?.find((i: any) => i.question.id === config.PRETALX_QUESTIONS_EXPERTISE)?.answer as string)
    : undefined
  const predefinedTags = config.PRETALX_QUESTIONS_TAGS
    ? arrayify(i.answers?.find((i: any) => i.question.id === config.PRETALX_QUESTIONS_TAGS)?.answer)
    : []
  const audience = config.PRETALX_QUESTIONS_AUDIENCE
    ? (i.answers?.find((i: any) => i.question.id === config.PRETALX_QUESTIONS_AUDIENCE)?.answer as string)
    : undefined
  const keywords = config.PRETALX_QUESTIONS_KEYWORDS
    ? arrayify(i.answers?.find((i: any) => i.question.id === config.PRETALX_QUESTIONS_KEYWORDS)?.answer)
    : []

  let tags: string[] = []
  if (i.tags) tags = [...i.tags]
  if (predefinedTags) tags = [...tags, ...predefinedTags]

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
    tags: tags,
    language: 'en',
    speakers: params.inclContacts ? i.speakers.map((i: any) => mapSpeaker(i, params, config)) : i.speakers.map((i: any) => defaultSlugify(i.name)),
    eventId: config.eventId,
  }

  if (i.slot) {
    session.slot_start = dayjs.utc(i.slot.start).valueOf()
    session.slot_end = dayjs.utc(i.slot.end).valueOf()
    session.slot_roomId = i.slot?.room ? defaultSlugify(i.slot.room.en) : null
  }

  return session
}

function mapSpeaker(i: any, params: Partial<RequestParams>, config: PretalxInstanceConfig = PRETALX_CONFIG) {
  const findAnswer = (questionId: number | undefined) =>
    questionId ? i.answers?.find((i: any) => i.question.id === questionId)?.answer : undefined

  const twitter = findAnswer(config.PRETALX_QUESTIONS_TWITTER)
  const github = findAnswer(config.PRETALX_QUESTIONS_GITHUB)
  const farcaster = findAnswer(config.PRETALX_QUESTIONS_FARCASTER)
  const lens = findAnswer(config.PRETALX_QUESTIONS_LENS)
  const ens = findAnswer(config.PRETALX_QUESTIONS_ENS)
  const telegram = findAnswer(config.PRETALX_QUESTIONS_TELEGRAM)

  let speaker: any = {
    id: defaultSlugify(i.name),
    sourceId: i.code,
    name: i.name,
    avatar: i.avatar ?? CreateBlockie(i.name || i.code),
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
