import { Request, Response, Router } from 'express'
import { destinoApi } from '../services/ai/open-ai/open-ai'

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

  res.json(eventsList)
})

destinoRouter.get('/destino/:event', async (req: Request, res: Response) => {
  const { event } = req.params

  const eventData = await destinoApi.getDestinoEvent(event)

  res.json(eventData)
})

// destinoRouter.get('/generate-destino-test', async (req: Request, res: Response) => {
//   try {
//     console.log('[generate-destino-test] Starting test event generation')

//     const testEvent = {
//       Id: '006Vj00000HYjljIAD',
//       Name: 'ETH Cinco de Mayo',
//       Date: {
//         startDate: '2025-05-01',
//       },
//       Location: 'Interlomas, Mexico City, Mexico',
//       Link: 'https://ethcdm.com',
//       Twitter: '@ETHCincoDeMayo',
//       'Type of Event': 'Other',
//       LastModifiedDate: '2025-05-12T13:20:50.000+0000',
//     }

//     console.log('[generate-destino-test] Test event data:', testEvent)

//     const testData = await destinoApi.generateDestinoEvent(testEvent, true)

//     console.log('[generate-destino-test] Generated event result: OK', testData)

//     if (!testData) {
//       console.error('[generate-destino-test] No event data returned from generateDestinoEvent')
//       return res.status(500).json({ error: 'Failed to generate event' })
//     }

//     res.json(testData)
//   } catch (error: any) {
//     console.error('[generate-destino-test] Error generating test event:', error)
//     res.status(500).json({ error: 'Internal server error', details: error.message })
//   }
// })

generateDestinoEvents()

// Refresh events every hour
setInterval(generateDestinoEvents, 60 * 60 * 1000)
