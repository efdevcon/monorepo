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
        points: 15,
        duration: 3600,
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
    const { message, threadID } = JSON.parse(req.body)

    console.log(message, threadID, 'msg thread id')

    const result = await api.createMessage('asst_nirZMEbcECQHLSduSq73vmEB', message, threadID)

    return res.json(result)
  }

  return res.send('hello')
}
