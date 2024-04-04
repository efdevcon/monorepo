import { Request, Response, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { API_DEFAULTS } from 'utils/config'

const client = new PrismaClient()

export const speakersRouter = Router()
speakersRouter.get(`/speakers`, GetSpeakers)
speakersRouter.get(`/speakers/:id`, GetSpeaker)

export async function GetSpeakers(req: Request, res: Response) {
  // #swagger.tags = ['Speakers']
  const currentPage = req.query.from && req.query.size ? Math.ceil((Number(req.query.from) + 1) / Number(req.query.size)) : 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any = {
    skip: 0,
    take: API_DEFAULTS.SIZE,
    where: {},
  }
  if (req.query.from) args.skip = parseInt(req.query.from as string)
  if (req.query.size) args.take = parseInt(req.query.size as string)
  if (req.query.sort) args.orderBy = { [req.query.sort as string]: req.query.order || API_DEFAULTS.ORDER }

  // Note: filters are case sensitive
  if (req.query.event) {
    args.where.eventId = {
      in: [req.query.event].flat() as string[],
    }
  }

  const data = await client.$transaction([client.speaker.count({ where: args.where }), client.speaker.findMany(args)])
  res.status(200).send({
    status: 200,
    message: '',
    data: {
      total: data[0],
      currentPage: currentPage,
      items: data[1],
    },
  })
}

export async function GetSpeaker(req: Request, res: Response) {
  // #swagger.tags = ['Speakers']
  const data = await client.speaker.findFirst({
    where: {
      OR: [{ id: req.params.id }, { sourceId: req.params.id }],
    },
  })

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data: data })
}
