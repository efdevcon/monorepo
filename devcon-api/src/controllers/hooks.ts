import { Request, Response, Router } from 'express'
import { PretalxScheduleUpdate } from '@/types/schemas'
import { SERVER_CONFIG } from '@/utils/config'
import { TriggerWorkflow } from '@/services/github'
import { GetSession, GetSpeaker } from '@/clients/pretalx'
import { PrismaClient } from '@prisma/client'
import { pretalxToSessionData } from '@/types/schedule'

const client = new PrismaClient()

export const hooksRouter = Router()
hooksRouter.post(`/hooks/pretalx/schedule`, UpdateSchedule)

export async function UpdateSchedule(req: Request, res: Response) {
  // #swagger.tags = ['Hooks']

  const secret = req.header('X-Webhook-Secret') || req.headers['x-webhook-secret']
  if (secret !== SERVER_CONFIG.WEBHOOK_SECRET) return res.status(403).send('Forbidden')

  try {
    const data = PretalxScheduleUpdate.parse(req.body)

    console.log('Pretalx Webhook plugin', data.event, data.user, data.schedule)
    console.log('Changes', data.changes)

    await SyncPretalx(data.changes.new_talks, data.changes.canceled_talks, data.changes.moved_talks)

    res.status(204).send()
  } catch (error) {
    console.error('Error parsing Pretalx Webhook plugin', error)
    res.status(400).send('Bad Request')
  }
}

async function SyncPretalx(newTalks: string[], canceledTalks: string[], movedTalks: string[]) {
  console.log('Syncing Pretalx...')

  for (const id of newTalks) {
    try {
      const session = await GetSession(id, { inclContacts: true })
      if (!session) {
        console.error(`Session ${id} not found`)
        continue
      }

      await SyncSpeakers(session.speakers)

      console.log('Creating session', id)
      await client.session.create({
        data: pretalxToSessionData(session),
      })
    } catch (error) {
      console.error(`Error creating session ${id}`, error)
    }
  }

  for (const id of canceledTalks) {
    try {
      const data = await client.session.findFirst({
        where: {
          OR: [{ id: id }, { sourceId: id }],
        },
      })
      if (!data) {
        console.error(`Session ${id} not found. Skip deleting...`)
        continue
      }

      console.log('Deleting session', data.id)
      await client.session.delete({
        where: { id: data.id },
      })
    } catch (error) {
      console.error(`Error deleting session ${id}`, error)
    }
  }

  for (const id of movedTalks) {
    try {
      const session = await GetSession(id)
      if (!session) {
        console.error(`Session ${id} not found on Pretalx. Skip updating...`)
        continue
      }

      await SyncSpeakers(session.speakers)

      const data = await client.session.findFirst({
        where: {
          OR: [{ id: id }, { sourceId: id }],
        },
      })
      if (!data) {
        console.error(`Session ${id} not found on DB. Skip updating...`)
        continue
      }

      await client.session.update({
        where: { id: data.id },
        data: pretalxToSessionData(session),
      })
    } catch (error) {
      console.error(`Error updating session ${id}`, error)
    }
  }

  const version = Date.now().toString()
  console.log('Updating event version...', version)
  await client.event.update({
    where: { id: 'devcon-7' },
    data: {
      version,
    },
  })

  console.log('Triggering Github action to sync all systems...')
  await TriggerWorkflow('sync-pretalx.yml')
}

async function SyncSpeakers(speakers: any[]) {
  console.log('Syncing speakers', speakers.length)
  for (const speaker of speakers) {
    console.log('Speaker', speaker?.sourceId ?? speaker)
    let id = speaker?.sourceId ?? speaker
    let speakerData = await client.speaker.findFirst({
      where: {
        OR: [{ id: id }, { sourceId: id }],
      },
    })

    if (!speakerData) {
      speakerData = await GetSpeaker(id)
      if (!speakerData) {
        console.error(`Speaker ${id} not found`)
        continue
      }

      console.log('Creating speaker', speakerData.id)
      await client.speaker.create({
        data: speakerData,
      })
    }
  }
}
