import { Request, Response, Router } from 'express'
import { PretalxScheduleUpdate } from '@/types/schemas'
import { SERVER_CONFIG } from '@/utils/config'

export const hooksRouter = Router()
hooksRouter.post(`/hooks/pretalx/schedule`, UpdateSchedule)

export async function UpdateSchedule(req: Request, res: Response) {
  // #swagger.tags = ['Hooks']

  const secret = req.header('X-Webhook-Secret') || req.headers['x-webhook-secret']
  if (secret !== SERVER_CONFIG.WEBHOOK_SECRET) return res.status(403).send('Forbidden')

  try {
    const data = PretalxScheduleUpdate.parse(req.body)

    console.log('Pretalx Webhook plugin', data.event, data.user, data.schedule)
    console.log('Changes', data.changes)

    res.status(204).send()
  } catch (error) {
    console.error('Error parsing Pretalx Webhook plugin', error)
    res.status(400).send('Bad Request')
  }
}
