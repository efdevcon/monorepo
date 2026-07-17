import type { NextApiRequest, NextApiResponse } from 'next'
import { resolveFormView, getFormFields, getConditionalRules } from 'services/nocodb-meta'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }

  try {
    const [meta, fields, conditionalRules] = await Promise.all([
      resolveFormView(viewId),
      getFormFields(viewId),
      getConditionalRules(viewId),
    ])

    const columns = fields.map(f => ({
      // `id` is the NocoDB column id — surfaced so the form renderer can
      // match conditional rules (which reference columns by id) against the
      // rendered fields. Existing consumers ignore it harmlessly.
      id: f.id,
      title: f.title,
      column_name: f.column_name,
      uidt: f.uidt,
      required: f.required,
      ...(f.description ? { description: f.description } : {}),
      ...(f.options ? { options: f.options } : {}),
      ...(f.rating ? { rating: f.rating } : {}),
    }))

    return res.status(200).json({
      title: meta.formHeading,
      ...(meta.formSubheading ? { subheading: meta.formSubheading } : {}),
      ...(meta.successMsg ? { successMsg: meta.successMsg } : {}),
      columns,
      ...(conditionalRules.length > 0 ? { conditionalRules } : {}),
    })
  } catch (err) {
    // Full error (incl. upstream NocoDB URL/status) goes to the server log
    // only — echoing it to the public response leaked internal API paths.
    console.error('[nocodb/schema]', err)
    const msg = (err as Error).message
    if (msg.includes('Form view not found')) {
      return res.status(404).json({ success: false, error: 'Form not found' })
    }
    return res.status(500).json({ success: false, error: 'Failed to load form schema' })
  }
}
