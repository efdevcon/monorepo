import { Role, Tag, Track } from '@/utils/profile'

declare module 'express-session' {
  interface SessionData {
    userId: string
    tokenId: string
  }
}

// simplified interface of a ticket POD
export interface TicketPod {
  entries: Record<string, any>
  signature: string
  signerPublicKey: string
}

export interface UserAccount {
  id: string
  username?: string
  email?: string
  activeAddress?: string
  addresses: Array<string>
  disabled: boolean
  pushSubscription: any
  role?: Role
  yearsOfExperience?: number
  tracks: Track[]
  tags: Tag[]
  speakers: Array<string>
  sessions: Array<{
    id: string
    level: 'interested' | 'attending'
    start: Date
    end: Date
  }>
  publicSchedule?: boolean
  notifications?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AccountProfileData {
  since: number
  roles: string[]
  tracks: string[]
  tags?: string[]
  reason: string
}
