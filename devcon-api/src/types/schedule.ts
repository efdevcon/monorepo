import dayjs from 'dayjs'

export interface Session {
  id: string
  sourceId: string
  title: string
  track: string
  featured: boolean
  speakers: string[]
  tags: string[]
  expertise: string
  audience: string
  similarity?: number
}

export function pretalxToSessionData(item: any) {
  const eventId = item.eventId
  delete item.eventId
  const roomId = item.slot_roomId
  delete item.slot_roomId

  let data: any = {
    ...item,
    tags: item.tags?.join(',') || '',
    keywords: item.keywords?.join(',') || '',
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

  return data
}
