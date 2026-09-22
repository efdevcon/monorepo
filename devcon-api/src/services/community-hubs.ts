import { parseDSheetLink, readDSheet } from '@/clients/fileverse'
import {
  COMMUNITY_HUBS,
  COMMUNITY_HUB_TRACK,
  communityHubRoomId,
  eventDays,
  eventUtcOffsetMinutes,
  hubSessionId,
  parseHubSheets,
  shouldKeepPreviousRead,
  type CommunityHub,
  type HubSessionRow,
} from '@/utils/community-hubs'
import { defaultSlugify } from '@/utils/content'
import { CreateBlockie } from '@/utils/account'
import { SERVER_CONFIG } from '@/utils/config'
import { CommitContentFile } from '@/services/github'
import * as store from '@/data/store'
import fs from 'fs'
import path from 'path'

// Community Hub schedules, read straight from the hubs' dSheets and served as
// a bundle shaped like /events/:id/bundle, so the event app can show them
// through its normal schedule view (as a separate dataset, never mixed into
// the Pretalx schedule). The sheets are the source of truth: the parsed
// result lives in memory, with one file per event under data/community-hubs/
// as a warm start after a restart and a fallback while Fileverse is down.
//
// Hub sheet links come from the COMMUNITY_HUB_SHEETS env var: a JSON object of
// hub id -> share link, e.g. {"privacy":"https://sheets.fileverse.io/sheet/<id>#k=<key>"}.
// Hub ids are the ones in COMMUNITY_HUBS.

/** How long a parsed sheet is reused before Fileverse is asked again. */
const REFRESH_MS = 2 * 60_000

export interface HubStatus {
  id: string
  name: string
  sessions: number
  /** When the hub's browser last published the sheet (ms since epoch). */
  publishedAt: number | null
  /** When this API last read the sheet successfully (ms since epoch). */
  readAt: number | null
  /** "previous" while a newer read is held back (see HubData.heldBack) or the sheet could not be read. */
  servedFrom: 'latest' | 'previous'
  problems: string[]
}

export interface CommunityHubBundle {
  version: string
  event: { id: string; title: string; startDate?: string; endDate?: string }
  rooms: Record<string, unknown>[]
  speakers: Record<string, unknown>[]
  sessions: Record<string, unknown>[]
}

interface HubData {
  hub: CommunityHub
  publishedAt: number
  readAt: number
  rows: HubSessionRow[]
  problems: string[]
  /**
   * A newer read that was not put in service because it looked like a broken
   * edit (parse problems and fewer sessions than what is served). Reported on
   * the status endpoint so the hub can fix its sheet; cleared by the next
   * clean read.
   */
  heldBack?: { readAt: number; publishedAt: number; sessions: number; problems: string[] }
}

interface EventCache {
  refreshedAt: number
  inflight: Promise<void> | null
  hubs: Map<string, HubData>
  /** Per-hub read failures from the last refresh (the hub keeps its previous data). */
  failures: Map<string, string>
  configProblems: string[]
  /** Last version committed to the repository (production only), to commit only real changes. */
  committedVersion?: string
  committedAt?: number
}

/** Production commits the cache file to the repo so a redeploy starts from the last good sheets. */
const COMMIT_MIN_INTERVAL_MS = 30 * 60_000

const caches = new Map<string, EventCache>()

export function readHubLinks(): { links: Map<string, string>; problems: string[] } {
  const problems: string[] = []
  const links = new Map<string, string>()
  const raw = process.env.COMMUNITY_HUB_SHEETS
  if (!raw) return { links, problems: ['COMMUNITY_HUB_SHEETS is not set (JSON object of hub id -> dSheets share link)'] }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { links, problems: ['COMMUNITY_HUB_SHEETS is not valid JSON'] }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { links, problems: ['COMMUNITY_HUB_SHEETS must be a JSON object'] }
  for (const [hubId, url] of Object.entries(parsed as Record<string, unknown>)) {
    if (!COMMUNITY_HUBS.some((h) => h.id === hubId)) {
      problems.push(`unknown hub id "${hubId}" in COMMUNITY_HUB_SHEETS`)
      continue
    }
    if (typeof url === 'string' && url.trim()) links.set(hubId, url.trim())
  }
  return { links, problems }
}

const cacheFile = (eventId: string) => path.join(process.cwd(), 'data', 'community-hubs', `${eventId}.json`)

