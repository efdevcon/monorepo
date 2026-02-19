import type { NextApiRequest, NextApiResponse } from 'next'
import { readOverrides, writeOverrides, setNestedValue } from './fs-writer'

export function handleCopySave(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { basePath: string }
) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Copy editing is only available in development mode' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { key, path, value } = req.body

  if (!key || !path) {
    return res.status(400).json({ error: 'Missing required fields: key, path' })
  }

  try {
    const existing = readOverrides(options.basePath, key) || {}
    setNestedValue(existing, path, value)
    writeOverrides(options.basePath, key, existing)

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save copy' })
  }
}
