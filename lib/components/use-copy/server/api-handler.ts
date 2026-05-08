import type { NextApiRequest, NextApiResponse } from 'next'
import { readOverrides, writeOverrides, setNestedValue, CopyPathTraversalError } from './fs-writer'

export function handleCopySave(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { basePath: string }
) {
  // M16: production gate. Pre-fix code already had this, kept here as the
  // outermost defense — but the fs-writer now also enforces the basePath
  // confinement so a misconfigured dev/preview deploy can't write anywhere
  // either.
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
  if (typeof key !== 'string' || typeof path !== 'string') {
    return res.status(400).json({ error: 'key and path must be strings' })
  }

  try {
    const existing = readOverrides(options.basePath, key) || {}
    setNestedValue(existing, path, value)
    writeOverrides(options.basePath, key, existing)

    return res.status(200).json({ success: true })
  } catch (error) {
    if (error instanceof CopyPathTraversalError) {
      return res.status(400).json({ error: error.message })
    }
    if (error instanceof Error && /invalid path segment/.test(error.message)) {
      return res.status(400).json({ error: error.message })
    }
    return res.status(500).json({ error: 'Failed to save copy' })
  }
}
