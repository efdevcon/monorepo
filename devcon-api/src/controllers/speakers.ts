import { Request, Response, Router } from 'express'
import { API_DEFAULTS } from '@/utils/config'
import * as store from '@/data/store'

export const speakersRouter = Router()
speakersRouter.get(`/speakers`, GetSpeakers)
speakersRouter.get(`/speakers/:id`, GetSpeaker)
speakersRouter.get(`/speakers/:id/sessions`, GetSpeakerSessions)

export async function GetSpeakers(req: Request, res: Response) {
  // #swagger.tags = ['Speakers']
  const currentPage = req.query.from && req.query.size ? Math.ceil((Number(req.query.from) + 1) / Number(req.query.size)) : 1

  const skip = req.query.from ? parseInt(req.query.from as string) : 0
  const take = req.query.size ? parseInt(req.query.size as string) : API_DEFAULTS.SIZE

  const data = store.getSpeakers({
    event: req.query.event as string | string[] | undefined,
    sort: req.query.sort as string | undefined,
    order: (req.query.order as string) || API_DEFAULTS.ORDER,
    skip,
    take,
  })

  res.status(200).send({
    status: 200,
    message: '',
    data: {
      total: data.total,
      currentPage: currentPage,
      items: data.items,
    },
  })
}

export async function GetSpeaker(req: Request, res: Response) {
  // #swagger.tags = ['Speakers']
  const data = store.getSpeaker(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data: data })
}

export async function GetSpeakerSessions(req: Request, res: Response) {
  // #swagger.tags = ['Speakers']

  const data = store.getSpeaker(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  if (req.query.event) {
    data.sessions = data.sessions.filter((session: any) => session.eventId === req.query.event)
  }

  res.status(200).send({ status: 200, message: '', data: data })
}
