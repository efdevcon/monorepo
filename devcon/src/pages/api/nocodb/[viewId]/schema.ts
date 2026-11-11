import type { NextApiRequest, NextApiResponse } from 'next'
import { resolveFormView, getFormFields, getConditionalRules } from 'services/nocodb-meta'
import { isPreviewAllowed } from 'services/form-config'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }

  try {
    // A preview link (X-Form-Preview = the form's preview password) reads NocoDB fresh, skipping the
    // 5-minute caches, so whoever is editing the form sees each change on reload. Checked against the
    // password so the public can't force uncached NocoDB calls.
    const previewHeader = req.headers['x-form-preview']
    const fresh = await isPreviewAllowed(viewId, Array.isArray(previewHeader) ? previewHeader[0] : previewHeader)
    if (fresh) res.setHeader('Cache-Control', 'no-store')

    const [meta, fields, conditionalRules] = await Promise.all([
      resolveFormView(viewId, fresh),
      getFormFields(viewId, fresh),
      getConditionalRules(viewId, fresh),
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
      ...(f.isList ? { isList: true } : {}),
      ...(f.section ? { section: f.section } : {}),
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
