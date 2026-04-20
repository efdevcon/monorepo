import type { NextApiRequest, NextApiResponse } from 'next'
import { resolveFormView, getFormFields } from 'services/nocodb-meta'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }

  try {
    const meta = await resolveFormView(viewId)
    const fields = await getFormFields(viewId)

    const columns = fields.map(f => ({
      title: f.title,
      column_name: f.column_name,
      uidt: f.uidt,
      required: f.required,
      ...(f.description ? { description: f.description } : {}),
      ...(f.options ? { options: f.options } : {}),
    }))

    return res.status(200).json({
      title: meta.formHeading,
      ...(meta.formSubheading ? { subheading: meta.formSubheading } : {}),
      ...(meta.successMsg ? { successMsg: meta.successMsg } : {}),
      columns,
    })
  } catch (err) {
    console.error('[nocodb/schema]', err)
    const msg = (err as Error).message
    if (msg.includes('Form view not found')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    return res.status(500).json({ success: false, error: 'Failed to load form schema', details: msg })
  }
}
