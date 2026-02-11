import { Request, Response, Router } from 'express'
import { GetSessions } from './sessions'
import { GetSpeakers } from './speakers'
import * as store from '@/data/store'

export const eventsRouter = Router()
eventsRouter.get(`/events`, GetEvents)
eventsRouter.get(`/events/:id`, GetEvent)
eventsRouter.get(`/events/:id/version`, GetEventVersion)
eventsRouter.get(`/events/:id/sessions`, GetEventSessions)
eventsRouter.get(`/events/:id/speakers`, GetEventSpeakers)
eventsRouter.get(`/events/:id/rooms`, GetRooms)

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
