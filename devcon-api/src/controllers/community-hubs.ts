import { Request, Response, Router } from 'express'
import { publicCache } from '@/middleware/cache'
import * as store from '@/data/store'
import { getCommunityHubBundle, getCommunityHubStatus, getCommunityHubVersion } from '@/services/community-hubs'

// Community Hub schedules (read live from the hubs' dSheets, cached in memory;
// see services/community-hubs.ts). Same response shapes as /events/:id/version
// and /events/:id/bundle so the event app loads them as its own dataset.
export const communityHubsRouter = Router()
communityHubsRouter.get(`/events/:id/community-hubs`, publicCache(60), GetCommunityHubs)
communityHubsRouter.get(`/events/:id/community-hubs/version`, publicCache(60), GetCommunityHubsVersion)
communityHubsRouter.get(`/events/:id/community-hubs/bundle`, publicCache(60), GetCommunityHubsBundle)

function failed(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[community-hubs]', message)
  res.status(502).send({ status: 502, message: `Community hub sheets unavailable: ${message}` })
}

export async function GetCommunityHubs(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.summary = 'Community Hub sheet status: which hubs were read, when, and any rows that could not be parsed.'
  if (!store.getEvent(req.params.id)) return res.status(404).send({ status: 404, message: 'Not Found' })
  try {
    res.status(200).send({ status: 200, message: '', data: await getCommunityHubStatus(req.params.id) })
  } catch (error) {
    failed(res, error)
  }
}

export async function GetCommunityHubsVersion(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.summary = 'Version of the Community Hub bundle (changes when a hub publishes its sheet).'
  if (!store.getEvent(req.params.id)) return res.status(404).send({ status: 404, message: 'Not Found' })
  try {
    res.status(200).send({ status: 200, message: '', data: await getCommunityHubVersion(req.params.id) })
  } catch (error) {
    failed(res, error)
  }
}

export async function GetCommunityHubsBundle(req: Request, res: Response) {
  // #swagger.tags = ['Events']
  // #swagger.summary = 'Community Hub sessions, speakers and rooms in the offline bundle shape, one room per hub.'
  if (!store.getEvent(req.params.id)) return res.status(404).send({ status: 404, message: 'Not Found' })
  try {
    res.status(200).send({ status: 200, message: '', data: await getCommunityHubBundle(req.params.id) })
  } catch (error) {
    failed(res, error)
  }
}
