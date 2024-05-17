import { Request, Response, Router } from 'express'
import { getWebsiteContentForQuery } from './rag'
import { infer } from './inference'

export const aiRouter = Router()

aiRouter.post(`/ai/devcon-website/ask`, async (req: Request, res: Response) => {
  const { query } = req.body

  const contentForQuery = await getWebsiteContentForQuery(query)

  const answer = await infer(query, contentForQuery)

  res.status(200).send(answer)
})
