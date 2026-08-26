import { Request, Response, Router } from 'express'
import { PretalxScheduleUpdate } from '@/types/schemas'
import { SERVER_CONFIG, getPretalxConfig, getEventIdByPretalxSlug, PretalxInstanceConfig } from '@/utils/config'
import { TriggerWorkflow, CommitContentFile } from '@/services/github'
import { GetSessions, GetSpeakers, clearPretalxCache, getPublishedScheduleVersion } from '@/clients/pretalx'
import { resolveSpeakerAvatar } from '@/services/avatar-mirror'
import { FetchNocoDbTable } from '@/clients/nocodb'
import * as store from '@/data/store'
import dayjs from 'dayjs'

const WORKFLOW_MAP: Record<string, string[]> = {
  'devcon-7': ['sync-pretalx.yml'],
  'test-devcon-8': ['sync-pretalx-test-devcon-8.yml', 'run-of-show-test-devcon-8.yml'],
  'devcon8': ['sync-pretalx-devcon8.yml', 'run-of-show-devcon8.yml'],
}

export const hooksRouter = Router()
hooksRouter.post(`/hooks/pretalx/schedule`, UpdateSchedule)
hooksRouter.post(`/hooks/pretalx/:eventId/schedule`, UpdateSchedule)
hooksRouter.post(`/hooks/nocodb`, UpdateNocoDb)
hooksRouter.post(`/hooks/nocodb/:tableId`, UpdateNocoDb)

// The most recently started detached sync (see the ack-then-sync note in
// UpdateSchedule). Exported via waitForPendingSync so tests can await the
// sync's effects after the (now immediate) 204.
let pendingSync: Promise<void> = Promise.resolve()
export const waitForPendingSync = () => pendingSync

export async function UpdateSchedule(req: Request, res: Response) {
  // #swagger.ignore = true

  const secret = req.header('X-Webhook-Secret') || req.headers['x-webhook-secret']
  if (secret !== SERVER_CONFIG.WEBHOOK_SECRET) return res.status(403).send('Forbidden')

  try {
    const data = PretalxScheduleUpdate.parse(req.body)

    // Resolve eventId from route param, or from pretalx event slug in payload.
    // No fallback: an unknown slug must not silently resync another event.
    const eventId = req.params.eventId || getEventIdByPretalxSlug(data.event)
    if (!eventId) {
      console.warn('Pretalx webhook for unknown event slug, ignoring:', data.event)
      return res.status(400).send('Unknown event slug')
    }
    const config = getPretalxConfig(eventId)

    console.log('Pretalx Webhook plugin', data.event, data.user, data.schedule, `(eventId: ${eventId})`)
    // Logged for visibility only. We no longer act on these deltas: Pretalx
    // omits edits to existing talks (only add/cancel/move), so a delta-only
    // update silently misses content edits. We full-resync instead.
    console.log('Changes', data.changes)

    // Ack immediately and sync detached. The pretalx webhook plugin fires
    // this request synchronously from inside the release request (Django
    // signals are synchronous, and the deployed plugin has no timeout), so
    // every second we hold the response is a second the orga "release new
    // version" action hangs. Holding it for the full sync — the visibility
    // guard alone can poll for 2 minutes — pushed releases past the proxy/
    // worker timeouts, which killed and rolled back the release itself.
    // Must stay 204: the deployed plugin only treats 200/201/204 as success.
    pendingSync = SyncPretalx(config, data.schedule).catch(error => {
      console.error('Detached Pretalx sync failed:', error)
    })
    res.status(204).send()
  } catch (error) {
    console.error('Error parsing Pretalx Webhook plugin', error)
    res.status(400).send('Bad Request')
  }
}

function pretalxToStoreData(item: any, eventId: string) {
  return {
    ...item,
    tags: item.tags?.join(',') || '',
    keywords: item.keywords?.join(',') || '',
    slot_start: item.slot_start ? dayjs(item.slot_start).toISOString() : null,
    slot_end: item.slot_end ? dayjs(item.slot_end).toISOString() : null,
    eventId,
    speakers: (item.speakers || []).map((i: any) => i.id ?? i),
    slot_roomId: item.slot_roomId || null,
  }
}

// Last successfully synced dataset per event (normalized), so the version
// only bumps when the data actually changed. A bump without a diff actively
// masks sync failures (it's what hid the stale-cache bug for months) and
// makes every consumer re-download the full dataset for nothing.
const lastSyncSnapshot = new Map<string, string>()

// Release-race guard tuning. Exported for tests. Observed live 2026-08-17:
// a release took ~35s to become visible in the public widget — the original
// 5x6s budget lost by seven seconds. 2 minutes gives comfortable margin.
export const SCHEDULE_VISIBILITY_RETRIES = 15
export const SCHEDULE_VISIBILITY_DELAY_MS = 8000
// If visibility STILL hasn't caught up when the budget runs out, one deferred
// re-sync fires after this delay — covering pathological propagation without
// risking an infinite chain (the retry never schedules another retry).
export const SCHEDULE_VISIBILITY_DEFERRED_RETRY_MS = 3 * 60_000

