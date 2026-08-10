import { GetContributors, GetDIPs } from '@/clients/dips'
import { Request, Response, Router } from 'express'
import { publicCache } from '@/middleware/cache'

export const dipsRouter = Router()
dipsRouter.get(`/dips`, publicCache(3600), GetDips)
dipsRouter.get(`/dips/contributors`, publicCache(3600), GetDipContributors)

async function GetDips(req: Request, res: Response) {
  // #swagger.tags = ['DIPs']
  const data = await GetDIPs()

  res.status(200).send({ status: 200, message: '', data })
}

async function GetDipContributors(req: Request, res: Response) {
  // #swagger.tags = ['DIPs']
  const data = await GetContributors()

  res.status(200).send({ status: 200, message: '', data })
}
