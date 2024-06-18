import { Request, Response, Router } from 'express'
import { getWebsiteContentForQuery } from './rag'
import { infer } from './inference'
import fetch from 'node-fetch'

export const aiRouter = Router()

import './format-content'

aiRouter.post(`/ai/devcon-website/ask`, async (req: Request, res: Response) => {
  const { query, messages } = req.body

  try {
    const flaskResponse = await fetch('http://127.0.0.1:4777/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, messages }),
    })

    // Parse the response from the Flask server
    const flaskData = await flaskResponse.json()

    // Process the response if necessary and send it back to the client
    res.status(200).send(JSON.stringify(flaskData))
  } catch (error) {
    console.error('Error fetching data from Flask server:', error)
    res.status(500).send({ error: 'Internal Server Error' })
  }

  return

  const contentForQuery = await getWebsiteContentForQuery(query)

  const answer = await infer(query, contentForQuery, messages)

  res.status(200).send(answer)
})
