import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { RUNS_DIR, isLabEnabled, mimeFromFilename, safePart } from 'services/avatar-lab'

export const config = { api: { responseLimit: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isLabEnabled()) return res.status(404).json({ success: false, error: 'Not found' })

  const { id, name } = req.query
  if (typeof id !== 'string' || typeof name !== 'string' || !safePart(id) || !safePart(name)) {
    return res.status(400).json({ success: false, error: 'Bad path' })
  }

  const file = path.join(RUNS_DIR, id, name)
  if (!fs.existsSync(file)) {
    return res.status(404).end()
  }

  res.setHeader('Content-Type', mimeFromFilename(name))
  res.setHeader('Cache-Control', 'private, max-age=31536000')
  const stream = fs.createReadStream(file)
  stream.pipe(res)
}
