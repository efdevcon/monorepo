import type { NextApiRequest, NextApiResponse } from 'next'
import { getFormConfig } from 'config/nocodb-forms'
import { getTableFields, createRow } from 'services/nocodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { slug } = req.query
  if (typeof slug !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid slug' })
  }

  const { data } = req.body ?? {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ success: false, error: 'Missing or invalid data' })
  }

  try {
    getFormConfig(slug)
    const fields = await getTableFields(slug)
    const validNames = new Set(fields.map(f => f.column_name))

    // Reject unknown fields
    for (const key of Object.keys(data)) {
      if (!validNames.has(key)) {
        return res.status(400).json({ success: false, error: `Unknown field: ${key}` })
      }
    }

    await createRow(slug, data)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[nocodb/submit]', err)
    const msg = (err as Error).message
    if (msg.includes('Unknown form slug')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    return res.status(500).json({ success: false, error: 'Submission failed', details: msg })
  }
}
