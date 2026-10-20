import type { DSheet } from '@/clients/fileverse'
import {
  COMMUNITY_HUBS,
  COMMUNITY_HUB_TRACK,
  communityHubRoomId,
  eventDays,
  eventUtcOffsetMinutes,
  hubSessionId,
  LIVE_HUB_SHEETS_PATH,
  parseHubSheets,
  shouldKeepPreviousRead,
  type CommunityHub,
  type HubSessionRow,
  type LiveHubSheet,
  type LiveHubSheets,
} from '@/utils/community-hubs'
import { defaultSlugify } from '@/utils/content'
import { CreateBlockie } from '@/utils/account'
import { SERVER_CONFIG } from '@/utils/config'
import { TriggerWorkflow } from '@/services/github'
import * as store from '@/data/store'
import fs from 'fs'
import path from 'path'

// Community Hub schedules, read from the hubs' dSheets and served as a bundle
// shaped like /events/:id/bundle, so the event app can show them through its
// normal schedule view (as a separate dataset, never mixed into the Pretalx
// schedule). The sheets are the source of truth. An hourly GitHub Action
// (.github/workflows/fileverse-live-export.yml) reads their live state and
// commits the cells to LIVE_HUB_SHEETS_PATH; the API reads that file from
// GitHub (its own disk copy is only as fresh as the last deploy, since the
// Action's commits skip deploys). The parsed result lives in memory only; the
// deployed copy of the file is the warm start after a restart and the
// fallback while GitHub is unreachable. Nothing is written back to the repo.
//
// The sheet links never reach the API: they live in the Action's
// COMMUNITY_HUB_SHEETS secret. Hub ids are the ones in COMMUNITY_HUBS.

/** How long a parsed sheet is reused before GitHub is asked again. */
const REFRESH_MS = 2 * 60_000
/** The Action runs hourly and rewrites the file at least every 6 hours; older than this means it stopped. */
const EXPORT_STALE_MS = 8 * 60 * 60_000
const LIVE_SHEETS_URL = `https://api.github.com/repos/efdevcon/monorepo/contents/${LIVE_HUB_SHEETS_PATH}?ref=main`

export interface HubStatus {
  id: string
  name: string
  sessions: number
  /** When the sheet's cells last changed, as seen by the live export (ms since epoch). */
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
  /** When the live export that was last read ran (ms since epoch). */
  exportedAt?: number
}

const caches = new Map<string, EventCache>()

/**
 * The live export as committed on main. The contents API (raw media type) is
 * not CDN-cached like raw.githubusercontent.com, so a fresh commit shows at
 * once; the token only lifts the rate limit. The local copy is the fallback.
 */
async function fetchLiveSheets(): Promise<LiveHubSheets> {
  let remoteError: unknown
  try {
    const res = await fetch(LIVE_SHEETS_URL, {
      headers: {
        Accept: 'application/vnd.github.raw',
        'Cache-Control': 'no-cache',
        ...(SERVER_CONFIG.GITHUB_TOKEN ? { Authorization: `token ${SERVER_CONFIG.GITHUB_TOKEN}` } : {}),
      },
    })
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
    return validLiveSheets(await res.json())
  } catch (error) {
    remoteError = error
  }
  try {
    const local = readLocalSheets()
    console.warn('[community-hubs] live sheets read from the local copy:', remoteError instanceof Error ? remoteError.message : remoteError)
    return local
  } catch {
    throw new Error(`could not read the live sheets: ${remoteError instanceof Error ? remoteError.message : String(remoteError)}`)
  }
}

function validLiveSheets(data: any): LiveHubSheets {
  if (!data || typeof data.exportedAt !== 'number' || !data.hubs || typeof data.hubs !== 'object') throw new Error('the live sheets file has an unexpected shape')
  return data
}

/** The copy of the live export that shipped with this deploy (or the local checkout). */
function readLocalSheets(): LiveHubSheets {
  return validLiveSheets(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'community-hubs', 'sheets.json'), 'utf8')))
}

