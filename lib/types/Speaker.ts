import { Session } from './Session'

export interface Speaker {
  id: string
  sourceId: string
  name: string
  role?: string
  company?: string
  website?: string
  twitter?: string
  lens?: string
  farcaster?: string
  github?: string
  avatar?: string
  description?: string
  tracks?: string[]
  eventDays?: number[]
  sessions?: Session[]
}