async function SyncPretalx(config: PretalxInstanceConfig, expectedScheduleVersion?: string, isDeferredRetry = false) {
  const { eventId } = config
  console.log(`Full re-sync of Pretalx sessions for ${eventId}...`)

  // Release-moment race: Pretalx fires the webhook BEFORE its API reflects
  // the newly released schedule, so an immediate fetch returns pre-release
  // data (observed live 2026-08-17). When the webhook tells us which version
  // was just released, wait until the published version matches before
  // fetching. On timeout we proceed anyway — a possibly-pre-release sync is
  // still better than none, and the workflow/deploy corrects it later.
  if (expectedScheduleVersion) {
    for (let attempt = 0; attempt < SCHEDULE_VISIBILITY_RETRIES; attempt++) {
      const published = await getPublishedScheduleVersion(config)
      if (published === null || published === String(expectedScheduleVersion)) {
        if (published === null) console.warn('Could not read published schedule version — proceeding')
        break
      }
      console.log(`Published schedule is '${published}', webhook says '${expectedScheduleVersion}' — waiting for release to become visible (${attempt + 1}/${SCHEDULE_VISIBILITY_RETRIES})`)
      if (attempt === SCHEDULE_VISIBILITY_RETRIES - 1) {
        console.warn('Release never became visible in time — syncing anyway now')
        if (!isDeferredRetry) {
          console.warn(`Scheduling ONE deferred re-sync in ${SCHEDULE_VISIBILITY_DEFERRED_RETRY_MS / 1000}s to self-heal`)
          setTimeout(() => {
            SyncPretalx(config, expectedScheduleVersion, true).catch((e) =>
              console.error('Deferred re-sync failed:', e),
            )
          }, SCHEDULE_VISIBILITY_DEFERRED_RETRY_MS)
        }
      } else {
        await new Promise((r) => setTimeout(r, SCHEDULE_VISIBILITY_DELAY_MS))
      }
    }
  }

  // The Pretalx client caches responses per event with no TTL — correct for
  // one-shot scripts, fatal here: in the long-lived server a re-publish would
  // "re-fetch" the pre-publish cached response and no-op. Always start a sync
  // from a clean slate for this event.
  clearPretalxCache(eventId)

  // 1) Slow async work against the live source — store keeps serving old data.
  const sessions = await GetSessions({}, config)
  console.log(`Fetched ${sessions.length} sessions from Pretalx`)

  // Ensure every referenced speaker exists in the store first. This is additive
  // (only ever adds speaker records) so it can't disrupt concurrent reads.
  for (const session of sessions) {
    await SyncSpeakers(session.speakers, config)
  }

  // 2) Build the new set, then 3) hand it to the store for an atomic swap.
  const storeData = sessions.map((s: any) => pretalxToStoreData(s, eventId))

  // Loud collision check: ids are slugified titles, so a talk in this event
  // named like another event's talk produces the SAME id and shadows it in
  // every bare-id lookup (test clones of devcon-7 talks 404'd the archive,
  // 2026-08-21). The sync proceeds — consumers can disambiguate with
  // ?event= — but this must never happen silently again.
  const collisions = store.getCrossEventCollisions(eventId, storeData.map((s: any) => s.id))
  for (const c of collisions) {
    console.warn(`[collision] session id '${c.id}' in ${eventId} also exists in ${c.otherEventId} — rename one (bare-id lookups will shadow)`)
  }

  const count = store.replaceEventSessions(eventId, storeData)
  console.log(`Swapped in ${count} sessions for ${eventId} (zero-downtime)`)

  // Bump the event version ONLY when the synced data differs from the last
  // sync in this process. First sync after boot always bumps (no snapshot).
  const snapshot = JSON.stringify([...storeData].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))))
  if (lastSyncSnapshot.get(eventId) === snapshot) {
    console.log('Synced data identical to previous sync — version not bumped')
  } else {
    lastSyncSnapshot.set(eventId, snapshot)
    const version = Date.now().toString()
    console.log('Updating event version...', version)
    store.updateEventVersion(eventId, version)
  }

  // Expose which Pretalx release the served data corresponds to (e.g. "0.31")
  // on GET /events/:id. Updated even when the data is identical — a no-op
  // re-release must still be verifiable against the API.
  const publishedVersion = await getPublishedScheduleVersion(config)
  if (publishedVersion) {
    store.updateEventScheduleVersion(eventId, publishedVersion)
    console.log('Serving Pretalx schedule version:', publishedVersion)
  }

  const workflows = WORKFLOW_MAP[eventId]
  if (workflows) {
    for (const workflowId of workflows) {
      console.log(`Triggering Github action ${workflowId}...`)
      await TriggerWorkflow(workflowId)
    }
  }
}

