import { Request, Response, Router } from 'express'
import { PretalxScheduleUpdate } from '@/types/schemas'
import { SERVER_CONFIG, getPretalxConfig, getEventIdByPretalxSlug, PretalxInstanceConfig } from '@/utils/config'
import { TriggerWorkflow, CommitContentFile } from '@/services/github'
import { GetSession, GetSpeaker } from '@/clients/pretalx'
import { FetchNocoDbTable } from '@/clients/nocodb'
import * as store from '@/data/store'
import dayjs from 'dayjs'

const WORKFLOW_MAP: Record<string, string[]> = {
  'devcon-7': ['sync-pretalx.yml'],
  'devcon-mumbai-playground': ['sync-pretalx-devcon-mumbai-playground.yml', 'run-of-show-devcon-mumbai-playground.yml'],
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
    console.log('Changes', data.changes)

    await SyncPretalx(config, data.changes.new_talks, data.changes.canceled_talks, data.changes.moved_talks)

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

async function SyncPretalx(config: PretalxInstanceConfig, newTalks: string[], canceledTalks: string[], movedTalks: string[]) {
  const { eventId } = config
  console.log(`Syncing Pretalx for ${eventId}...`)

  for (const id of newTalks) {
    try {
      const session = await GetSession(id, { inclContacts: true }, config)
      if (!session) {
        console.error(`Session ${id} not found`)
        continue
      }

      await SyncSpeakers(session.speakers, config)

      console.log('Creating session', id)
      store.createSession(pretalxToStoreData(session, eventId))
    } catch (error) {
      console.error(`Error creating session ${id}`, error)
    }
  }

  for (const id of canceledTalks) {
    try {
      const data = store.getSession(id)
      if (!data) {
        console.error(`Session ${id} not found. Skip deleting...`)
        continue
      }

      console.log('Deleting session', data.id)
      store.deleteSession(data.id)
    } catch (error) {
      console.error(`Error deleting session ${id}`, error)
    }
  }

  for (const id of movedTalks) {
    try {
      const session = await GetSession(id, {}, config)
      if (!session) {
        console.error(`Session ${id} not found on Pretalx. Skip updating...`)
        continue
      }

      await SyncSpeakers(session.speakers, config)

      const data = store.getSession(id)
      if (!data) {
        console.error(`Session ${id} not found in store. Skip updating...`)
        continue
      }

      store.updateSession(data.id, pretalxToStoreData(session, eventId))
    } catch (error) {
      console.error(`Error updating session ${id}`, error)
    }
  }

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
