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
  doNotRecord?: boolean
  slot_start: number
  slot_end: number
  slot_room?: Room
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
  sources_ipfsHash?: string
  sources_swarmHash?: string
  sources_youtubeId?: string
  sources_livepeerId?: string
  sources_streamethId?: string
  transcript_text?: string
  resources_slides?: string
}
