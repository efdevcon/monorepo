import { Request, Response, Router } from 'express'
import { GetSessions } from './sessions'
import { PrismaClient } from '@prisma/client'
import { GetSpeakers } from './speakers'

const client = new PrismaClient()

export const eventsRouter = Router()
eventsRouter.get(`/events`, GetEvents)
eventsRouter.get(`/events/:id`, GetEvent)
eventsRouter.get(`/events/:id/version`, GetEventVersion)
eventsRouter.get(`/events/:id/new-version`, ChangeVersion)
eventsRouter.get(`/events/:id/sessions`, GetEventSessions)
eventsRouter.get(`/events/:id/speakers`, GetEventSpeakers)
eventsRouter.get(`/events/:id/rooms`, GetRooms)


let version = 1;
// Since the event data sets are so large, it helps to have an endpoint we can ping to check updates to the underlying data - 
// this helps the pwa react to updates and only redownload everything when its local data is out of date
export async function GetEventVersion(req: Request, res: Response) {
  // TODO: Version is currently mocked, need to update this dynamically as schedule/speakers change
  res.status(200).send({ status: 200, message: '', data: version })  
}

// Just for dev
export async function ChangeVersion(req: Request, res: Response) {
  version++;

  if (version > 5) version = 1;
  // The Math.random() is a mock - need to implement real versioning later..
  res.status(200).send({ status: 200, message: '', data: `new version: ${version}` })  
}

export async function GetEvents(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  const data = await client.event.findMany()

  res.status(200).send({ status: 200, message: '', data: data })
}

export async function GetEvent(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  const data = await client.event.findFirst({
    where: { id: req.params.id },
  })

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data: data })
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
  const data = await client.event.findFirst({
    where: { id: req.params.id },
    include: {
      rooms: true,
    },
  })

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data: data.rooms })
}
