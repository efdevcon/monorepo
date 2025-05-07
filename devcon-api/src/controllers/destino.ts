import { Request, Response, Router } from 'express'
import { destinoApi } from '../services/ai/open-ai/open-ai'

export const destinoRouter = Router()

const generateDestinoEvents = async () => {
  await destinoApi.generateDestinoEvents()
}

destinoRouter.get('/destino', async (req: Request, res: Response) => {
  const eventsList = await destinoApi.getAllDestinoEvents()

  res.json(eventsList)
})

destinoRouter.get('/destino/:event', async (req: Request, res: Response) => {
  const { event } = req.params

  const eventData = await destinoApi.getDestinoEvent(event)

  res.json(eventData)
})

generateDestinoEvents()

// Refresh events every hour
setInterval(generateDestinoEvents, 60 * 60 * 1000)
