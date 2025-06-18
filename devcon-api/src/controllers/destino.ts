import { Request, Response, Router } from 'express'
import { destinoApi } from '../services/ai/open-ai/open-ai'
import { apikeyHandler } from '@/middleware/apikey'

export const destinoRouter = Router()

const generateDestinoEvents = async () => {
  try {
    await destinoApi.generateDestinoEvents()
  } catch (error) {
    console.error('Error generating destino events:', error)
  }
}

destinoRouter.get('/destino', async (req: Request, res: Response) => {
  const eventsList = await destinoApi.getAllDestinoEvents()

  // filter out events that don't have a date
  const eventsListWithDate = eventsList.filter((event) => event.date)

  res.json(eventsListWithDate)
})

destinoRouter.get('/destino/:event', async (req: Request, res: Response) => {
  const { event } = req.params

  const eventData = await destinoApi.getDestinoEvent(event)

  res.json(eventData)
})

destinoRouter.get('/regenerate/:eventId', apikeyHandler, async (req: Request, res: Response) => {
  // Private route: requires apiKey
  // #swagger.ignore = true
  const { eventId } = req.params

  const eventData = await destinoApi.getDestinoEvent(eventId)

  if (!eventData) {
    return res.status(404).json({ error: 'Event not found' })
  }

  try {
    console.log('[regenerate-destino-event] Starting event regeneration')

    console.log('[regenerate-destino-event] Event data:', eventData)

    // Format the event data to match the expected structure
    const formattedEvent = {
      Id: eventData.event_id,
      Name: eventData.name,
      Location: eventData.location,
      Date: { startDate: eventData.date },
      Type: eventData.type_of_event,
      Twitter: eventData.twitter_handle,
      Link: eventData.link,
      TargetAudience: eventData.target_audience,
      Details: eventData.details,
      LastModifiedDate: eventData.last_modified_at,
    }

    const updatedEventData = await destinoApi.generateDestinoEvent(formattedEvent, true)

    console.log('[regenerate-destino-event] Generated event result: OK', updatedEventData)

    if (!updatedEventData) {
      console.error('[regenerate-destino-event] No event data returned from generateDestinoEvent')
      return res.status(500).json({ error: 'Failed to generate event' })
    }

    res.json(updatedEventData)
  } catch (error: any) {
    console.error('[regenerate-destino-event] Error generating event:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

generateDestinoEvents()

// Refresh events every hour
setInterval(generateDestinoEvents, 60 * 60 * 1000)
