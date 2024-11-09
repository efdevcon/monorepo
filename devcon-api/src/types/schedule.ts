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
    slot_start: item.slot_start ? dayjs(item.slot_start).toISOString() : null,
    slot_end: item.slot_end ? dayjs(item.slot_end).toISOString() : null,
    event: {
      connect: { id: 'devcon-7' },
    },
    speakers: {
      connect: item.speakers.map((i: any) => ({ id: i.id ?? i })),
    },
  }

  if (item.slot_roomId) {
    data.slot_room = {
      connect: { id: data.slot_roomId },
    }
  }

  return data
}
