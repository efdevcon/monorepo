import { Room } from './Room'
import { Speaker } from './Speaker'
import { Moment } from 'moment'

export interface Session {
  id: string
  sourceId: string
  speakers: Speaker[]
  title: string
  slot_roomId?: string
  track: string
  duration: number
  featured: boolean
  slot_start: number
  slot_end: number
  start: number
  end: number
  startTime: string
  endTime: string
  startTimeAsMoment?: Moment
  endTimeAsMoment?: Moment
  day?: string
  date?: string
  dayOfWeek?: string
  room?: Room
  type?: string
  description?: string
  abstract?: string
  expertise?: string
  image?: string
  resources?: string[]
  tags?: string
}