/** Seed from the on-disk copy so a fresh process answers at once; its age still triggers a refresh. */
function cacheFor(eventId: string): EventCache {
  let cache = caches.get(eventId)
  if (!cache) {
    cache = { refreshedAt: 0, inflight: null, hubs: new Map(), failures: new Map(), configProblems: [] }
    try {
      const saved = JSON.parse(fs.readFileSync(cacheFile(eventId), 'utf8')) as { refreshedAt: number; hubs: HubData[] }
      for (const data of saved.hubs) {
        const hub = COMMUNITY_HUBS.find((h) => h.id === data.hub?.id)
        if (hub) cache.hubs.set(hub.id, { ...data, hub })
      }
      // Never counts as fresh (the process may have been down for a while), but
      // marks that there is something to serve if Fileverse is unreachable.
      if (cache.hubs.size > 0) cache.refreshedAt = Math.min(saved.refreshedAt || 1, Date.now() - REFRESH_MS)
    } catch {
      // No file yet, or unreadable: start empty.
    }
    caches.set(eventId, cache)
  }
  return cache
}

const serializeCache = (cache: EventCache) => JSON.stringify({ refreshedAt: cache.refreshedAt, hubs: [...cache.hubs.values()] }, null, 2)

function saveCache(eventId: string, cache: EventCache) {
  const json = serializeCache(cache)
  try {
    fs.mkdirSync(path.dirname(cacheFile(eventId)), { recursive: true })
    fs.writeFileSync(cacheFile(eventId), json)
  } catch (error) {
    console.warn('[community-hubs] could not write the cache file:', error instanceof Error ? error.message : error)
  }
  void commitCache(eventId, cache, json)
}

/**
 * Render's disk does not survive a deploy, so production also commits the
 * file (same path, `[skip deploy]` like the AV writes) whenever the served
 * version changed, at most every COMMIT_MIN_INTERVAL_MS. Local runs never
 * commit.
 */
async function commitCache(eventId: string, cache: EventCache, json: string) {
  if (SERVER_CONFIG.NODE_ENV !== 'production' || !SERVER_CONFIG.GITHUB_TOKEN) return
  const version = versionOf(cache)
  if (cache.committedVersion === version) return
  if (cache.committedAt && Date.now() - cache.committedAt < COMMIT_MIN_INTERVAL_MS) return
  cache.committedAt = Date.now()
  try {
    await CommitContentFile(`devcon-api/data/community-hubs/${eventId}.json`, json, `[skip deploy] Community Hubs cache (${eventId})`)
    cache.committedVersion = version
  } catch (error) {
    console.warn('[community-hubs] could not commit the cache file:', error instanceof Error ? error.message : error)
  }
}

async function readHub(hub: CommunityHub, url: string, event: any): Promise<HubData> {
  const sheet = await readDSheet(parseDSheetLink(url))
  const parsed = parseHubSheets(sheet, eventDays(event.startDate, event.endDate), eventUtcOffsetMinutes(event.id))
  if (!parsed.headerFound) throw new Error(parsed.problems[0] ?? 'not a schedule sheet')
  return { hub, publishedAt: sheet.publishedAt, readAt: Date.now(), rows: parsed.sessions, problems: parsed.problems }
}

async function refresh(eventId: string, cache: EventCache): Promise<void> {
  const event = store.getEvent(eventId)
  if (!event) throw new Error(`unknown event ${eventId}`)
  const { links, problems } = readHubLinks()
  cache.configProblems = problems
  const hubs = COMMUNITY_HUBS.filter((h) => links.has(h.id))
  const results = await Promise.allSettled(hubs.map((hub) => readHub(hub, links.get(hub.id)!, event)))
  cache.failures = new Map()
  results.forEach((result, i) => {
    const hub = hubs[i]
    if (result.status !== 'fulfilled') {
      cache.failures.set(hub.id, result.reason instanceof Error ? result.reason.message : String(result.reason))
      return
    }
    const fresh = result.value
    const prev = cache.hubs.get(hub.id)
    // A typo that breaks rows must not take sessions off the schedule: the
    // previous read stays in service until the sheet parses at least as well.
    if (prev && shouldKeepPreviousRead({ rows: prev.rows.length }, { rows: fresh.rows.length, problems: fresh.problems.length })) {
      cache.hubs.set(hub.id, {
        ...prev,
        heldBack: { readAt: fresh.readAt, publishedAt: fresh.publishedAt, sessions: fresh.rows.length, problems: fresh.problems },
      })
    } else {
      cache.hubs.set(hub.id, { ...fresh, heldBack: undefined })
    }
  })
  // A hub whose link was removed drops out; a hub that failed to read keeps its last good data.
  for (const id of [...cache.hubs.keys()]) if (!links.has(id)) cache.hubs.delete(id)
  cache.refreshedAt = Date.now()
  if (results.some((r) => r.status === 'fulfilled')) saveCache(eventId, cache)
}

