import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs/promises'
import path from 'path'
import { PRESET_DIRS, REFS_DIR, isLabEnabled } from 'services/avatar-lab'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isLabEnabled()) return res.status(404).json({ success: false, error: 'Not found' })

  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  // Reference images live in /public/avatar-lab-refs/, so the client can
  // render them directly via <img src="/avatar-lab-refs/..."> without needing
  // an authed file endpoint.
  const presets: Record<string, string[]> = {}
  for (const d of PRESET_DIRS) {
    try {
      const files = await fs.readdir(path.join(REFS_DIR, d))
      presets[d] = files.filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort()
    } catch {
      presets[d] = []
    }
  }
  return res.status(200).json({ success: true, presets })
}
