import { PrismaClient } from '@prisma/client'
import { GetRooms, GetSessions, GetSpeakers } from 'clients/pretalx'
import { PRETALX_CONFIG } from 'utils/config'

const client = new PrismaClient()

async function main() {
  console.log('Seeding Pretalx Event Schedule into Sqlite..')

  // Rooms
  console.log('Importing Rooms..')
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
  console.log('Importing Speakers..')
  const speakers = await GetSpeakers()
  for (const item of speakers) {
    await client.speaker.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }
  console.log('Speakers imported', speakers.length)

  // Sessions
  const sessions = await GetSessions()
  for (const item of sessions) {
    const slot_roomId = item.slot_roomId
    delete item.slot_roomId

    const sessionSpeakers = speakers.filter((i: any) => item.speakers.includes(i.sourceId))
    let data: any = {
      ...item,
      tags: item.tags.join(','),
      event: {
        connect: { id: PRETALX_CONFIG.PRETALX_EVENT_NAME },
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

    await client.session.upsert({
      where: { id: item.id },
      update: data,
      create: data,
    })
  }
  console.log('Sessions imported', sessions.length)
}

main()
  .then(async () => {
    console.log('All done!')
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
