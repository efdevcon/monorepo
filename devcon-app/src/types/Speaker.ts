import { Session } from "./Session"

export interface Speaker {
  id: string,
  name: string,
  role?: string,
  company?: string
  website?: string
  twitter?: string
  github?: string
  avatar?: string
  description?: string
  tracks?: string[]
  eventDays?: number[]
  sessions?: Session[]
}