/** Fresh enough parsed sheets for the event, re-reading Fileverse at most every REFRESH_MS. Concurrent callers share one refresh. */
async function ensureFresh(eventId: string): Promise<EventCache> {
  const cache = cacheFor(eventId)
  if (Date.now() - cache.refreshedAt < REFRESH_MS) return cache
  if (!cache.inflight) {
    cache.inflight = refresh(eventId, cache).finally(() => {
      cache.inflight = null
    })
  }
  try {
    await cache.inflight
  } catch (error) {
    // Nothing cached yet: surface the failure. Otherwise serve what we have.
    if (cache.refreshedAt === 0) throw error
  }
  return cache
}

/** Version string the app polls: changes when any hub publishes or the hub set changes. */
function versionOf(cache: EventCache): string {
  const latest = Math.max(0, ...[...cache.hubs.values()].map((h) => h.publishedAt))
  return `${latest}-${cache.hubs.size}`
}

export async function getCommunityHubVersion(eventId: string): Promise<string> {
  return versionOf(await ensureFresh(eventId))
}

export async function getCommunityHubStatus(
  eventId: string
): Promise<{ version: string; refreshedAt: number; problems: string[]; hubs: HubStatus[] }> {
  const cache = await ensureFresh(eventId)
  const hubs: HubStatus[] = COMMUNITY_HUBS.filter((h) => cache.hubs.has(h.id) || cache.failures.has(h.id)).map((h) => {
    const data = cache.hubs.get(h.id)
    const failure = cache.failures.get(h.id)
    const held = data?.heldBack
    return {
      id: h.id,
      name: h.name,
      sessions: data?.rows.length ?? 0,
      publishedAt: data?.publishedAt ?? null,
      readAt: data?.readAt ?? null,
      servedFrom: failure || held ? 'previous' : 'latest',
      problems: [
        ...(failure ? [`could not read the sheet: ${failure}`] : []),
        ...(held
          ? [
              `the sheet published at ${new Date(held.publishedAt).toISOString()} is not in service: it parses to ${held.sessions} sessions (${
                data!.rows.length
              } served) with ${held.problems.length} problem(s)`,
              ...held.problems,
            ]
          : data?.problems ?? []),
      ],
    }
  })
  return { version: versionOf(cache), refreshedAt: cache.refreshedAt, problems: cache.configProblems, hubs }
}

export async function getCommunityHubBundle(eventId: string): Promise<CommunityHubBundle> {
  const cache = await ensureFresh(eventId)
  const event = store.getEvent(eventId)
  const rooms: Record<string, unknown>[] = []
  const sessions: Record<string, unknown>[] = []
  const speakers = new Map<string, Record<string, unknown>>()
  for (const hub of COMMUNITY_HUBS) {
    const data = cache.hubs.get(hub.id)
    if (!data) continue
    const roomId = communityHubRoomId(hub.id)
    rooms.push({ id: roomId, name: hub.name, description: '', info: '', capacity: null, color: hub.color })
    const taken = new Set<string>()
    for (const row of data.rows) {
      const speakerIds: string[] = []
      for (const name of row.speakers) {
        const id = defaultSlugify(name)
        if (!id) continue
        speakerIds.push(id)
        if (!speakers.has(id)) speakers.set(id, { id, name, avatar: CreateBlockie(name), description: '' })
      }
      sessions.push({
        id: hubSessionId(hub.id, row, taken),
        title: row.title,
        description: row.description,
        track: COMMUNITY_HUB_TRACK,
        type: row.format || 'Talk',
        expertise: '',
        tags: [hub.name],
        featured: false,
        slot_start: row.start,
        slot_end: row.end,
        slot_roomId: roomId,
        speakerIds,
      })
    }
  }
  return {
    version: versionOf(cache),
    event: {
      id: `${eventId}-community-hubs`,
      title: `${event?.title ?? eventId} Community Hubs`,
      ...(event?.startDate ? { startDate: event.startDate } : {}),
      ...(event?.endDate ? { endDate: event.endDate } : {}),
    },
    rooms,
    speakers: [...speakers.values()],
    sessions,
  }
}

/** Test hook: forget everything cached (each test starts from Fileverse). */
export function resetCommunityHubCache() {
  caches.clear()
}
