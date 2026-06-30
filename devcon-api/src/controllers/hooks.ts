import { Request, Response, Router } from 'express'
import { PretalxScheduleUpdate } from '@/types/schemas'
import { SERVER_CONFIG, getPretalxConfig, getEventIdByPretalxSlug, PretalxInstanceConfig } from '@/utils/config'
import { TriggerWorkflow, CommitContentFile } from '@/services/github'
import { GetSessions, GetSpeaker } from '@/clients/pretalx'
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

export async function UpdateSchedule(req: Request, res: Response) {
  // #swagger.ignore = true

  const secret = req.header('X-Webhook-Secret') || req.headers['x-webhook-secret']
  if (secret !== SERVER_CONFIG.WEBHOOK_SECRET) return res.status(403).send('Forbidden')

  try {
    const data = PretalxScheduleUpdate.parse(req.body)

    // Resolve eventId from route param, or from pretalx event slug in payload
    const eventId = req.params.eventId || getEventIdByPretalxSlug(data.event) || 'devcon-7'
    const config = getPretalxConfig(eventId)

    console.log('Pretalx Webhook plugin', data.event, data.user, data.schedule, `(eventId: ${eventId})`)
    // Logged for visibility only. We no longer act on these deltas: Pretalx
    // omits edits to existing talks (only add/cancel/move), so a delta-only
    // update silently misses content edits. We full-resync instead.
    console.log('Changes', data.changes)

    await SyncPretalx(config)

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

async function SyncPretalx(config: PretalxInstanceConfig) {
  const { eventId } = config
  console.log(`Full re-sync of Pretalx sessions for ${eventId}...`)

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
  const count = store.replaceEventSessions(eventId, storeData)
  console.log(`Swapped in ${count} sessions for ${eventId} (zero-downtime)`)

  const version = Date.now().toString()
  console.log('Updating event version...', version)
  store.updateEventVersion(eventId, version)

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
  for (const speaker of speakers) {
    console.log('Speaker', speaker?.sourceId ?? speaker)
    let id = speaker?.sourceId ?? speaker
    let speakerData = store.findSpeaker(id)

    if (speakerData) {
      console.log('Speaker already exists', speakerData.id)
      continue
    }

    speakerData = await GetSpeaker(id, {}, config)
    if (!speakerData) {
      console.error(`Speaker ${id} not found`)
      continue
    }

    console.log('Creating speaker', speakerData.id)
    store.createSpeaker(speakerData)
  }
}
