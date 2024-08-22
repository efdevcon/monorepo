import { Request, Response, Router } from 'express'
import { PretalxScheduleUpdate } from 'types/schemas'
import { SERVER_CONFIG } from 'utils/config'

export const hooksRouter = Router()
hooksRouter.post(`/hooks/pretalx/schedule`, UpdateSchedule)

export async function UpdateSchedule(req: Request, res: Response) {
  // #swagger.tags = ['Hooks']

  const secret = req.headers['X-Webhook-Secret']
  if (secret !== SERVER_CONFIG.WEBHOOK_SECRET) return res.status(403).send('Forbidden')
  if (!req.body) return res.status(400).send('No Body')

  console.log('REQ.BODY', req.body)

  const body = JSON.parse(req.body)
  if (!body) return res.status(400).send('Invalid Body')

  const data = PretalxScheduleUpdate.parse(body)
  console.log('Pretalx Webhook plugin', data.event, data.user, data.schedule)
  console.log('Changes', data.changes)

  res.status(204).send()
}
