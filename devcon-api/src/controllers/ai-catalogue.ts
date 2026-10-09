import { Request, Response, Router } from 'express'
import { publicCache } from '@/middleware/cache'
import * as store from '@/data/store'
import { buildCatalogue } from '@/services/ai-catalogue'
import { formatIndex, formatSessionList, type CatalogueFilters } from '@/utils/ai-catalogue'

// The programme as markdown for AI assistants (ChatGPT, Claude, self-hosted):
// an index that explains the data and links one list per day, each line one
// session with its code first. The event app's "Plan with your AI" card sends
// assistants here; they hand codes back through /my-interests?add=... in the
// app. Main programme from the store, Community Hubs from their live bundle.
// Served as text/plain: every assistant's URL fetcher accepts it, while
// text/markdown is not on all of their allowlists.
export const aiCatalogueRouter = Router()
aiCatalogueRouter.get(`/events/:id/ai`, publicCache(300), GetAiIndex)
// One path per page (index, /day/:n, /sessions = all days), query only on /search: see catalogueUrls in utils/ai-catalogue.ts.
aiCatalogueRouter.get(`/events/:id/ai/day/:day`, publicCache(60), GetAiSessions)
aiCatalogueRouter.get(`/events/:id/ai/sessions`, publicCache(60), GetAiSessions)
aiCatalogueRouter.get(`/events/:id/ai/search`, publicCache(60), GetAiSessions)

function apiOrigin(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] || req.protocol
  return `${proto}://${req.get('host')}`
}

const text = (req: Request) => (name: string): string | undefined => {
  const v = req.query[name]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export async function GetAiIndex(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.summary = 'Markdown index of the programme for AI assistants: day lists, filters, how to hand sessions back to the app.'
  if (!store.getEvent(req.params.id)) return res.status(404).send({ status: 404, message: 'Not Found' })
  const { sessions, hubs, ctx } = await buildCatalogue(req.params.id, apiOrigin(req))
  res.status(200).type('text/plain; charset=utf-8').send(formatIndex(sessions, hubs, ctx))
}

export async function GetAiSessions(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.summary = 'Session list for AI assistants, one line per session: /day/:n, /sessions (all days) or /search?q=&day=&track=&type=&room=&ids=&full=1.'
  if (!store.getEvent(req.params.id)) return res.status(404).send({ status: 404, message: 'Not Found' })
  const get = text(req)
  const day = req.params.day ?? get('day')
  const filters: CatalogueFilters = {
    day: day && /^\d+$/.test(day) ? Number(day) : undefined,
    track: get('track'),
    type: get('type'),
    room: get('room'),
    q: get('q'),
    ids: get('ids')?.split(/[\s,]+/).filter(Boolean),
    full: get('full') === '1' || get('full') === 'true',
  }
  const { sessions, ctx } = await buildCatalogue(req.params.id, apiOrigin(req))
  res.status(200).type('text/plain; charset=utf-8').send(formatSessionList(sessions, filters, ctx))
}
