import { NextApiRequest, NextApiResponse } from 'next'
import { api } from './open-ai'
import { Pool } from 'pg'
// @ts-ignore
import { RateLimiterPostgres } from 'rate-limiter-flexible'

let pool: Pool | null = null

const getRateLimiter = async () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DB_CONNECTION_STRING,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  }

  return new Promise((resolve, reject) => {
    const ratelimiter = new RateLimiterPostgres(
      {
        storeClient: pool,
        tableName: 'rate_limit', // This table will be created automatically
        points: 100,
        duration: 3600 * 24,
      },
      () => {
        resolve(ratelimiter)
      }
    )
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rateLimiter = await getRateLimiter()
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

  try {
    // @ts-ignore
    await rateLimiter.consume(ip as string)
  } catch (error) {
    console.log(error, 'error')
    return res.status(429).json({ error: 'Too Many Requests' })
  }

  if (req.method === 'GET') {
    return res.send('hello from server')
  } else if (req.method === 'POST') {
    console.log(req.body, 'req.body')
    const { message, threadID } = req.body

    console.log(message, threadID, 'msg thread id')

    // Set headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    })

    // Create a stream for the AI response
    const stream = await api.createMessageStream('asst_nirZMEbcECQHLSduSq73vmEB', message, threadID)

    // Stream the response to the client
    for await (const chunk of stream) {
      res.write(JSON.stringify(chunk))
      // res.flush() // Ensure the data is sent immediately
    }

    // End the response
    // res.write()
    res.end()
    return
  }

  return res.send('hello')
}
