import { PrismaClient } from '@prisma/client'
import { GetData, GetSpeakerData } from 'clients/filesystem'
import dayjs from 'dayjs'

const client = new PrismaClient()

async function main() {
  console.log('Seed local data sources into Sqlite..')

  // Rooms
  const rooms = GetData('rooms')
  console.log(`- Add ${rooms.length} rooms`)
  for (const item of rooms) {
    await client.room.create({ data: item })
  }

  // Events
  const events = GetData('events')
  console.log(`- Add ${events.length} events`)
  for (const item of events) {
    await client.event.create({
      data: {
        ...item,
        rooms: {
          connect: item.rooms.map((i: string) => ({ id: i })),
        },
      },
    })
  }

  // Speakers
  const speakers = GetSpeakerData()
  console.log(`- Add ${speakers.length} speakers`)
  for (const item of speakers) {
    await client.speaker.create({ data: item })
  }

  // Sessions
  const sessions = GetData('sessions')
  console.log(`- Add ${sessions.length} sessions`)
  for (const item of sessions) {
    const eventId = item.eventId
    delete item.eventId
    const roomId = item.slot_roomId
    delete item.slot_roomId

    let data: any = {
      ...item,
      tags: item.tags.join(','),
      slot_start: item.slot_start ? dayjs(item.slot_start).toISOString() : null,
      slot_end: item.slot_end ? dayjs(item.slot_end).toISOString() : null,
      event: {
        connect: { id: eventId },
      },
      speakers: {
        connect: item.speakers.map((i: any) => ({ id: i })),
      },
    }

    if (roomId) {
      data.slot_room = {
        connect: { id: roomId },
      }
    }

    try {
      await client.session.create({
        data: data,
      })
    } catch (e) {
      console.log('Unable to add item', item.id)
      console.error(e)
    }
  }
}

main()
  .then(async () => {
    await client.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await client.$disconnect()
    process.exit(1)
  })