/** Seed from the local copy of the live export so a fresh process has something to serve if GitHub is unreachable. */
function cacheFor(eventId: string): EventCache {
  let cache = caches.get(eventId)
  if (!cache) {
    cache = { refreshedAt: 0, inflight: null, hubs: new Map(), failures: new Map(), configProblems: [] }
    try {
      const live = readLocalSheets()
      const event = store.getEvent(eventId)
      if (event) {
        for (const hub of COMMUNITY_HUBS) {
          if (!live.hubs[hub.id]) continue
          try {
            cache.hubs.set(hub.id, readHub(hub, live.hubs[hub.id], event))
          } catch {
            // Unreadable in the local copy: the first refresh reports it.
          }
        }
      }
      cache.exportedAt = live.exportedAt
      // Never counts as fresh: the first request still reads GitHub.
      if (cache.hubs.size > 0) cache.refreshedAt = 1
    } catch {
      // No local copy: start empty.
    }
    caches.set(eventId, cache)
  }
  return cache
}

function readHub(hub: CommunityHub, live: LiveHubSheet, event: any): HubData {
  if (!live.tabs.length) throw new Error(live.error ?? 'the live export has no cells for this sheet')
  const sheet: DSheet = { dsheetId: hub.id, tabs: live.tabs, publishedAt: live.changedAt }
  const parsed = parseHubSheets(sheet, eventDays(event.startDate, event.endDate), eventUtcOffsetMinutes(event.id))
  if (!parsed.headerFound) throw new Error(parsed.problems[0] ?? 'not a schedule sheet')
  return { hub, publishedAt: sheet.publishedAt, readAt: Date.now(), rows: parsed.sessions, problems: parsed.problems }
}

async function refresh(eventId: string, cache: EventCache): Promise<void> {
  const event = store.getEvent(eventId)
  if (!event) throw new Error(`unknown event ${eventId}`)
  // A failed fetch throws: ensureFresh then keeps serving what is cached.
  const live = await fetchLiveSheets()
  cache.exportedAt = live.exportedAt
  const age = Date.now() - live.exportedAt
  cache.configProblems =
    age > EXPORT_STALE_MS
      ? [`the live export last ran ${Math.round(age / 3_600_000)} hours ago: check the "Community Hubs live export" GitHub Action`]
      : []
  const hubs = COMMUNITY_HUBS.filter((h) => live.hubs[h.id])
  const results = hubs.map((hub) => {
    try {
      return { status: 'fulfilled' as const, value: readHub(hub, live.hubs[hub.id], event) }
    } catch (reason) {
      return { status: 'rejected' as const, reason }
    }
  })
  cache.failures = new Map()
  results.forEach((result, i) => {
    const hub = hubs[i]
    const exportError = live.hubs[hub.id].error
    if (result.status !== 'fulfilled') {
      cache.failures.set(hub.id, result.reason instanceof Error ? result.reason.message : String(result.reason))
      return
    }
    // The export could not read the sheet this time and kept its previous cells: serve them, say so.
    if (exportError) cache.failures.set(hub.id, `${exportError} (the previous export is served)`)
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
  // A hub whose link was removed from the secret drops out; a hub that failed to read keeps its last good data.
  for (const id of [...cache.hubs.keys()]) if (!live.hubs[id]) cache.hubs.delete(id)
  cache.refreshedAt = Date.now()
}

/** Fresh enough parsed sheets for the event, re-reading the live export at most every REFRESH_MS. Concurrent callers share one refresh. */
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
): Promise<{ version: string; refreshedAt: number; exportedAt: number | null; problems: string[]; hubs: HubStatus[] }> {
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
              `the sheet as of ${new Date(held.publishedAt).toISOString()} is not in service: it parses to ${held.sessions} sessions (${
                data!.rows.length
              } served) with ${held.problems.length} problem(s)`,
              ...held.problems,
            ]
          : data?.problems ?? []),
      ],
    }
  })
  return { version: versionOf(cache), refreshedAt: cache.refreshedAt, exportedAt: cache.exportedAt ?? null, problems: cache.configProblems, hubs }
}

