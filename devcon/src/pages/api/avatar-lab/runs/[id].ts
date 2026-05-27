import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs/promises'
import path from 'path'
import { RUNS_DIR, isLabEnabled, safePart } from 'services/avatar-lab'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isLabEnabled()) return res.status(404).json({ success: false, error: 'Not found' })

  const { id } = req.query
  if (typeof id !== 'string' || !safePart(id)) {
    return res.status(400).json({ success: false, error: 'Bad id' })
  }

  if (req.method === 'GET') {
    try {
      const raw = await fs.readFile(path.join(RUNS_DIR, id, 'meta.json'), 'utf8')
      return res.status(200).json({ success: true, id, ...JSON.parse(raw) })
    } catch {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await fs.rm(path.join(RUNS_DIR, id), { recursive: true, force: true })
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message })
    }
  }

  return res.status(405).setHeader('Allow', 'GET, DELETE').end()
}
