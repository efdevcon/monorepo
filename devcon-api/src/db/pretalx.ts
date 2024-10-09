import { PrismaClient } from '@prisma/client'
import { GetRooms, GetSessions, GetSpeakers, GetSubmissions } from '@/clients/pretalx'
import { PRETALX_CONFIG } from '@/utils/config'

const client = new PrismaClient()

export async function seedPretalx() {
  console.log('Seeding Pretalx Event Schedule into Sqlite..')

  // Rooms
  console.log('Fetching Rooms..')
  const rooms = await GetRooms()
  for (const item of rooms) {
    await client.room.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }
  console.log('Rooms imported', rooms.length)

  // Update Event
  console.log('Update Event with Rooms..')
  const event = await client.event.findFirst({ where: { id: PRETALX_CONFIG.PRETALX_EVENT_NAME } })
  if (event) {
    await client.event.update({
      where: { id: PRETALX_CONFIG.PRETALX_EVENT_NAME },
      data: {
        rooms: {
          connect: rooms.map((i: any) => ({ id: i.id })),
        },
      },
    })

    console.log('Rooms added to event', PRETALX_CONFIG.PRETALX_EVENT_NAME)
  }

  // Speakers
  console.log('Fetching Speakers..')
  const speakers = await GetSpeakers()
  console.log('Speakers found', speakers.length)
  const acceptedSpeakers = []

  // Sessions
  console.log('Fetching Sessions..')
  const submissions = await GetSubmissions()
  const submissionsToAdd = []
  for (const item of submissions) {
    const eventId = item.eventId
    delete item.eventId
    const slot_roomId = item.slot_roomId
    delete item.slot_roomId

    const sessionSpeakers = speakers.filter((i: any) => item.speakers.includes(i.sourceId))
    acceptedSpeakers.push(...sessionSpeakers)

    let data: any = {
      ...item,
      featured: item.featured ?? false,
      doNotRecord: item.doNotRecord ?? false,
      tags: item.tags.join(','),
      keywords: item.keywords.join(','),
      event: {
        connect: { id: eventId },
      },
      speakers: {
        connect: sessionSpeakers.map((i: any) => ({ id: i.id })),
      },
    }

    if (slot_roomId) {
      data.slot_room = {
        connect: { id: slot_roomId },
      }
    }

    submissionsToAdd.push(data)
  }

  // Speakers
  console.log('Importing Speakers..')
  for (const item of acceptedSpeakers) {
    await client.speaker.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }
  console.log('Accepted Speakers imported', acceptedSpeakers.length)

  for (const item of submissionsToAdd) {
    try {
      await client.session.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      })
    } catch (e) {
      console.log('Unable to add session', item.id)
      console.error(e)
    }
  }
  console.log('Sessions imported', submissionsToAdd.length)
}
