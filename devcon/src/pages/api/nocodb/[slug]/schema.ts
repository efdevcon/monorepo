import type { NextApiRequest, NextApiResponse } from 'next'
import { getFormConfig } from 'config/nocodb-forms'
import { getTableFields } from 'services/nocodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  const { slug } = req.query
  if (typeof slug !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid slug' })
  }

  try {
    const config = getFormConfig(slug)
    const fields = await getTableFields(slug)

    const columns = fields.map(f => ({
      title: f.title,
      column_name: f.column_name,
      uidt: f.type,
      required: f.required,
      ...(f.description ? { description: f.description } : {}),
      ...(f.options ? { options: f.options } : {}),
    }))

    return res.status(200).json({ title: config.title, columns })
  } catch (err) {
    console.error('[nocodb/schema]', err)
    const msg = (err as Error).message
    if (msg.includes('Unknown form slug')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    return res.status(500).json({ success: false, error: 'Failed to load form schema', details: msg })
  }
}
