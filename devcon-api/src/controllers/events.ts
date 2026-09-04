import { Request, Response, Router } from 'express'
import { GetSessions } from './sessions'
import { GetSpeakers } from './speakers'
import { publicCache } from '@/middleware/cache'
import * as store from '@/data/store'

export const eventsRouter = Router()
eventsRouter.get(`/events`, publicCache(60), GetEvents)
eventsRouter.get(`/events/:id`, publicCache(60), GetEvent)
eventsRouter.get(`/events/:id/version`, publicCache(60), GetEventVersion)
eventsRouter.get(`/events/:id/sessions`, publicCache(60), GetEventSessions)
eventsRouter.get(`/events/:id/speakers`, publicCache(60), GetEventSpeakers)
eventsRouter.get(`/events/:id/rooms`, publicCache(60), GetRooms)
eventsRouter.get(`/events/:id/bundle`, publicCache(60), GetEventBundle)

export async function GetEventVersion(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  const data = store.getEvent(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data: data.version })
}

export async function GetEvents(req: Request, res: Response) {
  // #swagger.tags = ['Events']

  const data = store.getEvents()

  res.status(200).send({ status: 200, message: '', data: data })
}

export async function GetEvent(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  const data = store.getEvent(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  const { rooms, ...event } = data
  res.status(200).send({ status: 200, message: '', data: event })
}

export async function GetEventSessions(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.parameters['id'] = { description: 'AUTO-GENERATED. Can be ignored in Swagger' }

  req.query.event = req.params.id
  GetSessions(req, res)
}

export async function GetEventSpeakers(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.parameters['id'] = { description: 'AUTO-GENERATED. Can be ignored in Swagger' }

  req.query.event = req.params.id
  GetSpeakers(req, res)
}

export async function GetRooms(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  const rooms = store.getEventRooms(req.params.id)

  if (!rooms) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data: rooms })
}

// Field allowlists for the offline bundle. Fixed server-side on purpose: the
// event app stores this response in IndexedDB, so a field that grows later
// (transcripts, Q&A) can never leak into every attendee's phone by accident.
export const BUNDLE_SESSION_FIELDS = [
  'id',
  'title',
  'description',
  'track',
  'type',
  'expertise',
  'tags',
  'featured',
  'slot_start',
  'slot_end',
  'slot_roomId',
  'sources_youtubeId',
  'sources_streamethId',
  'sources_swarmHash',
] as const

export const BUNDLE_SPEAKER_FIELDS = ['id', 'name', 'avatar', 'description', 'twitter', 'github', 'website', 'role', 'company'] as const

export const BUNDLE_ROOM_FIELDS = [
  'id',
  'name',
  'description',
  'info',
  'capacity',
  'youtubeStreamUrl_1',
  'youtubeStreamUrl_2',
  'youtubeStreamUrl_3',
  'youtubeStreamUrl_4',
  'translationUrl',
] as const

export const BUNDLE_EVENT_FIELDS = ['id', 'title', 'startDate', 'endDate', 'featuredSpeakers'] as const

/** Copy only `keys` from `item`, skipping null/undefined so absent fields are simply omitted. */
function project(item: Record<string, any>, keys: readonly string[]) {
  const out: Record<string, any> = {}
  for (const key of keys) {
    if (key in item && item[key] !== undefined && item[key] !== null) out[key] = item[key]
  }
  return out
}

/**
 * One response with everything the event app stores offline: the event's
 * version (same value as /events/:id/version, read in the same tick so version
 * and content can never disagree), the event record, rooms, speakers and
 * sessions. Sessions reference speakers and rooms by id (`speakerIds`,
 * `slot_roomId`) instead of embedding them, which is ~45% of the bytes of the
 * separate list endpoints for devcon-7.
 */
export async function GetEventBundle(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.parameters['fields'] = { in: 'query', required: false, type: 'string', description: 'Comma-separated subset of the session fields to return (id and speakerIds are always included).' }
  const event = store.getEvent(req.params.id)
  if (!event) return res.status(404).send({ status: 404, message: 'Not Found' })

  const requested =
    typeof req.query.fields === 'string'
      ? new Set(
          req.query.fields
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        )
      : null
  // `id` is always emitted: a session without one can't be stored or linked.
  const sessionFields = requested ? BUNDLE_SESSION_FIELDS.filter((f) => f === 'id' || requested.has(f)) : BUNDLE_SESSION_FIELDS

  const sessions = store.getSessions({ event: event.id, take: 5000 }).items.map((s: any) => ({
    ...project(s, sessionFields),
    speakerIds: (s.speakers || []).map((sp: any) => sp.id),
  }))
  const speakers = store.getSpeakers({ event: event.id, take: 5000 }).items.map((sp: any) => project(sp, BUNDLE_SPEAKER_FIELDS))
  const rooms = (store.getEventRooms(event.id) || []).map((r: any) => project(r, BUNDLE_ROOM_FIELDS))

  res.status(200).send({
    status: 200,
    message: '',
    data: {
      version: String(event.version ?? ''),
      event: project(event, BUNDLE_EVENT_FIELDS),
      rooms,
      speakers,
      sessions,
    },
  })
}
