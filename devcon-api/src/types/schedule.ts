import { defaultSlugify } from '@/utils/content'
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
  slot_start: number
  slot_end: number
}

export function pretalxToSessionData(item: any) {
  let data: any = {
    ...item,
    tags: item.tags?.join(',') || '',
    keywords: item.keywords?.join(',') || '',
    event: {
      connect: { id: 'devcon-7' },
    },
    speakers: {
      connect: item.speakers.map((i: any) => ({ id: i.id ?? i })),
    },
  }

  if (item.slot) {
    data.slot_start = dayjs.utc(item.slot.start).valueOf()
    data.slot_end = dayjs.utc(item.slot.end).valueOf()
    data.slot_roomId = item.slot?.room ? defaultSlugify(item.slot.room.en) : null
    data.slot_room = {
      connect: { id: data.slot_roomId },
    }
  }

  return data
}
