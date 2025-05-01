import { Request, Response, Router } from 'express'
import { experimentation, api } from '@/services/at-slurper/main'
import { fetchFromNotion, upsertEventToNotion } from '@/services/at-slurper/notion-client'

export const atSlurperRouter = Router()

atSlurperRouter.get('/at-slurper', async (req: Request, res: Response) => {
  //   const { threadID } = req.params

  try {
    const messages = await experimentation.getATData()

    res.json(messages)
  } catch (e) {
    console.error(e, 'error')
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

atSlurperRouter.get('/at-slurper/server-lexicons', async (req: Request, res: Response) => {
  const serverLexicons = await experimentation.getServerLexicons()

  res.json(serverLexicons)
})

atSlurperRouter.get('/at-slurper/notion-events', async (req: Request, res: Response) => {
  const notionEvents = await fetchFromNotion()

  res.json(notionEvents)
})

atSlurperRouter.get('/at-slurper/notion-events-upsert', async (req: Request, res: Response) => {
  const event = {
    title: 'Test Event',
    description: 'Test Description',
    start: '2024-01-01',
    end: '2024-01-02',
    location: 'Test Location',
    url: 'https://test.com',
  }

  const notionEvent = await upsertEventToNotion(event)

  res.json(notionEvent)
})

/*
    TODO:
        - Get data from AT protocol
        - Post data to AT protocol 
*/