export async function getCommunityHubBundle(eventId: string): Promise<CommunityHubBundle> {
  const cache = await ensureFresh(eventId)
  const event = store.getEvent(eventId)
  const rooms: Record<string, unknown>[] = []
  const sessions: Record<string, unknown>[] = []
  const speakers = new Map<string, Record<string, unknown>>()
  // A hub speaker who also speaks on this event's main programme has the same id (both are the
  // name's slug): reuse that speaker's photo, bio and socials instead of a generated avatar.
  // Limited to this event so a namesake from a past Devcon is never merged in, and to full names:
  // hubs often list first names only ("Vijay"), which may be someone else on the main programme.
  const mainSpeakers = new Map<string, any>(store.getSpeakers({ event: eventId, take: Number.MAX_SAFE_INTEGER }).items.map((s: any) => [s.id, s]))
  for (const hub of COMMUNITY_HUBS) {
    const data = cache.hubs.get(hub.id)
    if (!data) continue
    const roomId = communityHubRoomId(hub.id)
    rooms.push({ id: roomId, name: hub.name, description: '', info: '', capacity: null, color: hub.color })
    const taken = new Set<string>()
    for (const row of data.rows) {
      // Lunch and breaks stay in the hubs' sheets for their own planning but are not sessions in the app.
      if (row.format.trim().toLowerCase() === 'break') continue
      const speakerIds: string[] = []
      for (const name of row.speakers) {
        const id = defaultSlugify(name)
        if (!id) continue
        speakerIds.push(id)
        if (!speakers.has(id)) {
          const main = name.trim().split(/\s+/).length > 1 ? mainSpeakers.get(id) : undefined
          speakers.set(id, {
            id,
            name,
            avatar: main?.avatar || CreateBlockie(name),
            description: main?.description ?? '',
            ...(main?.twitter ? { twitter: main.twitter } : {}),
            ...(main?.github ? { github: main.github } : {}),
            ...(main?.website ? { website: main.website } : {}),
          })
        }
      }
      sessions.push({
        id: hubSessionId(hub.id, row, taken),
        title: row.title,
        description: row.description,
        track: COMMUNITY_HUB_TRACK,
        // Format is optional in the sheet; blank stays blank (the app then shows only the hub as location).
        type: row.format,
        expertise: '',
        // The hub name first (the app tells hubs from topics by name), then
        // the sheet's free-text Topic when given.
        tags: row.topic ? [hub.name, row.topic] : [hub.name],
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

/**
 * Starts the hourly live export (.github/workflows/fileverse-live-export.yml)
 * at minute 7 of every hour. The workflow's own cron is only a backup: GitHub
 * runs this repo's schedules hours late (the daily cleanup fires 4-6 h after
 * midnight), which an hourly export cannot live with. Production only; a run
 * that finds nothing new commits nothing, and overlapping runs queue.
 */
export function startLiveExportTimer() {
  if (SERVER_CONFIG.NODE_ENV !== 'production' || !SERVER_CONFIG.GITHUB_TOKEN) return
  const trigger = () => void TriggerWorkflow('fileverse-live-export.yml').catch((error) => console.warn('[community-hubs] could not start the live export:', error))
  const now = new Date()
  const next = new Date(now)
  next.setUTCMinutes(7, 0, 0)
  if (next <= now) next.setUTCHours(next.getUTCHours() + 1)
  setTimeout(() => {
    trigger()
    setInterval(trigger, 60 * 60_000)
  }, next.getTime() - now.getTime())
}

/** Test hook: forget everything cached (each test starts from the live export). */
export function resetCommunityHubCache() {
  caches.clear()
}
