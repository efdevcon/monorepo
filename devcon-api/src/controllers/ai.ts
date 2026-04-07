import { Request, Response, Router } from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { api } from '../services/ai/open-ai/open-ai'
import { devconAppAssistant, devconWebsiteAssistant, devconnectWebsiteAssistant } from '../services/ai/open-ai/assistant-versions'

export const aiRouter = Router()

const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 3600 * 24,
})

aiRouter.get('/devabot/threads/:threadID', async (req: Request, res: Response) => {
  // #swagger.ignore = true
  const { threadID } = req.params

  try {
    const messages = await api.getThreadMessages(threadID)

    res.json(messages)
  } catch (e) {
    console.error(e, 'error')
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

aiRouter.post('/devabot', async (req: Request, res: Response) => {
  // #swagger.ignore = true
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    await rateLimiter.consume(ip as string)
  } catch (error) {
    console.log(error, 'error')
    return res.status(429).json({ error: 'Too Many Requests' })
  }

  const { message, threadID } = req.body

  console.log(threadID, 'msg thread id')

  const version = req.query.version
  let assistant = ''

  if (version === 'devconnect') {
    assistant = devconnectWebsiteAssistant.assistant_id
  } else if (version === 'devcon-website') {
    assistant = devconWebsiteAssistant.assistant_id
  } else if (version === 'devcon-app') {
    assistant = devconAppAssistant.assistant_id
  }

  if (!assistant) {
    return res.status(400).json({ error: 'Invalid DevaBot version' })
  }

  // Set headers for streaming before any async operations
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  try {
    const stream = await api.createMessageStream(assistant, message, threadID)

    for await (const chunk of stream) {
      res.write(JSON.stringify(chunk) + '_chunk_end_')
    }
  } catch (e) {
    console.error(e, 'error')
    // Send error through the stream instead of trying to send a new response
    res.write(JSON.stringify({ error: 'Internal Server Error' }) + '_chunk_end_')
  } finally {
    res.end()
  }
})