export async function UpdateNocoDb(req: Request, res: Response) {
  // #swagger.ignore = true

  const secret = req.header('X-Webhook-Secret') || req.headers['x-webhook-secret']
  if (secret !== SERVER_CONFIG.NOCODB_WEBHOOK_SECRET) {
    console.log('[nocodb webhook] 403', {
      headerPresent: !!secret,
      headerLen: secret ? String(secret).length : 0,
      expectedConfigured: !!SERVER_CONFIG.NOCODB_WEBHOOK_SECRET,
      expectedLen: SERVER_CONFIG.NOCODB_WEBHOOK_SECRET ? SERVER_CONFIG.NOCODB_WEBHOOK_SECRET.length : 0,
    })
    return res.status(403).send('Forbidden')
  }

  const tableId = req.params.tableId || (req.body?.data?.table_id as string | undefined) || (req.body?.table_id as string | undefined)
  if (!tableId) return res.status(400).send('Missing table id')

  const tableName = SERVER_CONFIG.NOCODB_TABLES[tableId]
  if (!tableName) {
    console.error(`NocoDB webhook for unmapped tableId: ${tableId}`)
    return res.status(400).send('Unmapped table id')
  }

  scheduleNocoDbSync(tableId, tableName)
  return res.status(202).json({ scheduled: true, tableId, debounceMs: NOCODB_SYNC_DEBOUNCE_MS })
}

// Debounce: bursty edits in NocoDB (e.g. fixing several FAQ rows in a row) would
// otherwise produce one commit + one translate-workflow run per webhook. We coalesce
// per-table edits within this window into a single fetch + commit.
const NOCODB_SYNC_DEBOUNCE_MS = 30_000
const pendingNocoDbSync = new Map<string, NodeJS.Timeout>()

function scheduleNocoDbSync(tableId: string, tableName: string) {
  const existing = pendingNocoDbSync.get(tableId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(async () => {
    pendingNocoDbSync.delete(tableId)
    try {
      const result = await SyncNocoDbTable(tableId, tableName)
      console.log('[nocodb sync] completed', result)
    } catch (err) {
      console.error('[nocodb sync] failed', err)
    }
  }, NOCODB_SYNC_DEBOUNCE_MS)

  // Don't keep the Node process alive on shutdown waiting for a debounced sync.
  if (typeof timer.unref === 'function') timer.unref()
  pendingNocoDbSync.set(tableId, timer)
}

export async function SyncNocoDbTable(tableId: string, tableName: string) {
  console.log(`Syncing NocoDB table ${tableId} → ${tableName}.json`)
  const rows = await FetchNocoDbTable(tableId)

  const filePath = `devcon/content/en/external/nocodb/${tableName}.json`
  const content = JSON.stringify(rows, null, 2) + '\n'

  const result = await CommitContentFile(filePath, content, `[action] sync nocodb ${tableName} (${rows.length} rows)`)

  return { table: tableName, rows: rows.length, changed: result.changed }
}

async function SyncSpeakers(speakers: any[], config: PretalxInstanceConfig) {
  console.log('Syncing speakers', speakers.length)
  // Session payloads carry SLUGIFIED speaker ids (mapSession without
  // inclContacts), but Pretalx's /speakers/:id endpoint only resolves speaker
  // CODES — so fetching an unknown speaker by slug 404s. That 404 used to
  // throw out of the whole sync: one new speaker on one talk and the release
  // never reached memory OR dispatched the git workflow (bit test-devcon-8
  // on 2026-08-21 via a new "James" speaker; would hit devcon8 identically).
  // Resolve store-misses against the bulk speaker list instead (one cached
  // fetch per sync — the sync already cleared the client cache), and never
  // let a single unresolvable speaker kill the sync.
  let bulkBySlug: Map<string, any> | null = null
  for (const speaker of speakers) {
    const id = speaker?.sourceId ?? speaker
    try {
      if (store.findSpeaker(id)) continue

      if (!bulkBySlug) {
        const all = await GetSpeakers({}, config)
        bulkBySlug = new Map(all.map((s: any) => [s.id, s]))
        console.log(`Fetched ${all.length} speakers from Pretalx for slug resolution`)
      }
      const speakerData = bulkBySlug.get(id)
      if (!speakerData) {
        console.warn(`Speaker ${id} not found in Pretalx speaker list — skipping`)
        continue
      }
      console.log('Creating speaker', speakerData.id)
      // Mirror the pretalx-hosted upload into the speaker-avatars bucket so
      // clients never fetch image bytes from the live Pretalx box; fails open
      // to the source URL (see services/avatar-mirror).
      speakerData.avatar = await resolveSpeakerAvatar(speakerData.avatar)
      // Per-event flag — lives on the event record, never on the shared
      // speaker file (see sync-pretalx.ts).
      delete speakerData.featured
      store.createSpeaker(speakerData)
    } catch (error) {
      console.error(`Speaker sync failed for ${id} — continuing:`, error)
    }
  }
}
